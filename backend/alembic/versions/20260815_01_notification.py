"""create notifications table

Revision ID: 20260815_01
Revises: 20260810_01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


revision: str = "20260815_01"
down_revision: str | None = "20260810_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "type",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "title",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "message",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "task_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "is_read",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            ondelete="CASCADE",
        ),
    )

    op.create_index(
        op.f("ix_notifications_user_id"),
        "notifications",
        ["user_id"],
    )

    # Truy vấn chính: thông báo của một user, mới nhất trước.
    op.create_index(
        "ix_notifications_user_created_at",
        "notifications",
        ["user_id", "created_at"],
    )

    # Chống trùng thông báo deadline của cùng một task.
    op.create_index(
        "ix_notifications_user_task_type",
        "notifications",
        ["user_id", "task_id", "type"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_notifications_user_task_type",
        table_name="notifications",
    )

    op.drop_index(
        "ix_notifications_user_created_at",
        table_name="notifications",
    )

    op.drop_index(
        op.f("ix_notifications_user_id"),
        table_name="notifications",
    )

    op.drop_table("notifications")
