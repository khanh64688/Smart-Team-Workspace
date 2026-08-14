"""add project visibility and member config permission

Revision ID: 8eb05f844e2b
Revises: cd0a6e8dceb0
Create Date: 2026-08-14 11:57:21.582461

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8eb05f844e2b"
down_revision: Union[str, Sequence[str], None] = "cd0a6e8dceb0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    project_visibility = sa.Enum(
        "PUBLIC",
        "PRIVATE",
        name="project_visibility",
    )

    # Tạo PostgreSQL enum type trước.
    project_visibility.create(
        op.get_bind(),
        checkfirst=True,
    )

    # Thêm quyền config riêng cho project member.
    op.add_column(
        "project_members",
        sa.Column(
            "can_config",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    # Thêm visibility cho project.
    # Dùng chính enum object đã tạo ở trên.
    op.add_column(
        "projects",
        sa.Column(
            "visibility",
            project_visibility,
            server_default="PRIVATE",
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""

    # Phải xóa column dùng enum trước.
    op.drop_column(
        "projects",
        "visibility",
    )

    op.drop_column(
        "project_members",
        "can_config",
    )

    # Sau khi không còn column nào dùng enum mới được drop enum type.
    project_visibility = sa.Enum(
        "PUBLIC",
        "PRIVATE",
        name="project_visibility",
    )

    project_visibility.drop(
        op.get_bind(),
        checkfirst=True,
    )