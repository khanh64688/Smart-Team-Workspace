import uuid

from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.models.sprint import Sprint
from app.repositories.sprint import SprintRepository
from app.services.project import ProjectService
from app.schemas.sprint import (
    SprintCreate,
    SprintUpdate,
)


class SprintService:
    def __init__(self, db: Session):
        self.db = db
        self.sprint_repository = SprintRepository(db)
        self.project_service = ProjectService(db)


    def _get_sprint(
        self,
        sprint_id: uuid.UUID,
    ) -> Sprint:

        sprint = self.sprint_repository.get(
            sprint_id
        )

        if sprint is None:
            raise api_error(
                404,
                "SPRINT_NOT_FOUND",
                "Không tìm thấy sprint.",
            )

        return sprint

    def list_by_project(
        self,
        project_id: uuid.UUID,
        current_user,
    ) -> list[Sprint]:
        
        self.project_service.require_member(
            project_id,
            current_user,
        )

        return self.sprint_repository.list_by_project(
            project_id
        )

    def get(
        self,
        sprint_id: uuid.UUID,
        current_user,
    ) -> Sprint:

        sprint = self._get_sprint(
            sprint_id
        )

        self.project_service.require_member(
            sprint.project_id,
            current_user,
        )

        return sprint

    def create(
        self,
        project_id: uuid.UUID,
        data: SprintCreate,
        current_user,
    ) -> Sprint:
        
        self.project_service.require_manager(
            project_id,
            current_user,
        )



        if data.end_date <= data.start_date:
            raise api_error(
                400,
                "SPRINT_INVALID_DATE_RANGE",
                "end_date phải sau start_date.",
            )

        if data.status == "ACTIVE":
            active_sprint = (
                self.sprint_repository
                .get_active_by_project(
                    project_id
                )
            )

            if active_sprint is not None:
                raise api_error(
                    409,
                    "SPRINT_ACTIVE_EXISTS",
                    (
                        "Project đã có một ACTIVE sprint. "
                        "Không thể tạo thêm ACTIVE sprint."
                    ),
                )

        sprint = Sprint(
            project_id=project_id,
            name=data.name,
            goal=data.goal,
            start_date=data.start_date,
            end_date=data.end_date,
            status=data.status,
        )

        try:
            self.sprint_repository.create(
                sprint
            )

            self.db.commit()
            self.db.refresh(sprint)

            return sprint

        except Exception:
            self.db.rollback()
            raise

    def update(
        self,
        sprint_id: uuid.UUID,
        data: SprintUpdate,
        current_user,
    ) -> Sprint:

        sprint = self._get_sprint(
            sprint_id
        )

        # ADMIN / OWNER / MANAGER
        self.project_service.require_manager(
            sprint.project_id,
            current_user,
        )

        if sprint.status == "CLOSED":
            raise api_error(
                400,
                "SPRINT_CLOSED",
                "Không thể sửa sprint đã CLOSED.",
            )

        update_data = data.model_dump(
            exclude_unset=True
        )


        new_start_date = update_data.get(
            "start_date",
            sprint.start_date,
        )

        new_end_date = update_data.get(
            "end_date",
            sprint.end_date,
        )

        if new_end_date <= new_start_date:
            raise api_error(
                400,
                "SPRINT_INVALID_DATE_RANGE",
                "end_date phải sau start_date.",
            )

        if "status" in update_data:
            new_status = update_data["status"]

            if new_status != sprint.status:

                allowed_transitions = {
                    "PLANNED": {"ACTIVE"},
                    "ACTIVE": {"CLOSED"},
                    "CLOSED": set(),
                }

                allowed = allowed_transitions.get(
                    sprint.status,
                    set(),
                )

                if new_status not in allowed:
                    raise api_error(
                        400,
                        "SPRINT_INVALID_STATUS_TRANSITION",
                        (
                            f"Không thể chuyển sprint từ "
                            f"{sprint.status} sang "
                            f"{new_status}."
                        ),
                    )

                if new_status == "ACTIVE":
                    active_sprint = (
                        self.sprint_repository
                        .get_active_by_project(
                            sprint.project_id
                        )
                    )

                    if (
                        active_sprint is not None
                        and active_sprint.id != sprint.id
                    ):
                        raise api_error(
                            409,
                            "SPRINT_ACTIVE_EXISTS",
                            (
                                "Project đã có một ACTIVE sprint."
                            ),
                        )

        for field, value in update_data.items():
            setattr(
                sprint,
                field,
                value,
            )

        try:
            self.sprint_repository.update(
                sprint
            )

            self.db.commit()
            self.db.refresh(sprint)

            return sprint

        except Exception:
            self.db.rollback()
            raise

    def close(
        self,
        sprint_id: uuid.UUID,
        current_user,
    ) -> Sprint:

        sprint = self._get_sprint(
            sprint_id
        )

        # ADMIN / OWNER / MANAGER
        self.project_service.require_manager(
            sprint.project_id,
            current_user,
        )

        if sprint.status == "CLOSED":
            raise api_error(
                400,
                "SPRINT_ALREADY_CLOSED",
                "Sprint đã CLOSED.",
            )

        if sprint.status != "ACTIVE":
            raise api_error(
                400,
                "SPRINT_NOT_ACTIVE",
                "Chỉ ACTIVE sprint mới có thể được đóng.",
            )

        sprint.status = "CLOSED"

        try:
            self.sprint_repository.update(
                sprint
            )

            self.db.commit()
            self.db.refresh(sprint)

            return sprint

        except Exception:
            self.db.rollback()
            raise

    def delete(
        self,
        sprint_id: uuid.UUID,
        current_user,
    ) -> None:

        sprint = self._get_sprint(
            sprint_id
        )

        # ADMIN / OWNER / MANAGER
        self.project_service.require_manager(
            sprint.project_id,
            current_user,
        )

        if sprint.status == "ACTIVE":
            raise api_error(
                400,
                "SPRINT_ACTIVE_CANNOT_DELETE",
                "Không thể xóa ACTIVE sprint.",
            )

        if self.sprint_repository.has_tasks(
            sprint_id
        ):
            raise api_error(
                400,
                "SPRINT_HAS_TASKS",
                (
                    "Không thể xóa sprint vì sprint "
                    "đã có task."
                ),
            )

        try:
            self.sprint_repository.delete(
                sprint
            )

            self.db.commit()

        except Exception:
            self.db.rollback()
            raise
