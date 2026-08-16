import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.models.notification import Notification, NotificationType
from app.models.task import Task
from app.models.user import User
from app.repositories.notification import NotificationRepository


# Ngưỡng "sắp đến hạn" theo US-18.
DUE_SOON_WINDOW = timedelta(hours=24)

# Số thông báo tối đa trả về cho một lần polling.
DEFAULT_LIMIT = 50

MAX_LIMIT = 200


class NotificationService:
    """
    Sinh và đọc thông báo trong ứng dụng (US-18).

    Có hai nhóm phương thức, khác nhau ở chỗ ai gọi commit:

    - Nhóm sinh thông báo (notify_*) được gọi từ TaskService và
      CommentService ngay trước khi các service đó commit. Chúng chỉ
      add + flush để thông báo nằm chung transaction với hành động
      gốc: task không lưu được thì cũng không có thông báo mồ côi.

    - Nhóm đọc (list_for_user, mark_read, mark_all_read) là điểm vào
      của API nên tự commit.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepository(db)

    # ------------------------------------------------------------------
    # Sinh thông báo — gọi từ service khác, không commit.
    # ------------------------------------------------------------------

    def notify_task_assigned(
        self,
        task: Task,
        assignee_id: uuid.UUID | None,
        actor: User,
    ) -> Notification | None:
        """
        Thông báo cho người vừa được giao task.

        Không gửi khi người dùng tự gán task cho chính mình,
        vì họ đã biết rồi.
        """

        if assignee_id is None or assignee_id == actor.id:
            return None

        return self.repo.create(
            user_id=assignee_id,
            type=NotificationType.TASK_ASSIGNED.value,
            title="Bạn được giao task mới",
            message=(
                f"{actor.full_name} đã giao cho bạn task "
                f"\"{task.title}\"."
            ),
            task_id=task.id,
        )

    def notify_new_comment(
        self,
        task: Task,
        actor: User,
        content: str,
    ) -> Notification | None:
        """
        Thông báo cho người phụ trách task khi có comment mới.

        Không gửi khi chính người phụ trách là người comment.
        """

        if (
            task.assignee_id is None
            or task.assignee_id == actor.id
        ):
            return None

        return self.repo.create(
            user_id=task.assignee_id,
            type=NotificationType.TASK_COMMENT.value,
            title="Bình luận mới trên task của bạn",
            message=(
                f"{actor.full_name} đã bình luận trên task "
                f"\"{task.title}\": {_shorten(content)}"
            ),
            task_id=task.id,
        )

    # ------------------------------------------------------------------
    # Đọc thông báo — điểm vào của API, tự commit.
    # ------------------------------------------------------------------

    def list_for_user(
        self,
        actor: User,
        *,
        unread_only: bool = False,
        limit: int = DEFAULT_LIMIT,
    ) -> list[Notification]:
        """
        Danh sách thông báo của user, mới nhất trước.
        """

        limit = max(1, min(limit, MAX_LIMIT))

        self.sync_due_notifications(actor)

        return self.repo.list_by_user(
            actor.id,
            unread_only=unread_only,
            limit=limit,
        )

    def count_unread(
        self,
        actor: User,
    ) -> int:
        self.sync_due_notifications(actor)

        return self.repo.count_unread(actor.id)

    def mark_read(
        self,
        notification_id: uuid.UUID,
        actor: User,
    ) -> Notification:
        """
        Đánh dấu một thông báo là đã đọc.

        Thông báo của người khác trả về 404 chứ không phải 403:
        user không có quyền biết thông báo đó có tồn tại hay không.
        """

        notification = self.repo.get(notification_id)

        if (
            notification is None
            or notification.user_id != actor.id
        ):
            raise api_error(
                404,
                "NOTIFICATION_NOT_FOUND",
                "Không tìm thấy thông báo.",
            )

        if not notification.is_read:
            self.repo.mark_read(notification)
            self.db.commit()
            self.db.refresh(notification)

        return notification

    def mark_all_read(
        self,
        actor: User,
    ) -> int:
        marked = self.repo.mark_all_read(actor.id)

        self.db.commit()

        return marked

    # ------------------------------------------------------------------
    # Thông báo deadline
    # ------------------------------------------------------------------

    def sync_due_notifications(
        self,
        actor: User,
    ) -> int:
        """
        Sinh thông báo deadline cho các task của user.

        Dự án không có scheduler (Celery/cron) nên thông báo deadline
        được sinh ngay trong request đọc danh sách — frontend polling
        30 giây đóng vai trò nhịp chạy. Chỉ quét task của đúng user
        đang gọi API nên chi phí không đáng kể.

        exists_for_task đảm bảo mỗi task chỉ sinh một thông báo cho
        mỗi loại, kể cả khi polling gọi lại liên tục.
        """

        now = datetime.now(timezone.utc)

        created = 0

        # Sắp đến hạn: deadline nằm trong 24 giờ tới.
        due_soon_tasks = self.repo.list_tasks_due_between(
            assignee_id=actor.id,
            start=now,
            end=now + DUE_SOON_WINDOW,
        )

        for task in due_soon_tasks:
            if self.repo.exists_for_task(
                user_id=actor.id,
                task_id=task.id,
                type=NotificationType.TASK_DUE_SOON.value,
            ):
                continue

            self.repo.create(
                user_id=actor.id,
                type=NotificationType.TASK_DUE_SOON.value,
                title="Task sắp đến hạn",
                message=(
                    f"Task \"{task.title}\" đến hạn trong "
                    f"vòng 24 giờ tới."
                ),
                task_id=task.id,
            )

            created += 1

        # Quá hạn: mức leo thang của thông báo trên.
        # datetime.min làm mốc dưới để lấy mọi task đã qua deadline.
        overdue_tasks = self.repo.list_tasks_due_between(
            assignee_id=actor.id,
            start=datetime.min.replace(tzinfo=timezone.utc),
            end=now,
        )

        for task in overdue_tasks:
            if self.repo.exists_for_task(
                user_id=actor.id,
                task_id=task.id,
                type=NotificationType.TASK_OVERDUE.value,
            ):
                continue

            self.repo.create(
                user_id=actor.id,
                type=NotificationType.TASK_OVERDUE.value,
                title="Task đã quá hạn",
                message=(
                    f"Task \"{task.title}\" đã quá hạn."
                ),
                task_id=task.id,
            )

            created += 1

        if created:
            self.db.commit()

        return created


def _shorten(
    content: str,
    limit: int = 120,
) -> str:
    """
    Rút gọn nội dung comment để message không quá dài.
    """

    content = " ".join(content.split())

    if len(content) <= limit:
        return content

    return content[: limit - 1].rstrip() + "…"
