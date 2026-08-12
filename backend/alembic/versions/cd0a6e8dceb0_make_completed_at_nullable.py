"""create sprint, task, comment tables and make completed_at nullable

Revision ID: cd0a6e8dceb0
Revises: 20260801_01
Create Date: 2026-08-09 00:46:02.157178
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "cd0a6e8dceb0"
down_revision: Union[str, Sequence[str], None] = "20260801_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create sprint, task and comment tables."""

    # ------------------------------------------------------------------
    # 1. SPRINTS
    # Phải tạo trước tasks vì tasks.sprint_id FK -> sprints.id
    # ------------------------------------------------------------------
    op.create_table(
        "sprints",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.VARCHAR(length=255),
            nullable=False,
        ),
        sa.Column(
            "goal",
            sa.VARCHAR(),
            nullable=True,
        ),
        sa.Column(
            "start_date",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "end_date",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.VARCHAR(length=30),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("sprints_project_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name=op.f("sprints_pkey"),
        ),
    )

    # ------------------------------------------------------------------
    # 2. TASKS
    # Phụ thuộc projects, users và sprints.
    # ------------------------------------------------------------------
    op.create_table(
        "tasks",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "sprint_id",
            sa.UUID(),
            nullable=True,
        ),
        sa.Column(
            "title",
            sa.VARCHAR(length=255),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.TEXT(),
            nullable=True,
        ),
        sa.Column(
            "assignee_id",
            sa.UUID(),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.VARCHAR(length=30),
            nullable=False,
        ),
        sa.Column(
            "priority",
            sa.VARCHAR(length=30),
            nullable=False,
        ),
        sa.Column(
            "due_date",
            postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "position",
            sa.INTEGER(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "completed_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["assignee_id"],
            ["users.id"],
            name=op.f("tasks_assignee_id_fkey"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("tasks_project_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["sprint_id"],
            ["sprints.id"],
            name=op.f("tasks_sprint_id_fkey"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name=op.f("tasks_pkey"),
        ),
    )

    # ------------------------------------------------------------------
    # 3. COMMENTS
    # Phải tạo sau tasks vì comments.task_id FK -> tasks.id
    # ------------------------------------------------------------------
    op.create_table(
        "comments",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "task_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            sa.UUID(),
            nullable=True,
        ),
        sa.Column(
            "content",
            sa.TEXT(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["users.id"],
            name=op.f("comments_author_id_fkey"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            name=op.f("comments_task_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name=op.f("comments_pkey"),
        ),
    )


def downgrade() -> None:
    """Drop sprint, task and comment tables."""

    # Phải xóa theo thứ tự NGƯỢC dependency:
    # comments -> tasks -> sprints
    op.drop_table("comments")
    op.drop_table("tasks")
    op.drop_table("sprints")