from __future__ import annotations

from typing import Annotated, Any

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.schemas.common import MessageResponse, StrictRequest
from app.schemas.user import UserResponse


PasswordValue = Annotated[
    str,
    StringConstraints(
        min_length=8,
        max_length=128,
    ),
]


def validate_password_strength(password: str) -> str:
    """
    Mật khẩu hợp lệ phải:
    - Có ít nhất 8 ký tự.
    - Có ít nhất một chữ cái.
    - Có ít nhất một chữ số.
    """

    has_letter = any(
        character.isalpha()
        for character in password
    )

    has_digit = any(
        character.isdigit()
        for character in password
    )

    if not has_letter:
        raise ValueError(
            "Mật khẩu phải chứa ít nhất một chữ cái."
        )

    if not has_digit:
        raise ValueError(
            "Mật khẩu phải chứa ít nhất một chữ số."
        )

    return password


class RegisterRequest(StrictRequest):
    """
    Dữ liệu đăng ký tài khoản.

    Không có field role vì tài khoản mới luôn được tạo
    với role mặc định là MEMBER.
    """

    email: EmailStr

    full_name: str = Field(
        min_length=1,
        max_length=255,
    )

    password: PasswordValue

    confirm_password: str = Field(
        min_length=1,
        max_length=128,
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower()

        return value

    @field_validator("full_name", mode="before")
    @classmethod
    def normalize_full_name(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()

        return value

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def validate_password_confirmation(
        self,
    ) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError(
                "Mật khẩu xác nhận không khớp."
            )

        return self


class LoginRequest(StrictRequest):
    """
    Dữ liệu đăng nhập.
    """

    email: EmailStr

    password: str = Field(
        min_length=1,
        max_length=128,
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower()

        return value


class RefreshTokenRequest(StrictRequest):
    """
    Dữ liệu dùng để cấp access token mới.
    """

    refresh_token: str = Field(
        min_length=1,
        max_length=4096,
    )


class LogoutRequest(StrictRequest):
    """
    Dữ liệu dùng để thu hồi refresh token khi đăng xuất.
    """

    refresh_token: str = Field(
        min_length=1,
        max_length=4096,
    )


class ChangePasswordRequest(StrictRequest):
    """
    Dữ liệu đổi mật khẩu.

    Việc kiểm tra:
    - mật khẩu cũ có đúng không;
    - mật khẩu mới có giống mật khẩu cũ không;

    sẽ được thực hiện ở AuthService vì các kiểm tra đó
    cần password hash và phải trả mã HTTP 400.
    """

    old_password: str = Field(
        min_length=1,
        max_length=128,
    )

    new_password: PasswordValue

    @field_validator("new_password")
    @classmethod
    def check_new_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class TokenPairResponse(BaseModel):
    """
    Response khi đăng nhập thành công.
    """

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class AccessTokenResponse(BaseModel):
    """
    Response khi làm mới access token.
    """

    access_token: str
    token_type: str = "bearer"