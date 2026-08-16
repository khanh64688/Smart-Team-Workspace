import uuid

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.notification import (
    MarkAllReadOut,
    NotificationOut,
    UnreadCountOut,
)
from app.services.notification import (
    DEFAULT_LIMIT,
    MAX_LIMIT,
    NotificationService,
)


router = APIRouter(
    tags=["Notifications"],
)


@router.get(
    "/notifications",
    response_model=list[NotificationOut],
    status_code=status.HTTP_200_OK,
)
def list_notifications(
    db: DbSession,
    current_user: CurrentUser,
    unread_only: bool = Query(
        False,
        description="Chỉ lấy thông báo chưa đọc.",
    ),
    limit: int = Query(
        DEFAULT_LIMIT,
        ge=1,
        le=MAX_LIMIT,
        description="Số thông báo tối đa trả về.",
    ),
):
    """
    Danh sách thông báo của người dùng hiện tại, mới nhất trước.

    Frontend gọi định kỳ 30 giây (polling, không dùng WebSocket).
    """

    service = NotificationService(db)

    return service.list_for_user(
        actor=current_user,
        unread_only=unread_only,
        limit=limit,
    )


@router.get(
    "/notifications/unread-count",
    response_model=UnreadCountOut,
    status_code=status.HTTP_200_OK,
)
def count_unread_notifications(
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Số thông báo chưa đọc, dùng cho badge trên chuông ở header.
    """

    service = NotificationService(db)

    return UnreadCountOut(
        unread_count=service.count_unread(current_user)
    )


@router.patch(
    "/notifications/{notification_id}/read",
    response_model=NotificationOut,
    status_code=status.HTTP_200_OK,
)
def mark_notification_read(
    notification_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Đánh dấu một thông báo là đã đọc.
    """

    service = NotificationService(db)

    return service.mark_read(
        notification_id=notification_id,
        actor=current_user,
    )


@router.post(
    "/notifications/read-all",
    response_model=MarkAllReadOut,
    status_code=status.HTTP_200_OK,
)
def mark_all_notifications_read(
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc.
    """

    service = NotificationService(db)

    return MarkAllReadOut(
        marked=service.mark_all_read(current_user)
    )
