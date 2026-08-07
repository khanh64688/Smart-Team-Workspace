# backend/app/schemas/common.py

from typing import Any

from pydantic import BaseModel, ConfigDict


class StrictRequest(BaseModel):
    """
    Base class cho request schema.

    extra="forbid" nghĩa là nếu frontend gửi thêm field không tồn tại,
    Pydantic sẽ từ chối thay vì âm thầm bỏ qua.
    """

    model_config = ConfigDict(extra="forbid")


class MessageResponse(BaseModel):
    message: str


class ErrorContent(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    error: ErrorContent


class PaginationMeta(BaseModel):
    page: int
    size: int
    total: int