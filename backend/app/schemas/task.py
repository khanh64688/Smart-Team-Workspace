from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, computed_field

TaskStatus = Literal["TODO", "IN_PROGRESS", "REVIEW", "DONE"]


class TaskAssignee(BaseModel):
    """Thông tin tối thiểu để hiển thị người phụ trách trên thẻ Kanban."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    sprint_id: uuid.UUID | None = None

    title: str
    description: str | None = None
    status: str
    priority: str

    due_date: datetime | None = None
    assignee_id: uuid.UUID | None = None
    assignee: TaskAssignee | None = None

    position: int = 0
    created_at: datetime
    completed_at: datetime | None = None

    # Không có sẵn trên model Task, route tự điền sau khi đếm.
    comments_count: int = 0

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_overdue(self) -> bool:
        """
        Quá hạn là trạng thái SUY RA, không phải cột trong database.

        Lưu thành cột thì mỗi ngày trôi qua lại phải chạy job cập nhật,
        và chỉ cần quên một lần là số liệu sai.
        """
        if self.due_date is None or self.status == "DONE":
            return False

        return self.due_date < datetime.now(UTC)


class TaskMoveRequest(BaseModel):
    """Payload khi kéo thả một thẻ sang cột khác trên bảng Kanban."""

    status: TaskStatus

    # Vị trí trong cột đích. Frontend chưa gửi, nhưng để sẵn thì thao tác
    # sắp xếp lại trong cùng một cột không cần đổi endpoint.
    position: int | None = None


__all__ = [
    "TaskAssignee",
    "TaskMoveRequest",
    "TaskResponse",
    "TaskStatus",
]
