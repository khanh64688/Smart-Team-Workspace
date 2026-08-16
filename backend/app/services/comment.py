import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.models.comment import Comment
from app.models.user import User, UserRole
from app.repositories.comment import CommentRepository
from app.repositories.task import TaskRepository
from app.schemas.comment import CommentCreate, CommentUpdate
from app.services.notification import NotificationService
from app.services.project import ProjectService


COMMENT_EDIT_LIMIT = timedelta(minutes=15)


class CommentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CommentRepository(db)
        self.task_repo = TaskRepository(db)
        self.project_service = ProjectService(db)
        self.notification_service = NotificationService(db)

    def get_comments(
        self,
        task_id: uuid.UUID,
        actor: User,
    ) -> list[Comment]:
        """
        Lấy danh sách comment của task.
        Permission:
        - ADMIN: được xem.
        - PM: phải là thành viên project.
        - MEMBER: phải là thành viên project.
        """

        task = self._require_task(task_id)

        # ADMIN được bypass membership.
        # PM/MEMBER phải là member của project.
        self.project_service.require_member(
            task.project_id,
            actor,
        )

        return self.repo.get_by_task(task_id)

    def create(
        self,
        task_id: uuid.UUID,
        payload: CommentCreate,
        actor: User,
    ) -> Comment:
        """
        Tạo comment cho task.

        Permission:
        - ADMIN: được viết.
        - PM: phải là thành viên project.
        - MEMBER: phải là thành viên project.

        author_id luôn lấy từ current user,
        không lấy từ request body.
        """

        task = self._require_task(task_id)

        self.project_service.require_member(
            task.project_id,
            actor,
        )

        content = payload.content.strip()

        if not content:
            raise api_error(
                400,
                "COMMENT_CONTENT_EMPTY",
                "Nội dung comment không được để trống.",
            )

        comment = self.repo.create(
            task_id=task_id,
            author_id=actor.id,
            content=content,
        )

        # Báo cho người phụ trách task, trừ khi chính họ vừa comment.
        self.notification_service.notify_new_comment(
            task,
            actor,
            content,
        )

        self.db.commit()
        self.db.refresh(comment)

        return comment

    def update(
        self,
        comment_id: uuid.UUID,
        payload: CommentUpdate,
        actor: User,
    ) -> Comment:
        """
        Sửa comment.

        Permission:
        - ADMIN: được sửa comment.
        - PM/MEMBER:
            + phải là thành viên project
            + phải là tác giả
            + chỉ được sửa trong 15 phút.
        """

        comment = self._require_comment(comment_id)

        task = self._require_task(comment.task_id)

        if actor.role == UserRole.ADMIN:
            pass

        else:
            # Phải là thành viên project.
            self.project_service.require_member(
                task.project_id,
                actor,
            )

            # Chỉ tác giả mới được sửa.
            if comment.author_id != actor.id:
                raise api_error(
                    403,
                    "COMMENT_AUTHOR_REQUIRED",
                    "Bạn chỉ có thể sửa comment của chính mình.",
                )

            # Chỉ được sửa trong vòng 15 phút.
            self._check_edit_window(comment)

        content = payload.content.strip()

        if not content:
            raise api_error(
                400,
                "COMMENT_CONTENT_EMPTY",
                "Nội dung comment không được để trống.",
            )

        self.repo.update(
            comment,
            content=content,
        )

        self.db.commit()
        self.db.refresh(comment)

        return comment

    def delete(
        self,
        comment_id: uuid.UUID,
        actor: User,
    ) -> None:
        """
        Xóa comment.

        Permission:
        - ADMIN: xóa được bất kỳ comment nào.
        - Tác giả: xóa comment của chính mình.
        - OWNER/MANAGER: xóa comment của người khác.
        - MEMBER/PM không phải tác giả và không phải manager:
          không được xóa.
        """

        comment = self._require_comment(comment_id)

        task = self._require_task(comment.task_id)

        if actor.role == UserRole.ADMIN:
            self.repo.delete(comment)
            self.db.commit()
            return

        if comment.author_id == actor.id:
            self.project_service.require_member(
                task.project_id,
                actor,
            )

            self.repo.delete(comment)
            self.db.commit()
            return

        self.project_service.require_manager(
            task.project_id,
            actor,
        )

        self.repo.delete(comment)
        self.db.commit()

    def _require_task(self, task_id: uuid.UUID):
        """
        Lấy task hoặc trả về 404.
        """

        task = self.task_repo.get(task_id)

        if not task:
            raise api_error(
                404,
                "TASK_NOT_FOUND",
                "Không tìm thấy task.",
            )

        return task

    def _require_comment(
        self,
        comment_id: uuid.UUID,
    ) -> Comment:
        """
        Lấy comment hoặc trả về 404.
        """

        comment = self.repo.get(comment_id)

        if not comment:
            raise api_error(
                404,
                "COMMENT_NOT_FOUND",
                "Không tìm thấy comment.",
            )

        return comment

    def _check_edit_window(
        self,
        comment: Comment,
    ) -> None:
        """
        Kiểm tra comment còn nằm trong thời gian
        15 phút được phép chỉnh sửa hay không.
        """

        now = datetime.now(timezone.utc)

        created_at = comment.created_at

        # Phòng trường hợp PostgreSQL trả về datetime
        # không có timezone.
        if created_at.tzinfo is None:
            created_at = created_at.replace(
                tzinfo=timezone.utc,
            )

        elapsed = now - created_at

        if elapsed > COMMENT_EDIT_LIMIT:
            raise api_error(
                403,
                "COMMENT_EDIT_WINDOW_EXPIRED",
                "Comment chỉ có thể được sửa trong vòng 15 phút sau khi tạo.",
            )
