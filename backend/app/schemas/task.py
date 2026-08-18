import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.user import UserPublicResponse


TASK_STATUSES = {
    "TODO",
    "IN_PROGRESS",
    "REVIEW",
    "DONE",
}

TASK_PRIORITIES = {
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
}


class TaskCreate(BaseModel):
    project_id: uuid.UUID
    sprint_id: uuid.UUID | None = None

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None

    assignee_id: uuid.UUID | None = None

    status: str = "TODO"
    priority: str = "MEDIUM"

    due_date: datetime | None = None
    position: int = Field(default=65536, ge=0)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Title không được để trống.")

        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip().upper()

        if value not in TASK_STATUSES:
            raise ValueError(
                f"Status không hợp lệ: {value}"
            )

        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        value = value.strip().upper()

        if value not in TASK_PRIORITIES:
            raise ValueError(
                f"Priority không hợp lệ: {value}"
            )

        return value

    @field_validator("due_date")
    @classmethod
    def validate_due_date(
        cls,
        value: datetime | None,
    ) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError(
                "due_date phải chứa timezone."
            )

        return value


class TaskUpdate(BaseModel):
    sprint_id: uuid.UUID | None = None

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    description: str | None = None
    priority: str | None = None
    due_date: datetime | None = None

    @field_validator("title")
    @classmethod
    def validate_title(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError("Title không được để trống.")

        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip().upper()

        if value not in TASK_PRIORITIES:
            raise ValueError(
                f"Priority không hợp lệ: {value}"
            )

        return value

    @field_validator("due_date")
    @classmethod
    def validate_due_date(
        cls,
        value: datetime | None,
    ) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError(
                "due_date phải chứa timezone."
            )

        return value


class TaskAssign(BaseModel):
    assignee_id: uuid.UUID | None = None


class TaskMove(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip().upper()

        if value not in TASK_STATUSES:
            raise ValueError(
                f"Status không hợp lệ: {value}"
            )

        return value


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID

    project_id: uuid.UUID
    sprint_id: uuid.UUID | None

    title: str
    description: str | None

    assignee_id: uuid.UUID | None

    # Hồ sơ rút gọn của người phụ trách để bảng task vẽ được avatar + tên
    # mà không rò rỉ email của cả team cho MEMBER.
    assignee: UserPublicResponse | None = None

    status: str
    priority: str

    due_date: datetime | None
    position: int

    created_at: datetime
    completed_at: datetime | None

