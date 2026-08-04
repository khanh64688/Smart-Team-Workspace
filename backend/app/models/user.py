import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Enum, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SystemRole(str, enum.Enum):
    ADMIN = "ADMIN"
    PM = "PM"
    MEMBER = "MEMBER"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[SystemRole] = mapped_column(Enum(SystemRole), nullable=False, default=SystemRole.MEMBER, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    project_memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
