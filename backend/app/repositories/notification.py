import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.task import Task


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_user(
        self,
        user_id: uuid.UUID,
        *,
        unread_only: bool = False,
        limit: int = 50,
    ) -> list[Notification]:
        stmt = select(Notification).where(
            Notification.user_id == user_id
        )

        if unread_only:
            stmt = stmt.where(
                Notification.is_read.is_(False)
            )

        stmt = (
            stmt
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )

        return list(self.db.scalars(stmt).all())

    def get(
        self,
        notification_id: uuid.UUID,
    ) -> Notification | None:
        stmt = select(Notification).where(
            Notification.id == notification_id
        )

        return self.db.scalar(stmt)

    def count_unread(
        self,
        user_id: uuid.UUID,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )

        return self.db.scalar(stmt) or 0

    def create(
        self,
        *,
        user_id: uuid.UUID,
        type: str,
        title: str,
        message: str,
        task_id: uuid.UUID | None = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            task_id=task_id,
            is_read=False,
            created_at=datetime.now(UTC),
        )

        self.db.add(notification)
        self.db.flush()

        return notification

    def exists_for_task(
        self,
        *,
        user_id: uuid.UUID,
        task_id: uuid.UUID,
        type: str,
    ) -> bool:
        """
        Kiểm tra đã có thông báo cùng loại cho task này chưa.

        Dùng để mỗi task chỉ sinh một thông báo deadline duy nhất,
        thay vì sinh lại sau mỗi lần frontend polling 30 giây.
        """

        stmt = (
            select(Notification.id)
            .where(
                Notification.user_id == user_id,
                Notification.task_id == task_id,
                Notification.type == type,
            )
            .limit(1)
        )

        return self.db.scalar(stmt) is not None

    def mark_read(
        self,
        notification: Notification,
    ) -> Notification:
        notification.is_read = True

        self.db.flush()

        return notification

    def mark_all_read(
        self,
        user_id: uuid.UUID,
    ) -> int:
        """
        Đánh dấu toàn bộ thông báo chưa đọc của user là đã đọc.

        Trả về số bản ghi thực sự được cập nhật.
        """

        stmt = (
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .values(is_read=True)
            .execution_options(synchronize_session=False)
        )

        result = self.db.execute(stmt)

        self.db.flush()

        return result.rowcount or 0

    def list_tasks_due_between(
        self,
        *,
        assignee_id: uuid.UUID,
        start: datetime,
        end: datetime,
    ) -> list[Task]:
        """
        Task đang được giao cho user, chưa DONE và có deadline
        nằm trong khoảng [start, end).
        """

        stmt = select(Task).where(
            Task.assignee_id == assignee_id,
            Task.status != "DONE",
            Task.due_date.is_not(None),
            Task.due_date >= start,
            Task.due_date < end,
        )

        return list(self.db.scalars(stmt).all())
