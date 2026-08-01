import enum
import uuid

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SystemRole(str, enum.Enum):
    ADMIN = "ADMIN"
    PM = "PM"
    MEMBER = "MEMBER"


class User(Base):
    """Model tương thích tối thiểu; TV2 có thể mở rộng mà không đổi contract TV3."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    role: Mapped[SystemRole] = mapped_column(Enum(SystemRole), nullable=False, default=SystemRole.MEMBER)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    project_memberships = relationship("ProjectMember", back_populates="user")
