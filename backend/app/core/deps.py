from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import TokenExpiredError, TokenInvalidError, TokenTypeError, decode_token
from app.models import User, UserRole
from app.repositories import UserRepository


DbSession = Annotated[Session, Depends(get_db)]
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    db: DbSession,
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
) -> User:
    if not token:
        raise UnauthorizedError(
            code="AUTH_UNAUTHORIZED",
            message="Chưa đăng nhập hoặc thiếu Bearer token.",
        )

    try:
        decoded = decode_token(token, expected_type="access")
    except (TokenExpiredError, TokenInvalidError, TokenTypeError) as exc:
        raise UnauthorizedError(
            code="AUTH_INVALID_TOKEN",
            message="Token không hợp lệ hoặc đã hết hạn.",
        ) from exc

    user = UserRepository(db).get_by_id(decoded.user_id)
    if not user or not user.is_active:
        raise UnauthorizedError(
            code="AUTH_USER_INACTIVE",
            message="Tài khoản không tồn tại hoặc đã bị khóa.",
        )

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: str | UserRole):
    def role_checker(current_user: CurrentUser) -> User:
        user_role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        allowed = [r.value if hasattr(r, "value") else str(r) for r in roles]
        if user_role_val not in allowed:
            raise ForbiddenError(
                code="AUTH_FORBIDDEN",
                message="Bạn không có quyền thực hiện thao tác này.",
            )
        return current_user

    return role_checker
