import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProjectStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class ProjectVisibility(str, enum.Enum):
    """Chế độ hiển thị của dự án.

    PUBLIC  – mọi member trong dự án đều có thể thêm / sửa / xoá bảng và task.
    PRIVATE – chỉ OWNER / MANAGER (hoặc member được cấp quyền) mới được config.
    """
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, name="project_status"), nullable=False, default=ProjectStatus.ACTIVE, server_default=ProjectStatus.ACTIVE.value, index=True)
    visibility: Mapped[ProjectVisibility] = mapped_column(Enum(ProjectVisibility, name="project_visibility"), nullable=False, default=ProjectVisibility.PRIVATE, server_default=ProjectVisibility.PRIVATE.value)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)

    owner = relationship("User", back_populates="owned_projects", foreign_keys=[owner_id])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan", passive_deletes=True)
