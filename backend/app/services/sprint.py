import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project_member import ProjectRole
from app.models.sprint import Sprint
from app.repositories.project import ProjectRepository
from app.repositories.sprint import SprintRepository
from app.schemas.sprint import (
    SprintCreate,
    SprintUpdate,
)


class SprintService:

    def __init__(self, db: Session):
        self.db = db

        self.sprint_repository = SprintRepository(db)
        self.project_repository = ProjectRepository(db)


    def _get_project(
        self,
        project_id: uuid.UUID,
    ):
        project = self.project_repository.get(
            project_id
        )

        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        return project


    def _is_admin(
        self,
        current_user,
    ) -> bool:

        return current_user.role.value == "ADMIN"

    def _get_membership(
        self,
        project_id: uuid.UUID,
        current_user,
    ):
        membership = self.project_repository.membership(
            project_id=project_id,
            user_id=current_user.id,
        )

        return membership


    def _check_can_view(
        self,
        project_id: uuid.UUID,
        current_user,
    ) -> None:

        if self._is_admin(current_user):
            return

        membership = self._get_membership(
            project_id,
            current_user,
        )

        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You must be a member of this "
                    "project to view sprints"
                ),
            )



    def _check_can_manage(
        self,
        project_id: uuid.UUID,
        current_user,
    ) -> None:

        if self._is_admin(current_user):
            return

        membership = self._get_membership(
            project_id,
            current_user,
        )

        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You are not a member of this project"
                ),
            )

        if membership.project_role not in (
            ProjectRole.OWNER,
            ProjectRole.MANAGER,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Only project OWNER or MANAGER "
                    "can manage sprints"
                ),
            )


    def list_by_project(
        self,
        project_id: uuid.UUID,
        current_user,
    ) -> list[Sprint]:

        self._get_project(project_id)

        self._check_can_view(
            project_id,
            current_user,
        )

        return self.sprint_repository.list_by_project(
            project_id
        )


    def create(
        self,
        project_id: uuid.UUID,
        data: SprintCreate,
        current_user,
    ) -> Sprint:

        self._get_project(project_id)

        self._check_can_manage(
            project_id,
            current_user,
        )


        if data.status == "ACTIVE":

            active_sprint = (
                self.sprint_repository
                .get_active_by_project(
                    project_id
                )
            )

            if active_sprint is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "This project already has "
                        "an ACTIVE sprint"
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

        self.sprint_repository.create(
            sprint
        )

        self.db.commit()
        self.db.refresh(sprint)

        return sprint


    def get(
        self,
        sprint_id: uuid.UUID,
        current_user,
    ) -> Sprint:

        sprint = self.sprint_repository.get(
            sprint_id
        )

        if sprint is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sprint not found",
            )

        self._check_can_view(
            sprint.project_id,
            current_user,
        )

        return sprint

    def update(
        self,
        sprint_id: uuid.UUID,
        data: SprintUpdate,
        current_user,
    ) -> Sprint:

        sprint = self.sprint_repository.get(
            sprint_id
        )

        if sprint is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sprint not found",
            )

        self._check_can_manage(
            sprint.project_id,
            current_user,
        )

        # Không sửa sprint đã đóng
        if sprint.status == "CLOSED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Cannot update a CLOSED sprint"
                ),
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "end_date must be greater than "
                    "start_date"
                ),
            )


        for field, value in update_data.items():
            setattr(
                sprint,
                field,
                value,
            )

        self.sprint_repository.update(
            sprint
        )

        self.db.commit()
        self.db.refresh(sprint)

        return sprint


    def close(
        self,
        sprint_id: uuid.UUID,
        current_user,
    ) -> Sprint:

        sprint = self.sprint_repository.get(
            sprint_id
        )

        if sprint is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sprint not found",
            )

        self._check_can_manage(
            sprint.project_id,
            current_user,
        )

        if sprint.status == "CLOSED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sprint is already CLOSED",
            )

        if sprint.status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Only ACTIVE sprint "
                    "can be closed"
                ),
            )

        sprint.status = "CLOSED"

        self.sprint_repository.update(
            sprint
        )

        self.db.commit()
        self.db.refresh(sprint)

        return sprint


    def delete(
        self,
        sprint_id: uuid.UUID,
        current_user,
    ) -> None:

        sprint = self.sprint_repository.get(
            sprint_id
        )

        if sprint is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sprint not found",
            )

        self._check_can_manage(
            sprint.project_id,
            current_user,
        )


        if sprint.status == "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Cannot delete an ACTIVE sprint"
                ),
            )


        if self.sprint_repository.has_tasks(
            sprint_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Cannot delete sprint because "
                    "it already has tasks"
                ),
            )

        self.sprint_repository.delete(
            sprint
        )

        self.db.commit()