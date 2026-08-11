import uuid

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.repositories.task import TaskRepository
from app.schemas.task import TaskMoveRequest, TaskResponse
from app.services.project import ProjectService
from app.services.task import TaskService

router = APIRouter(
    tags=["Tasks"],
)


@router.get(
    "/projects/{project_id}/tasks",
    response_model=list[TaskResponse],
)
def list_project_tasks(
    project_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    status: str | None = Query(
        default=None,
        description="Lọc theo trạng thái: TODO, IN_PROGRESS, REVIEW, DONE.",
    ),
) -> list[TaskResponse]:
    """
    Danh sách task của một dự án.
    """
    ProjectService(db).require_member(project_id, current_user)

    repository = TaskRepository(db)

    tasks = repository.list_by_project(
        project_id,
        status=status,
        limit=200,
    )

    counts = repository.comment_counts(project_id)

    return [
        TaskResponse.model_validate(task).model_copy(
            update={"comments_count": counts.get(task.id, 0)}
        )
        for task in tasks
    ]


@router.patch(
    "/tasks/{task_id}/move",
    response_model=TaskResponse,
)
def move_task(
    task_id: uuid.UUID,
    payload: TaskMoveRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> TaskResponse:
    """
    Chuyển task sang cột khác trên bảng Kanban (US-13).

    Trả về task sau khi đổi để frontend đồng bộ lại thẻ vừa kéo thay vì
    chỉ tin vào optimistic update của mình.
    """
    task = TaskService(db).move(task_id, payload, current_user)

    return TaskResponse.model_validate(task).model_copy(
        update={"comments_count": TaskRepository(db).count_comments(task.id)}
    )
