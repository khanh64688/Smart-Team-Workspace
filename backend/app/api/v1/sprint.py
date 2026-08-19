import uuid

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.sprint import (
    SprintCreate,
    SprintOut,
    SprintUpdate,
)
from app.services.sprint import SprintService

router = APIRouter(
    tags=["Sprints"],
)

@router.get(
    "/projects/{project_id}/sprints",
    response_model=list[SprintOut],
)
def get_project_sprints(
    project_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    service = SprintService(db)

    return service.list_by_project(
        project_id=project_id,
        current_user=current_user,
    )


@router.post(
    "/projects/{project_id}/sprints",
    response_model=SprintOut,
    status_code=status.HTTP_201_CREATED,
)
def create_sprint(
    project_id: uuid.UUID,
    data: SprintCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    service = SprintService(db)

    return service.create(
        project_id=project_id,
        data=data,
        current_user=current_user,
    )


@router.put(
    "/sprints/{sprint_id}",
    response_model=SprintOut,
)
def update_sprint(
    sprint_id: uuid.UUID,
    data: SprintUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    service = SprintService(db)

    return service.update(
        sprint_id=sprint_id,
        data=data,
        current_user=current_user,
    )


@router.patch(
    "/sprints/{sprint_id}/close",
    response_model=SprintOut,
)
def close_sprint(
    sprint_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    service = SprintService(db)

    return service.close(
        sprint_id=sprint_id,
        current_user=current_user,
    )



@router.delete(
    "/sprints/{sprint_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_sprint(
    sprint_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    service = SprintService(db)

    service.delete(
        sprint_id=sprint_id,
        current_user=current_user,
    )

    return None