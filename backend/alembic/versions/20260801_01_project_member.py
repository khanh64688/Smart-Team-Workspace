"""create projects and project_members tables

Revision ID: 20260801_01
Revises: 3e5be78372bd
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260801_01"
down_revision = "3e5be78372bd"
branch_labels = None
depends_on = None

project_status_enum = postgresql.ENUM(
    "ACTIVE", "CLOSED", name="project_status", create_type=False
)
project_role_enum = postgresql.ENUM(
    "OWNER", "MANAGER", "MEMBER", name="project_role", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    project_status_enum.create(bind, checkfirst=True)
    project_role_enum.create(bind, checkfirst=True)

    op.create_table(
        "projects",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", project_status_enum, server_default="ACTIVE", nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_name", "projects", ["name"])
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"])
    op.create_index("ix_projects_deleted_at", "projects", ["deleted_at"])

    op.create_table(
        "project_members",
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("project_role", project_role_enum, server_default="MEMBER", nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("project_id", "user_id"),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_member"),
    )


def downgrade() -> None:
    op.drop_table("project_members")
    op.drop_index("ix_projects_deleted_at", table_name="projects")
    op.drop_index("ix_projects_owner_id", table_name="projects")
    op.drop_index("ix_projects_status", table_name="projects")
    op.drop_index("ix_projects_name", table_name="projects")
    op.drop_table("projects")

    bind = op.get_bind()
    project_role_enum.drop(bind, checkfirst=True)
    project_status_enum.drop(bind, checkfirst=True)
