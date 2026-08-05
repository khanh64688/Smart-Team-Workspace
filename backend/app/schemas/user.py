from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.models.user import UserRole
from app.schemas.common import (
    PaginationMeta,
    StrictRequest,
)


class UserResponse(BaseModel):
    """
    Thông tin người dùng đầy đủ được trả về từ API.

    Không bao gồm:
    - password_hash
    - refresh_tokens
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    avatar: str | None
    created_at: datetime
    updated_at: datetime


class UserPublicResponse(BaseModel):
    """
    Thông tin công khai của người dùng.

    MEMBER tìm kiếm người dùng khác chỉ được thấy:
    - id
    - full_name
    - avatar
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    avatar: str | None


class UserSearchResponse(BaseModel):
    """
    Kết quả tìm kiếm người dùng dành cho ADMIN hoặc PM
    khi có đủ quyền xem email.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    avatar: str | None


UserListItemResponse = (
    UserSearchResponse | UserPublicResponse
)


class UserListResponse(BaseModel):
    data: list[UserListItemResponse]
    meta: PaginationMeta


class UserUpdateRequest(StrictRequest):
    """
    Người dùng tự cập nhật hồ sơ.

    Không cho phép tự cập nhật:
    - role
    - is_active
    - password_hash
    """

    full_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    avatar: str | None = Field(
        default=None,
        max_length=500,
    )

    @field_validator("full_name", mode="before")
    @classmethod
    def normalize_full_name(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()

        return value

    @field_validator("avatar", mode="before")
    @classmethod
    def normalize_avatar(cls, value: Any) -> Any:
        if isinstance(value, str):
            normalized_value = value.strip()
            return normalized_value or None

        return value

    @model_validator(mode="after")
    def require_update_field(self) -> "UserUpdateRequest":
        if not self.model_fields_set:
            raise ValueError(
                "Phải cung cấp ít nhất một trường cần cập nhật."
            )

        if (
            "full_name" in self.model_fields_set
            and self.full_name is None
        ):
            raise ValueError("full_name không được là null.")

        return self


class UserRoleUpdateRequest(StrictRequest):
    """
    ADMIN dùng để thay đổi vai trò hệ thống của người dùng.
    """

    role: UserRole


class UserActiveUpdateRequest(StrictRequest):
    """
    ADMIN dùng để khoá hoặc mở khoá tài khoản.
    """

    is_active: bool