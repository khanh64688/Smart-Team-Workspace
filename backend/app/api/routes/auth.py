from __future__ import annotations

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.auth import (
    AccessTokenResponse,
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenPairResponse,
)
from app.schemas.common import (
    ErrorResponse,
    MessageResponse,
)
from app.schemas.user import UserResponse
from app.services import AuthService


router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản",
    responses={
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
def register(
    payload: RegisterRequest,
    db: DbSession,
) -> UserResponse:
    """
    Đăng ký tài khoản mới.

    Tài khoản mới luôn có role MEMBER.
    """
    user = AuthService(db).register(
        email=str(payload.email),
        full_name=payload.full_name,
        password=payload.password,
    )

    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=TokenPairResponse,
    summary="Đăng nhập",
    responses={
        401: {
            "model": ErrorResponse,
            "description": "Sai email hoặc mật khẩu.",
        },
        403: {
            "model": ErrorResponse,
            "description": "Tài khoản bị khóa.",
        },
        422: {
            "model": ErrorResponse,
            "description": "Dữ liệu không hợp lệ.",
        },
    },
)
def login(
    payload: LoginRequest,
    db: DbSession,
) -> TokenPairResponse:
    """
    Đăng nhập và nhận access token cùng refresh token.
    """
    result = AuthService(db).login(
        email=str(payload.email),
        password=payload.password,
    )

    return TokenPairResponse(
        access_token=result.tokens.access_token,
        refresh_token=result.tokens.refresh_token,
        token_type=result.tokens.token_type,
        user=UserResponse.model_validate(
            result.user
        ),
    )


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    summary="Làm mới access token",
    responses={
        401: {
            "model": ErrorResponse,
            "description": (
                "Refresh token không hợp lệ, hết hạn "
                "hoặc đã bị thu hồi."
            ),
        },
        403: {
            "model": ErrorResponse,
            "description": "Tài khoản bị khóa.",
        },
    },
)
def refresh_access_token(
    payload: RefreshTokenRequest,
    db: DbSession,
) -> AccessTokenResponse:
    """
    Dùng refresh token để cấp access token mới.
    """
    result = AuthService(db).refresh_access_token(
        payload.refresh_token
    )

    return AccessTokenResponse(
        access_token=result.access_token,
        token_type=result.token_type,
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Đăng xuất",
    responses={
        401: {
            "model": ErrorResponse,
            "description": (
                "Refresh token không hợp lệ hoặc "
                "đã bị thu hồi."
            ),
        },
    },
)
def logout(
    payload: LogoutRequest,
    db: DbSession,
) -> MessageResponse:
    """
    Thu hồi refresh token của phiên hiện tại.
    """
    AuthService(db).logout(
        payload.refresh_token
    )

    return MessageResponse(
        message="Đăng xuất thành công.",
    )


@router.put(
    "/change-password",
    response_model=MessageResponse,
    summary="Đổi mật khẩu",
    responses={
        400: {
            "model": ErrorResponse,
            "description": (
                "Mật khẩu hiện tại sai hoặc mật khẩu mới "
                "không hợp lệ."
            ),
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
def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """
    Đổi mật khẩu của user hiện tại.

    Đổi mật khẩu thành công sẽ thu hồi toàn bộ refresh token.
    """
    AuthService(db).change_password(
        user_id=current_user.id,
        current_password=payload.old_password,
        new_password=payload.new_password,
    )

    return MessageResponse(
        message=(
            "Đổi mật khẩu thành công. "
            "Vui lòng đăng nhập lại trên các thiết bị."
        ),
    )