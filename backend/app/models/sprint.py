import enum
import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Sprint(Base):
    __tablename__ = "sprints"

    # id: Mapped[int] = mapped_column(primary_key=True, index=True)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE")
    )

    name: Mapped[str] = mapped_column(String(255))

    goal: Mapped[str | None] = mapped_column(String, nullable=True)

    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    status: Mapped[str] = mapped_column(String(30))

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="sprints")

    tasks: Mapped[list["Task"]] = relationship(
        back_populates="sprint",
        cascade="all, delete-orphan",
    )