"""create project and project member tables"""
from alembic import op
import sqlalchemy as sa

revision = "20260801_01"
down_revision = "3e5be78372bd"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("projects", sa.Column("id", sa.String(36), primary_key=True), sa.Column("name", sa.String(100), nullable=False), sa.Column("description", sa.Text()), sa.Column("status", sa.Enum("ACTIVE", "CLOSED", name="projectstatus"), nullable=False), sa.Column("owner_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True)))
    op.create_index("ix_projects_name", "projects", ["name"])
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_table("project_members", sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True), sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True), sa.Column("project_role", sa.Enum("OWNER", "MANAGER", "MEMBER", name="projectrole"), nullable=False), sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False), sa.UniqueConstraint("project_id", "user_id", name="uq_project_member"))

def downgrade():
    op.drop_table("project_members"); op.drop_table("projects")
