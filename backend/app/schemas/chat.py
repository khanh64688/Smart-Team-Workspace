from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import StrictRequest


class ChatHistoryItem(StrictRequest):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class ChatRequest(StrictRequest):
    message: str = Field(min_length=1, max_length=1000)

    # Bắt buộc: mọi câu hỏi đều nằm trong phạm vi một dự án, và service
    # kiểm tra quyền dựa trên chính id này trước khi gọi AI.
    project_id: uuid.UUID

    # Giới hạn ngay ở schema để một client lỗi không đẩy được
    # hội thoại dài vô hạn vào prompt.
    history: list[ChatHistoryItem] = Field(
        default_factory=list,
        max_length=20,
    )


class AISummaryResponse(BaseModel):
    """Thẻ tóm tắt sprint. Khớp đúng type AISummary phía frontend."""

    overview: str
    completed: list[str] = Field(default_factory=list)
    at_risk: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    overloaded_members: list[str] = Field(default_factory=list)
    next_priorities: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    summary: AISummaryResponse | None = None
    suggestions: list[str] = Field(default_factory=list)


__all__ = [
    "AISummaryResponse",
    "ChatHistoryItem",
    "ChatRequest",
    "ChatResponse",
]
