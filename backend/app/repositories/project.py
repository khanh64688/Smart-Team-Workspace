from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.project import Project, ProjectStatus
from app.models.project_member import ProjectMember


class ProjectRepository:
    def __init__(self, db: Session): self.db = db

    def get(self, project_id: str) -> Project | None:
        return self.db.scalar(select(Project).where(Project.id == project_id, Project.deleted_at.is_(None)))

    def membership(self, project_id: str, user_id: str) -> ProjectMember | None:
        return self.db.get(ProjectMember, (project_id, user_id))

    def list(self, user_id: str, is_admin: bool, q: str | None, status: ProjectStatus | None, page: int, size: int, sort: str):
        stmt = select(Project).where(Project.deleted_at.is_(None))
        if not is_admin:
            stmt = stmt.join(ProjectMember).where(ProjectMember.user_id == user_id)
        if q:
            stmt = stmt.where(Project.name.ilike(f"%{q.strip()}%"))
        if status:
            stmt = stmt.where(Project.status == status)
        else:
            stmt = stmt.where(Project.status == ProjectStatus.ACTIVE)
        sort_columns = {"name": Project.name.asc(), "-name": Project.name.desc(), "created_at": Project.created_at.asc(), "-created_at": Project.created_at.desc()}
        stmt = stmt.order_by(sort_columns.get(sort, Project.created_at.desc()))
        total = self.db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
        return list(self.db.scalars(stmt.offset((page - 1) * size).limit(size))), total

    def members(self, project_id: str):
        stmt = select(ProjectMember).options(joinedload(ProjectMember.user)).where(ProjectMember.project_id == project_id).order_by(ProjectMember.joined_at)
        return list(self.db.scalars(stmt))

    def owner_count(self, project_id: str) -> int:
        from app.models.project_member import ProjectRole
        return self.db.scalar(select(func.count()).select_from(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.project_role == ProjectRole.OWNER)) or 0
