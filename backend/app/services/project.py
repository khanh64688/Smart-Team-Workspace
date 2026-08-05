from datetime import datetime, timezone

from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.models.project import Project, ProjectStatus
from app.models.project_member import ProjectMember, ProjectRole
from app.models.user import SystemRole, User
from app.repositories.project import ProjectRepository
from app.schemas.project import MemberCreate, ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, db: Session):
        self.db, self.repo = db, ProjectRepository(db)

    def create(self, payload: ProjectCreate, actor: User) -> Project:
        if actor.role not in (SystemRole.ADMIN, SystemRole.PM):
            raise api_error(403, "PROJECT_CREATE_FORBIDDEN", "Bạn không có quyền tạo dự án.")
        project = Project(**payload.model_dump(), owner_id=actor.id)
        self.db.add(project); self.db.flush()
        self.db.add(ProjectMember(project_id=project.id, user_id=actor.id, project_role=ProjectRole.OWNER))
        self.db.commit(); self.db.refresh(project)
        return project

    def require_project(self, project_id: str) -> Project:
        project = self.repo.get(project_id)
        if not project: raise api_error(404, "PROJECT_NOT_FOUND", "Không tìm thấy dự án.")
        return project

    def require_member(self, project_id: str, actor: User) -> ProjectMember | None:
        self.require_project(project_id)
        membership = self.repo.membership(project_id, actor.id)
        if actor.role != SystemRole.ADMIN and not membership:
            raise api_error(403, "PROJECT_MEMBERSHIP_REQUIRED", "Bạn không phải thành viên dự án.")
        return membership

    def require_manager(self, project_id: str, actor: User) -> ProjectMember | None:
        membership = self.require_member(project_id, actor)
        if actor.role != SystemRole.ADMIN and membership.project_role not in (ProjectRole.OWNER, ProjectRole.MANAGER):
            raise api_error(403, "PROJECT_MANAGER_REQUIRED", "Bạn cần quyền quản lý dự án.")
        return membership

    def update(self, project_id: str, payload: ProjectUpdate, actor: User):
        project = self.require_project(project_id); self.require_manager(project_id, actor)
        if project.status == ProjectStatus.CLOSED: raise api_error(409, "PROJECT_CLOSED", "Dự án đã đóng và chỉ có thể đọc.")
        for key, value in payload.model_dump(exclude_unset=True).items(): setattr(project, key, value)
        self.db.commit(); self.db.refresh(project); return project

    def close(self, project_id: str, actor: User):
        project = self.require_project(project_id); membership = self.require_member(project_id, actor)
        if actor.role != SystemRole.ADMIN and membership.project_role != ProjectRole.OWNER:
            raise api_error(403, "PROJECT_OWNER_REQUIRED", "Chỉ chủ sở hữu được đóng dự án.")
        project.status = ProjectStatus.CLOSED; self.db.commit(); self.db.refresh(project); return project

    def soft_delete(self, project_id: str, actor: User):
        if actor.role != SystemRole.ADMIN: raise api_error(403, "ADMIN_REQUIRED", "Chỉ quản trị viên được xoá dự án.")
        project = self.require_project(project_id); project.deleted_at = datetime.now(timezone.utc); self.db.commit()

    def add_member(self, project_id: str, payload: MemberCreate, actor: User):
        import uuid
        manager = self.require_manager(project_id, actor)
        if self.require_project(project_id).status == ProjectStatus.CLOSED: raise api_error(409, "PROJECT_CLOSED", "Dự án đã đóng và chỉ có thể đọc.")
        try:
            user_uuid = uuid.UUID(payload.user_id) if isinstance(payload.user_id, str) else payload.user_id
        except ValueError:
            raise api_error(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.")
        if not self.db.get(User, user_uuid): raise api_error(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.")
        if payload.project_role == ProjectRole.OWNER: raise api_error(400, "OWNER_TRANSFER_REQUIRED", "Không thể thêm trực tiếp vai trò OWNER.")
        if payload.project_role == ProjectRole.MANAGER and actor.role != SystemRole.ADMIN and manager.project_role != ProjectRole.OWNER:
            raise api_error(403, "PROJECT_OWNER_REQUIRED", "Chỉ OWNER được phong MANAGER.")
        member = ProjectMember(project_id=project_id, user_id=user_uuid, project_role=payload.project_role)
        self.db.add(member)
        try: self.db.commit()
        except IntegrityError:
            self.db.rollback(); raise api_error(409, "PROJECT_MEMBER_EXISTS", "Người dùng đã là thành viên dự án.")
        self.db.refresh(member); return member

    def change_role(self, project_id: str, user_id: str, role: ProjectRole, actor: User):
        manager = self.require_manager(project_id, actor); target = self.repo.membership(project_id, user_id)
        if not target: raise api_error(404, "PROJECT_MEMBER_NOT_FOUND", "Không tìm thấy thành viên.")
        if role in (ProjectRole.OWNER, ProjectRole.MANAGER) and actor.role != SystemRole.ADMIN and manager.project_role != ProjectRole.OWNER:
            raise api_error(403, "PROJECT_OWNER_REQUIRED", "Chỉ OWNER được cấp vai trò quản lý.")
        if target.project_role == ProjectRole.OWNER and role != ProjectRole.OWNER and self.repo.owner_count(project_id) == 1:
            raise api_error(400, "LAST_OWNER_REQUIRED", "Dự án phải có ít nhất một OWNER.")
        target.project_role = role; self.db.commit(); self.db.refresh(target); return target

    def remove_member(self, project_id: str, user_id: str, actor: User, leaving=False):
        import uuid
        if leaving:
            self.require_member(project_id, actor); user_id = actor.id
        else: self.require_manager(project_id, actor)
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        except ValueError:
            raise api_error(404, "PROJECT_MEMBER_NOT_FOUND", "Không tìm thấy thành viên.")
        target = self.repo.membership(project_id, user_uuid)
        if not target: raise api_error(404, "PROJECT_MEMBER_NOT_FOUND", "Không tìm thấy thành viên.")
        if target.project_role == ProjectRole.OWNER and self.repo.owner_count(project_id) == 1:
            raise api_error(400, "LAST_OWNER_REQUIRED", "OWNER cuối cùng không thể rời hoặc bị xoá.")
        # TV4 sở hữu model Task. Cập nhật có điều kiện giữ đúng BR-03 mà không
        # tạo dependency vòng khi module Task chưa được merge vào nhánh nền.
        if inspect(self.db.bind).has_table("tasks"):
            self.db.execute(
                text("UPDATE tasks SET assignee_id = NULL WHERE project_id = :project_id AND assignee_id = :user_uuid"),
                {"project_id": project_id, "user_uuid": user_uuid},
            )
        self.db.delete(target); self.db.commit()
