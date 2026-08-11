from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment
from app.models.task import Task
from app.models.user import User

DONE = "DONE"


def now_utc() -> datetime:
    return datetime.now(UTC)


class TaskRepository:
    """
    Truy vấn task phục vụ chatbot và dashboard.

    Toàn bộ method ở đây chỉ đọc và luôn nhận project_id — không có
    đường nào lấy task mà không nêu rõ dự án. Việc kiểm tra người gọi
    có thuộc dự án hay không là của tầng service.
    """

    def __init__(self, db: Session):
        self.db = db

    def _base(self, project_id: uuid.UUID):
        return (
            select(Task)
            .options(joinedload(Task.assignee))
            .where(Task.project_id == project_id)
        )

    def get(self, task_id: uuid.UUID) -> Task | None:
        """Một task kèm assignee, không ràng buộc dự án — service tự kiểm tra quyền."""
        stmt = (
            select(Task)
            .options(joinedload(Task.assignee))
            .where(Task.id == task_id)
        )

        return self.db.scalars(stmt).unique().one_or_none()

    def count_comments(self, task_id: uuid.UUID) -> int:
        stmt = select(func.count(Comment.id)).where(Comment.task_id == task_id)

        return self.db.scalar(stmt) or 0

    def list_by_project(
        self,
        project_id: uuid.UUID,
        *,
        status: str | None = None,
        assignee_id: uuid.UUID | None = None,
        sprint_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> list[Task]:
        stmt = self._base(project_id)

        if status:
            stmt = stmt.where(Task.status == status)

        if assignee_id:
            stmt = stmt.where(Task.assignee_id == assignee_id)

        if sprint_id:
            stmt = stmt.where(Task.sprint_id == sprint_id)

        stmt = stmt.order_by(
            Task.due_date.asc().nullslast(),
        ).limit(limit)

        return list(self.db.scalars(stmt).unique().all())

    def list_overdue(
        self,
        project_id: uuid.UUID,
        *,
        assignee_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> list[Task]:
        """
        Task quá hạn = có due_date đã qua VÀ chưa xong.

        Task DONE luôn bị loại kể cả khi due_date đã qua: seed data có
        nhiều task DONE với due_date âm, không lọc thì cả sprint đã xong
        cũng bị báo là quá hạn.
        """
        stmt = (
            self._base(project_id)
            .where(
                Task.due_date.is_not(None),
                Task.due_date < now_utc(),
                Task.status != DONE,
            )
            .order_by(Task.due_date.asc())
            .limit(limit)
        )

        if assignee_id:
            stmt = stmt.where(Task.assignee_id == assignee_id)

        return list(self.db.scalars(stmt).unique().all())

    def count_by_status(
        self,
        project_id: uuid.UUID,
        *,
        sprint_id: uuid.UUID | None = None,
    ) -> dict[str, int]:
        stmt = (
            select(Task.status, func.count(Task.id))
            .where(Task.project_id == project_id)
            .group_by(Task.status)
        )

        if sprint_id:
            stmt = stmt.where(Task.sprint_id == sprint_id)

        return dict(self.db.execute(stmt).all())

    def comment_counts(
        self,
        project_id: uuid.UUID,
    ) -> dict[uuid.UUID, int]:
        """
        Số comment của từng task trong dự án.

        Đếm bằng một truy vấn gộp thay vì nạp quan hệ comments của từng
        task — nếu không thì danh sách 26 task sinh ra 27 câu lệnh SQL.
        """
        stmt = (
            select(Comment.task_id, func.count(Comment.id))
            .join(Task, Task.id == Comment.task_id)
            .where(Task.project_id == project_id)
            .group_by(Comment.task_id)
        )

        return dict(self.db.execute(stmt).all())

    def workload_by_assignee(
        self,
        project_id: uuid.UUID,
    ) -> list[tuple[User, int]]:
        """Số task chưa hoàn thành của từng người, nhiều nhất lên đầu."""

        stmt = (
            select(User, func.count(Task.id).label("total"))
            .join(Task, Task.assignee_id == User.id)
            .where(
                Task.project_id == project_id,
                Task.status != DONE,
            )
            .group_by(User.id)
            .order_by(func.count(Task.id).desc())
        )

        return [(user, total) for user, total in self.db.execute(stmt).all()]


__all__ = ["TaskRepository", "now_utc"]
