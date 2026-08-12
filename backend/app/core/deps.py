from __future__ import annotations

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.orm import Session

from app.core.exceptions import (
    ForbiddenError,
    UnauthorizedError,
)
from app.core.security import (
    TokenExpiredError,
    TokenInvalidError,
    TokenTypeError,
    decode_token,
)
from app.database import get_db
from app.models import User, UserRole
from app.repositories import UserRepository


# Khai báo cơ chế xác thực Bearer token cho FastAPI và Swagger.
#
# auto_error=False rất quan trọng:
# - Nếu không có Authorization header, FastAPI trả về None.
# - get_current_user sẽ chủ động tạo lỗi 401 theo chuẩn của dự án.
#
# Nếu để auto_error=True, HTTPBearer có thể tự trả lỗi trước khi
# get_current_user xử lý, khiến format lỗi không thống nhất.
_bearer_scheme = HTTPBearer(
    auto_error=False,
    scheme_name="BearerAuth",
    description="Nhập access token JWT.",
)


# Type alias cho database session.
#
# Khi dùng DbSession trong route hoặc dependency, FastAPI sẽ gọi get_db()
# và tự đóng session sau khi request kết thúc.
DbSession = Annotated[
    Session,
    Depends(get_db),
]


# Kiểu dữ liệu nhận được sau khi HTTPBearer đọc Authorization header.
#
# Giá trị có thể là None vì _bearer_scheme dùng auto_error=False.
BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(_bearer_scheme),
]


def get_current_user(
    credentials: BearerCredentials,
    db: DbSession,
) -> User:
    """
    Xác thực access token và trả về user hiện tại.

    Quy trình:
    1. Kiểm tra request có Bearer token hay không.
    2. Giải mã JWT và chỉ chấp nhận access token.
    3. Lấy user_id từ claim sub.
    4. Tìm lại user trong database.
    5. Kiểm tra tài khoản còn hoạt động.
    6. Trả về đối tượng User.

    Lưu ý:
    - Không dùng role trong JWT để phân quyền trực tiếp.
    - Role hiện tại trong database mới là nguồn dữ liệu chính xác.
    """

    if credentials is None:
        raise UnauthorizedError(
            code="AUTH_CREDENTIALS_REQUIRED",
            message="Bạn cần đăng nhập để thực hiện hành động này.",
        )

    access_token = credentials.credentials

    try:
        decoded_token = decode_token(
            access_token,
            expected_type="access",
        )

    except TokenExpiredError as exc:
        raise UnauthorizedError(
            code="AUTH_ACCESS_TOKEN_EXPIRED",
            message="Access token đã hết hạn.",
        ) from exc

    except (TokenInvalidError, TokenTypeError) as exc:
        raise UnauthorizedError(
            code="AUTH_ACCESS_TOKEN_INVALID",
            message="Access token không hợp lệ.",
        ) from exc

    user = UserRepository(db).get_by_id(
        decoded_token.user_id
    )

    # Token có chữ ký hợp lệ nhưng user có thể đã bị xóa khỏi database.
    # Trường hợp này vẫn là lỗi xác thực 401, không phải 404.
    if user is None:
        raise UnauthorizedError(
            code="AUTH_ACCESS_TOKEN_INVALID",
            message="Access token không hợp lệ.",
        )

    # Tài khoản có thể bị khóa sau khi access token đã được cấp.
    # Vì luôn đọc lại user từ DB nên việc khóa có hiệu lực ngay.
    if not user.is_active:
        raise ForbiddenError(
            code="AUTH_ACCOUNT_INACTIVE",
            message="Tài khoản đã bị khóa.",
        )

    return user


# Dependency dùng cho mọi endpoint chỉ cần người dùng đã đăng nhập.
#
# Ví dụ:
#     def get_me(current_user: CurrentUser):
#         ...
CurrentUser = Annotated[
    User,
    Depends(get_current_user),
]


def require_role(
    *allowed_roles: UserRole,
) -> Callable[..., User]:
    """
    Tạo dependency kiểm tra vai trò hệ thống.

    Ví dụ:
        require_role(UserRole.ADMIN)

        require_role(
            UserRole.ADMIN,
            UserRole.PM,
        )

    Dependency trả lại current_user để route có thể tiếp tục
    dùng current_user.id, current_user.role...
    """

    if not allowed_roles:
        raise ValueError(
            "require_role cần ít nhất một UserRole."
        )

    allowed_role_set = frozenset(allowed_roles)

    def role_checker(
        current_user: CurrentUser,
    ) -> User:
        if current_user.role not in allowed_role_set:
            raise ForbiddenError(
                code="AUTH_INSUFFICIENT_ROLE",
                message="Bạn không có quyền thực hiện hành động này.",
                details={
                    "current_role": current_user.role.value,
                    "required_roles": sorted(
                        role.value
                        for role in allowed_role_set
                    ),
                },
            )

        return current_user

    return role_checker


__all__ = [
    "CurrentUser",
    "DbSession",
    "get_current_user",
    "require_role",
]
