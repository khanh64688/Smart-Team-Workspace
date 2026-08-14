import uuid

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.comment import (
    CommentCreate,
    CommentOut,
    CommentUpdate,
)
from app.services.comment import CommentService


router = APIRouter(
    tags=["Comments"],
)


@router.get(
    "/tasks/{task_id}/comments",
    response_model=list[CommentOut],
    status_code=status.HTTP_200_OK,
)
def get_comments(
    task_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    service = CommentService(db)

    return service.get_comments(
        task_id=task_id,
        actor=current_user,
    )


@router.post(
    "/tasks/{task_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    task_id: uuid.UUID,
    payload: CommentCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    service = CommentService(db)

    return service.create(
        task_id=task_id,
        payload=payload,
        actor=current_user,
    )


@router.put(
    "/comments/{comment_id}",
    response_model=CommentOut,
    status_code=status.HTTP_200_OK,
)
def update_comment(
    comment_id: uuid.UUID,
    payload: CommentUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    service = CommentService(db)

    return service.update(
        comment_id=comment_id,
        payload=payload,
        actor=current_user,
    )


@router.delete(
    "/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_comment(
    comment_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    service = CommentService(db)

    service.delete(
        comment_id=comment_id,
        actor=current_user,
    )

    return None