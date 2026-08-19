import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.user import User


class NotificationType(enum.StrEnum):
    """
    Ba nguồn sinh thông báo của US-18, cộng thêm mức leo thang
    TASK_OVERDUE khi task đã qua deadline.
    """

    TASK_ASSIGNED = "TASK_ASSIGNED"
    TASK_COMMENT = "TASK_COMMENT"
    TASK_DUE_SOON = "TASK_DUE_SOON"
    TASK_OVERDUE = "TASK_OVERDUE"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Người nhận thông báo.
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    # Lưu dạng String thay vì enum của PostgreSQL để thêm loại
    # thông báo mới không cần migration đổi kiểu enum.
    type: Mapped[str] = mapped_column(String(30))

    title: Mapped[str] = mapped_column(String(255))

    message: Mapped[str] = mapped_column(Text)

    # Bấm vào thông báo thì mở task này.
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=True,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )

    # Relationships
    user: Mapped["User"] = relationship()

    task: Mapped["Task | None"] = relationship()

    __table_args__ = (
        # Truy vấn chính: lấy thông báo của một user, mới nhất trước.
        Index(
            "ix_notifications_user_created_at",
            "user_id",
            "created_at",
        ),
        # Dùng để chống trùng thông báo deadline của cùng một task.
        Index(
            "ix_notifications_user_task_type",
            "user_id",
            "task_id",
            "type",
        ),
    )
