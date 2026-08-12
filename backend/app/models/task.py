import enum
import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class Task(Base):
    __tablename__ = "tasks"

    # id: Mapped[int] = mapped_column(primary_key=True, index=True)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    


    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE")
    )

    sprint_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sprints.id", ondelete="SET NULL"),
        nullable=True,
    )

    title: Mapped[str] = mapped_column(String(255))

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(String(30))

    priority: Mapped[str] = mapped_column(String(30))

    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    position: Mapped[int] = mapped_column(
        Integer,
        default=65536,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="tasks")

    sprint: Mapped["Sprint | None"] = relationship(back_populates="tasks")

    assignee: Mapped["User | None"] = relationship(back_populates="tasks")

    comments: Mapped[list["Comment"]] = relationship(
        back_populates="task"
    )