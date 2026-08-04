from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Literal, cast

import jwt
from jwt import ExpiredSignatureError
from jwt import InvalidTokenError as PyJWTInvalidTokenError
from pwdlib import PasswordHash

from app.core.config import settings


TokenType = Literal["access", "refresh"]


# PasswordHash.recommended() hiện sử dụng Argon2.
_password_hash = PasswordHash.recommended()


class SecurityError(Exception):
    """Lỗi cơ sở của các hàm bảo mật."""


class TokenExpiredError(SecurityError):
    """Token đã hết hạn."""


class TokenInvalidError(SecurityError):
    """Token sai chữ ký, sai cấu trúc hoặc thiếu claim bắt buộc."""


class TokenTypeError(SecurityError):
    """Loại token không đúng với loại token endpoint yêu cầu."""


@dataclass(frozen=True, slots=True)
class EncodedToken:
    """
    Kết quả sau khi tạo JWT.

    token:
        Chuỗi JWT gửi về client.

    jti:
        Mã định danh duy nhất của token.
        Refresh token sẽ lưu giá trị này vào database.

    expires_at:
        Thời điểm token hết hạn, sử dụng UTC.
    """

    token: str
    jti: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class DecodedToken:
    """Các claim đã được kiểm tra và chuyển về kiểu dữ liệu Python."""

    user_id: uuid.UUID
    role: str
    token_type: TokenType
    jti: str
    issued_at: datetime
    expires_at: datetime


def hash_password(plain_password: str) -> str:
    """
    Hash mật khẩu bằng Argon2.

    Hàm này chỉ chịu trách nhiệm hash.
    Việc kiểm tra mật khẩu có đủ 8 ký tự, có chữ và số
    thuộc trách nhiệm của Pydantic schema.
    """
    return _password_hash.hash(plain_password)


def verify_password(
    plain_password: str,
    password_hash: str,
) -> bool:
    """
    Kiểm tra mật khẩu người dùng nhập có khớp với hash trong DB hay không.
    """
    return _password_hash.verify(
        plain_password,
        password_hash,
    )


def create_access_token(
    user_id: uuid.UUID | str,
    role: str | Enum,
    *,
    expires_delta: timedelta | None = None,
) -> EncodedToken:
    """
    Tạo access token.

    Mặc định hết hạn theo ACCESS_TOKEN_EXPIRE_MINUTES trong .env.
    """
    lifetime = (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )

    return _create_token(
        user_id=user_id,
        role=role,
        token_type="access",
        lifetime=lifetime,
    )


def create_refresh_token(
    user_id: uuid.UUID | str,
    role: str | Enum,
    *,
    expires_delta: timedelta | None = None,
) -> EncodedToken:
    """
    Tạo refresh token.

    Mặc định hết hạn theo REFRESH_TOKEN_EXPIRE_DAYS trong .env.
    """
    lifetime = (
        expires_delta
        if expires_delta is not None
        else timedelta(days=settings.refresh_token_expire_days)
    )

    return _create_token(
        user_id=user_id,
        role=role,
        token_type="refresh",
        lifetime=lifetime,
    )


def decode_token(
    token: str,
    *,
    expected_type: TokenType | None = None,
) -> DecodedToken:
    """
    Kiểm tra chữ ký, thời hạn và các claim bắt buộc của JWT.

    expected_type="access":
        Chỉ chấp nhận access token.

    expected_type="refresh":
        Chỉ chấp nhận refresh token.
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
            options={
                "require": [
                    "sub",
                    "role",
                    "type",
                    "jti",
                    "iat",
                    "exp",
                ],
            },
        )
    except ExpiredSignatureError as exc:
        raise TokenExpiredError("Token đã hết hạn.") from exc
    except PyJWTInvalidTokenError as exc:
        raise TokenInvalidError("Token không hợp lệ.") from exc

    raw_token_type = payload.get("type")

    if raw_token_type not in ("access", "refresh"):
        raise TokenInvalidError("Claim type của token không hợp lệ.")

    token_type = cast(TokenType, raw_token_type)

    if expected_type is not None and token_type != expected_type:
        raise TokenTypeError(
            f"Endpoint yêu cầu {expected_type} token, "
            f"nhưng nhận được {token_type} token."
        )

    try:
        user_id = uuid.UUID(str(payload["sub"]))
        role = payload["role"]
        jti = payload["jti"]

        issued_at = datetime.fromtimestamp(
            payload["iat"],
            tz=timezone.utc,
        )

        expires_at = datetime.fromtimestamp(
            payload["exp"],
            tz=timezone.utc,
        )
    except (
        KeyError,
        TypeError,
        ValueError,
        OverflowError,
    ) as exc:
        raise TokenInvalidError(
            "Các claim trong token không hợp lệ."
        ) from exc

    if not isinstance(role, str) or not role:
        raise TokenInvalidError(
            "Claim role trong token không hợp lệ."
        )

    if not isinstance(jti, str) or not jti:
        raise TokenInvalidError(
            "Claim jti trong token không hợp lệ."
        )

    return DecodedToken(
        user_id=user_id,
        role=role,
        token_type=token_type,
        jti=jti,
        issued_at=issued_at,
        expires_at=expires_at,
    )


def _create_token(
    *,
    user_id: uuid.UUID | str,
    role: str | Enum,
    token_type: TokenType,
    lifetime: timedelta,
) -> EncodedToken:
    """
    Hàm nội bộ dùng chung cho access token và refresh token.
    """
    now = datetime.now(timezone.utc)
    expires_at = now + lifetime
    jti = str(uuid.uuid4())

    # Bắt buộc sub là UUID hợp lệ và được lưu dưới dạng string.
    subject = str(uuid.UUID(str(user_id)))

    if isinstance(role, Enum):
        role_value = str(role.value)
    else:
        role_value = role

    if not role_value:
        raise ValueError("Role không được để trống.")

    payload = {
        "sub": subject,
        "role": role_value,
        "type": token_type,
        "jti": jti,
        "iat": now,
        "exp": expires_at,
    }

    token = jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return EncodedToken(
        token=token,
        jti=jti,
        expires_at=expires_at,
    )