import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SprintCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=255,
    )

    goal: str | None = Field(
        default=None,
        max_length=5000,
    )

    start_date: datetime
    end_date: datetime

    # Khi tạo sprint mặc định là ACTIVE.
    # Có thể truyền PLANNED nếu muốn tạo trước.
    status: str = Field(
        default="ACTIVE",
        pattern="^(PLANNED|ACTIVE)$",
    )

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError(
                "end_date must be greater than start_date"
            )

        return self


class SprintUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    goal: str | None = Field(
        default=None,
        max_length=5000,
    )

    start_date: datetime | None = None
    end_date: datetime | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.end_date <= self.start_date
        ):
            raise ValueError(
                "end_date must be greater than start_date"
            )

        return self


class SprintOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: uuid.UUID
    project_id: uuid.UUID

    name: str
    goal: str | None

    start_date: datetime
    end_date: datetime

    status: str