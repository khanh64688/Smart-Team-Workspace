import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProjectRole(str, enum.Enum):
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    MEMBER = "MEMBER"


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_member"),)

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    project_role: Mapped[ProjectRole] = mapped_column(Enum(ProjectRole, name="project_role"), nullable=False, default=ProjectRole.MEMBER, server_default=ProjectRole.MEMBER.value)
    # Cho phép cấp quyền config riêng lẻ cho một MEMBER cụ thể.
    # Ý nghĩa: khi project.visibility == PRIVATE, chỉ OWNER/MANAGER hoặc
    # member có can_config=True mới được thêm/sửa/xoá bảng và task.
    # OWNER và MANAGER luôn có quyền config bất kể trường này.
    can_config: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")
