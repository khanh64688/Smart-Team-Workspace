import uuid

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.task import (
    TaskAssign,
    TaskCreate,
    TaskMove,
    TaskResponse,
    TaskUpdate,
)
from app.services.task import TaskService


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)

@router.get(
    "",
    response_model=list[TaskResponse],
)
def list_tasks(
    project_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    service = TaskService(db)

    return service.list_tasks(
        project_id=project_id,
        actor=current_user,
    )

@router.get(
    "/{task_id}",
    response_model=TaskResponse,
)
def get_task(
    task_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    service = TaskService(db)

    return service.get(
        task_id=task_id,
        actor=current_user,
    )

@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    payload: TaskCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    service = TaskService(db)

    return service.create(
        payload=payload,
        actor=current_user,
    )

@router.put(
    "/{task_id}",
    response_model=TaskResponse,
)
def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    service = TaskService(db)

    return service.update(
        task_id=task_id,
        payload=payload,
        actor=current_user,
    )

@router.patch(
    "/{task_id}/assign",
    response_model=TaskResponse,
)
def assign_task(
    task_id: uuid.UUID,
    payload: TaskAssign,
    db: DbSession,
    current_user: CurrentUser,
):
    service = TaskService(db)

    return service.assign(
        task_id=task_id,
        payload=payload,
        actor=current_user,
    )

@router.patch(
    "/{task_id}/move",
    response_model=TaskResponse,
)
def move_task(
    task_id: uuid.UUID,
    payload: TaskMove,
    db: DbSession,
    current_user: CurrentUser,
):
    service = TaskService(db)

    return service.move(
        task_id=task_id,
        payload=payload,
        actor=current_user,
    )


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task(
    task_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    service = TaskService(db)

    service.delete(
        task_id=task_id,
        actor=current_user,
    )

    return None

