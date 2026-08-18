import uuid
from datetime import datetime, timezone

from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.models.project import Project, ProjectStatus, ProjectVisibility
from app.models.project_member import ProjectMember, ProjectRole
from app.models.user import User, UserRole
from app.repositories.project import ProjectRepository
from app.schemas.project import MemberCreate, ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, db: Session):
        self.db, self.repo = db, ProjectRepository(db)

    def create(self, payload: ProjectCreate, actor: User) -> Project:
        if actor.role not in (UserRole.ADMIN, UserRole.PM):
            raise api_error(403, "PROJECT_CREATE_FORBIDDEN", "Bạn không có quyền tạo dự án.")
        project = Project(**payload.model_dump(), owner_id=actor.id)
        self.db.add(project); self.db.flush()
        self.db.add(ProjectMember(project_id=project.id, user_id=actor.id, project_role=ProjectRole.OWNER))
        self.db.commit(); self.db.refresh(project)
        return project

    def require_project(self, project_id: uuid.UUID) -> Project:
        project = self.repo.get(project_id)
        if not project: raise api_error(404, "PROJECT_NOT_FOUND", "Không tìm thấy dự án.")
        return project

    def require_member(self, project_id: uuid.UUID, actor: User) -> ProjectMember | None:
        self.require_project(project_id)
        membership = self.repo.membership(project_id, actor.id)
        if actor.role != UserRole.ADMIN and not membership:
            raise api_error(403, "PROJECT_MEMBERSHIP_REQUIRED", "Bạn không phải thành viên dự án.")
        return membership

    def require_manager(
        self,
        project_id: uuid.UUID,
        actor: User,
    ) -> ProjectMember | None:
        membership = self.require_member(
            project_id,
            actor,
        )

        if actor.role == UserRole.ADMIN:
            return membership

        if actor.role != UserRole.PM:
            raise api_error(
                403,
                "PROJECT_MANAGER_REQUIRED",
                "Bạn cần quyền quản lý dự án.",
            )

        if membership.project_role not in (
            ProjectRole.OWNER,
            ProjectRole.MANAGER,
        ):
            raise api_error(
                403,
                "PROJECT_MANAGER_REQUIRED",
                "Bạn cần quyền quản lý dự án.",
            )

        return membership

    def require_config_permission(self, project_id: uuid.UUID, actor: User) -> ProjectMember | None:
        """Kiểm tra quyền config workspace (thêm/sửa/xoá bảng, task).

        Logic:
        - ADMIN hệ thống: luôn được.
        - Project PUBLIC: mọi member đều được.
        - Project PRIVATE: chỉ OWNER/MANAGER hoặc member có can_config=True.
        """
        project = self.require_project(project_id)
        membership = self.require_member(project_id, actor)  # đảm bảo là thành viên

        if actor.role == UserRole.ADMIN:
            return membership

        if project.visibility == ProjectVisibility.PUBLIC:
            return membership

        # PRIVATE: kiểm tra role hoặc can_config
        if membership.project_role in (ProjectRole.OWNER, ProjectRole.MANAGER):
            return membership

        if membership.can_config:
            return membership

        raise api_error(
            403,
            "PROJECT_CONFIG_FORBIDDEN",
            "Workspace này ở chế độ private. Bạn không có quyền chỉnh sửa cấu hình.",
        )

    def update(self, project_id: uuid.UUID, payload: ProjectUpdate, actor: User):
        project = self.require_project(project_id); self.require_manager(project_id, actor)
        if project.status == ProjectStatus.CLOSED: raise api_error(409, "PROJECT_CLOSED", "Dự án đã đóng và chỉ có thể đọc.")
        for key, value in payload.model_dump(exclude_unset=True).items(): setattr(project, key, value)
        self.db.commit(); self.db.refresh(project); return project

    def close(
        self,
        project_id: uuid.UUID,
        actor: User,
    ) -> Project:
        project = self.require_project(
            project_id
        )

        membership = self.require_member(
            project_id,
            actor,
        )

        if actor.role == UserRole.ADMIN:
            project.status = ProjectStatus.CLOSED

        else:
            if (
                actor.role != UserRole.PM
                or membership.project_role
                != ProjectRole.OWNER
            ):
                raise api_error(
                    403,
                    "PROJECT_OWNER_REQUIRED",
                    "Chỉ chủ sở hữu được đóng dự án.",
                )

            project.status = ProjectStatus.CLOSED

        self.db.commit()
        self.db.refresh(project)

        return project

    def reopen(
        self,
        project_id: uuid.UUID,
        actor: User,
    ) -> Project:
        project = self.require_project(
            project_id
        )

        membership = self.require_member(
            project_id,
            actor,
        )

        if actor.role != UserRole.ADMIN:
            if (
                actor.role != UserRole.PM
                or membership.project_role
                != ProjectRole.OWNER
            ):
                raise api_error(
                    403,
                    "PROJECT_OWNER_REQUIRED",
                    "Chỉ chủ sở hữu được mở lại dự án.",
                )

        project.status = ProjectStatus.ACTIVE

        self.db.commit()
        self.db.refresh(project)

        return project

    def soft_delete(self, project_id: uuid.UUID, actor: User):
        if actor.role != UserRole.ADMIN: raise api_error(403, "ADMIN_REQUIRED", "Chỉ quản trị viên được xoá dự án.")
        project = self.require_project(project_id); project.deleted_at = datetime.now(timezone.utc); self.db.commit()

    def add_member(self, project_id: uuid.UUID, payload: MemberCreate, actor: User):
        manager = self.require_manager(project_id, actor)
        if self.require_project(project_id).status == ProjectStatus.CLOSED: raise api_error(409, "PROJECT_CLOSED", "Dự án đã đóng và chỉ có thể đọc.")
        if not self.db.get(User, payload.user_id): raise api_error(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.")
        if payload.project_role == ProjectRole.OWNER: raise api_error(400, "OWNER_TRANSFER_REQUIRED", "Không thể thêm trực tiếp vai trò OWNER.")
        if payload.project_role == ProjectRole.MANAGER and actor.role != UserRole.ADMIN and manager.project_role != ProjectRole.OWNER:
            raise api_error(403, "PROJECT_OWNER_REQUIRED", "Chỉ OWNER được phong MANAGER.")
        if self.repo.membership(project_id, payload.user_id):
            raise api_error(409, "PROJECT_MEMBER_EXISTS", "Người dùng đã là thành viên dự án.")
        member = ProjectMember(
            project_id=project_id,
            user_id=payload.user_id,
            project_role=payload.project_role,
            can_config=payload.can_config,
        )
        self.db.add(member)
        try: self.db.commit()
        except IntegrityError:
            self.db.rollback(); raise api_error(409, "PROJECT_MEMBER_EXISTS", "Người dùng đã là thành viên dự án.")
        self.db.refresh(member); return member

    def change_role(self, project_id: uuid.UUID, user_id: uuid.UUID, role: ProjectRole, actor: User):
        project = self.require_project(project_id)
        manager = self.require_manager(project_id, actor); target = self.repo.membership(project_id, user_id)
        if not target: raise api_error(404, "PROJECT_MEMBER_NOT_FOUND", "Không tìm thấy thành viên.")
        if role in (ProjectRole.OWNER, ProjectRole.MANAGER) and actor.role != UserRole.ADMIN and manager.project_role != ProjectRole.OWNER:
            raise api_error(403, "PROJECT_OWNER_REQUIRED", "Chỉ OWNER được cấp vai trò quản lý.")
        if target.project_role == ProjectRole.OWNER and role != ProjectRole.OWNER and self.repo.owner_count(project_id) == 1:
            raise api_error(400, "LAST_OWNER_REQUIRED", "Dự án phải có ít nhất một OWNER.")
        target.project_role = role
        if role == ProjectRole.OWNER:
            project.owner_id = target.user_id
        elif project.owner_id == target.user_id:
            replacement = next(
                member for member in self.repo.members(project_id)
                if member.project_role == ProjectRole.OWNER and member.user_id != target.user_id
            )
            project.owner_id = replacement.user_id
        self.db.commit(); self.db.refresh(target); return target

    def remove_member(self, project_id: uuid.UUID, user_id: uuid.UUID, actor: User, leaving=False):
        if leaving:
            self.require_member(project_id, actor); user_id = actor.id
        else: self.require_manager(project_id, actor)
        target = self.repo.membership(project_id, user_id)
        if not target: raise api_error(404, "PROJECT_MEMBER_NOT_FOUND", "Không tìm thấy thành viên.")
        if target.project_role == ProjectRole.OWNER and self.repo.owner_count(project_id) == 1:
            raise api_error(400, "LAST_OWNER_REQUIRED", "OWNER cuối cùng không thể rời hoặc bị xoá.")
        project = self.require_project(project_id)
        if project.owner_id == target.user_id:
            replacement = next(
                member for member in self.repo.members(project_id)
                if member.project_role == ProjectRole.OWNER and member.user_id != target.user_id
            )
            project.owner_id = replacement.user_id
        # TV4 sở hữu model Task. Cập nhật có điều kiện giữ đúng BR-03 mà không
        # tạo dependency vòng khi module Task chưa được merge vào nhánh nền.
        if inspect(self.db.bind).has_table("tasks"):
            self.db.execute(
                text("UPDATE tasks SET assignee_id = NULL WHERE project_id = :project_id AND assignee_id = :user_id"),
                {"project_id": project_id, "user_id": user_id},
            )
        self.db.delete(target); self.db.commit()

    def set_member_config(self, project_id: uuid.UUID, user_id: uuid.UUID, can_config: bool, actor: User) -> ProjectMember:
        """Cấp / thu hồi quyền can_config của một MEMBER cụ thể.
        Chỉ OWNER hoặc ADMIN mới được thực hiện.
        OWNER và MANAGER không cần can_config nên không cho phép set.
        """
        manager = self.require_manager(project_id, actor)
        if actor.role != UserRole.ADMIN and manager.project_role != ProjectRole.OWNER:
            raise api_error(403, "PROJECT_OWNER_REQUIRED", "Chỉ OWNER được cấp/thu hồi quyền config.")
        target = self.repo.membership(project_id, user_id)
        if not target:
            raise api_error(404, "PROJECT_MEMBER_NOT_FOUND", "Không tìm thấy thành viên.")
        if target.project_role in (ProjectRole.OWNER, ProjectRole.MANAGER):
            raise api_error(400, "CONFIG_ROLE_REDUNDANT", "OWNER và MANAGER luôn có quyền config, không cần thiết lập thêm.")
        target.can_config = can_config
        self.db.commit(); self.db.refresh(target)
        return target
