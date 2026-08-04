from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE")
    )

    sprint_id: Mapped[int | None] = mapped_column(
        ForeignKey("sprints.id", ondelete="SET NULL"),
        nullable=True,
    )

    title: Mapped[str] = mapped_column(String(255))

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    assignee_id: Mapped[int | None] = mapped_column(
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

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="tasks")

    sprint: Mapped["Sprint | None"] = relationship(back_populates="tasks")

    assignee: Mapped["User | None"] = relationship(back_populates="tasks")

    comments: Mapped[list["Comment"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )