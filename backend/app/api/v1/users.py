from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Query,
    status,
)

from app.core.deps import (
    CurrentUser,
    DbSession,
    require_role,
)
from app.models import User, UserRole
from app.schemas.common import (
    ErrorResponse,
    PaginationMeta,
)
from app.schemas.user import (
    AdminUserCreateRequest,
    UserActiveUpdateRequest,
    UserListResponse,
    UserPublicResponse,
    UserResponse,
    UserRoleUpdateRequest,
    UserSearchResponse,
    UserUpdateRequest,
)
from app.services import AuthService, UserService

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


AdminUser = Annotated[
    User,
    Depends(
        require_role(UserRole.ADMIN)
    ),
]


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin tạo tài khoản",
    responses={
        401: {
            "model": ErrorResponse,
            "description": "Chưa đăng nhập.",
        },
        403: {
            "model": ErrorResponse,
            "description": "Chỉ ADMIN được thực hiện.",
        },
        409: {
            "model": ErrorResponse,
            "description": "Email đã tồn tại.",
        },
        422: {
            "model": ErrorResponse,
            "description": "Dữ liệu không hợp lệ.",
        },
    },
)
def create_user_by_admin(
    payload: AdminUserCreateRequest,
    _current_admin: AdminUser,
    db: DbSession,
) -> UserResponse:
    """
    ADMIN tạo tài khoản mới và có thể chọn role ban đầu.
    """
    user = AuthService(db).create_user_by_admin(
        email=str(payload.email),
        full_name=payload.full_name,
        password=payload.password,
        role=payload.role,
        is_active=payload.is_active,
    )

    return UserResponse.model_validate(user)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Xem hồ sơ của tôi",
    responses={
        401: {
            "model": ErrorResponse,
            "description": "Chưa đăng nhập.",
        },
        403: {
            "model": ErrorResponse,
            "description": "Tài khoản bị khóa.",
        },
    },
)
def get_my_profile(
    current_user: CurrentUser,
) -> UserResponse:
    """
    Trả về thông tin user hiện tại.

    Không cần gọi lại UserService vì get_current_user
    đã tải user mới nhất từ database.
    """
    return UserResponse.model_validate(
        current_user
    )


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Cập nhật hồ sơ của tôi",
    responses={
        400: {
            "model": ErrorResponse,
            "description": "Dữ liệu cập nhật không hợp lệ.",
        },
        401: {
            "model": ErrorResponse,
            "description": "Chưa đăng nhập.",
        },
        403: {
            "model": ErrorResponse,
            "description": "Tài khoản bị khóa.",
        },
    },
)
def update_my_profile(
    payload: UserUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> UserResponse:
    """
    Cho phép cập nhật full_name và avatar.

    exclude_unset=True giúp phân biệt:
    - field không được gửi;
    - avatar được gửi rõ ràng với giá trị null để xóa avatar.
    """
    changes = payload.model_dump(
        exclude_unset=True
    )

    user = UserService(db).update_my_profile(
        user_id=current_user.id,
        changes=changes,
    )

    return UserResponse.model_validate(user)


@router.get(
    "",
    response_model=UserListResponse,
    summary="Tìm kiếm người dùng",
    responses={
        401: {
            "model": ErrorResponse,
            "description": "Chưa đăng nhập.",
        },
    },
)
def list_users(
    current_user: CurrentUser,
    db: DbSession,
    page: Annotated[
        int,
        Query(ge=1),
    ] = 1,
    size: Annotated[
        int,
        Query(ge=1, le=100),
    ] = 20,
    q: Annotated[
        str | None,
        Query(max_length=255),
    ] = None,
    role: Annotated[
        UserRole | None,
        Query(),
    ] = None,
    is_active: Annotated[
        bool | None,
        Query(),
    ] = None,
) -> UserListResponse:
    """
    Tìm kiếm user với phân trang.

    ADMIN và PM:
        Nhận email, role, is_active.

    MEMBER:
        Chỉ nhận id, full_name, avatar.
    """
    users, total = UserService(db).list_users(
        page=page,
        size=size,
        q=q,
        role=role,
        is_active=is_active,
    )

    if current_user.role == UserRole.MEMBER:
        response_data = [
            UserPublicResponse.model_validate(user)
            for user in users
        ]
    else:
        response_data = [
            UserSearchResponse.model_validate(user)
            for user in users
        ]

    return UserListResponse(
        data=response_data,
        meta=PaginationMeta(
            page=page,
            size=size,
            total=total,
        ),
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Xem chi tiết người dùng",
    responses={
        401: {
            "model": ErrorResponse,
            "description": "Chưa đăng nhập.",
        },
        403: {
            "model": ErrorResponse,
            "description": "Không đủ quyền.",
        },
        404: {
            "model": ErrorResponse,
            "description": "Không tìm thấy user.",
        },
    },
)
def get_user_detail(
    user_id: uuid.UUID,
    _current_admin: AdminUser,
    db: DbSession,
) -> UserResponse:
    """
    Hiện tại chỉ ADMIN được xem chi tiết user theo id.

    Quyền PM xem user trong dự án mình quản lý sẽ được bổ sung
    khi module Project cung cấp dependency kiểm tra project.
    """
    user = UserService(db).get_user(user_id)

    return UserResponse.model_validate(user)


@router.patch(
    "/{user_id}/role",
    response_model=UserResponse,
    summary="Đổi vai trò hệ thống",
    responses={
        400: {
            "model": ErrorResponse,
            "description": (
                "Admin đang cố tự hạ quyền chính mình."
            ),
        },
        401: {
            "model": ErrorResponse,
            "description": "Chưa đăng nhập.",
        },
        403: {
            "model": ErrorResponse,
            "description": "Chỉ ADMIN được thực hiện.",
        },
        404: {
            "model": ErrorResponse,
            "description": "Không tìm thấy user.",
        },
    },
)
def change_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdateRequest,
    current_admin: AdminUser,
    db: DbSession,
) -> UserResponse:
    """
    ADMIN thay đổi role hệ thống của user.
    """
    user = UserService(db).change_role(
        actor_id=current_admin.id,
        target_user_id=user_id,
        new_role=payload.role,
    )

    return UserResponse.model_validate(user)


@router.patch(
    "/{user_id}/active",
    response_model=UserResponse,
    summary="Khóa hoặc mở khóa tài khoản",
    responses={
        400: {
            "model": ErrorResponse,
            "description": (
                "Admin đang cố tự khóa chính mình."
            ),
        },
        401: {
            "model": ErrorResponse,
            "description": "Chưa đăng nhập.",
        },
        403: {
            "model": ErrorResponse,
            "description": "Chỉ ADMIN được thực hiện.",
        },
        404: {
            "model": ErrorResponse,
            "description": "Không tìm thấy user.",
        },
    },
)
def set_user_active(
    user_id: uuid.UUID,
    payload: UserActiveUpdateRequest,
    current_admin: AdminUser,
    db: DbSession,
) -> UserResponse:
    """
    ADMIN khóa hoặc mở khóa tài khoản.

    Khi khóa, UserService sẽ thu hồi toàn bộ refresh token.
    """
    user = UserService(db).set_active(
        actor_id=current_admin.id,
        target_user_id=user_id,
        is_active=payload.is_active,
    )

    return UserResponse.model_validate(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Xóa tài khoản",
    responses={
        400: {
            "model": ErrorResponse,
            "description": "Admin không thể tự xóa chính mình.",
        },
        401: {
            "model": ErrorResponse,
            "description": "Chưa đăng nhập.",
        },
        403: {
            "model": ErrorResponse,
            "description": "Chỉ ADMIN được thực hiện.",
        },
        404: {
            "model": ErrorResponse,
            "description": "Không tìm thấy user.",
        },
    },
)
def delete_user(
    user_id: uuid.UUID,
    current_admin: AdminUser,
    db: DbSession,
) -> None:
    """
    Soft-delete tài khoản.

    Không xóa record khỏi database.
    """
    UserService(db).soft_delete_user(
        actor_id=current_admin.id,
        target_user_id=user_id,
    )

    return None