import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CommentCreate(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        max_length=5000,
    )


class CommentUpdate(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        max_length=5000,
    )


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    author_id: uuid.UUID | None
    content: str
    created_at: datetime