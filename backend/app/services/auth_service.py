from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
)
from app.core.security import (
    DecodedToken,
    TokenExpiredError,
    TokenInvalidError,
    TokenTypeError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import User, UserRole
from app.repositories import (
    RefreshTokenRepository,
    UserRepository,
)


@dataclass(frozen=True, slots=True)
class TokenPair:
    access_token: str
    refresh_token: str
    token_type: str
    access_expires_at: datetime
    refresh_expires_at: datetime


@dataclass(frozen=True, slots=True)
class LoginResult:
    user: User
    tokens: TokenPair


@dataclass(frozen=True, slots=True)
class AccessTokenResult:
    access_token: str
    token_type: str
    expires_at: datetime


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.refresh_tokens = RefreshTokenRepository(db)

    def _create_user_account(
        self,
        *,
        email: str,
        full_name: str,
        password: str,
        role: UserRole,
        is_active: bool = True,
        duplicate_error_code: str,
    ) -> User:
        """
        Logic dùng chung để tạo tài khoản.

        Có thể được gọi từ:
        - register công khai;
        - ADMIN tạo user.
        """
        normalized_email = UserRepository.normalize_email(email)
        normalized_name = full_name.strip()

        if not normalized_name:
            raise BadRequestError(
                code="USER_FULL_NAME_REQUIRED",
                message="Họ tên không được để trống.",
            )

        self._validate_password_policy(password)

        if self.users.exists_by_email(normalized_email):
            raise ConflictError(
                code=duplicate_error_code,
                message="Email đã được sử dụng.",
                details={"email": normalized_email},
            )

        password_hash = hash_password(password)

        try:
            user = self.users.create(
                email=normalized_email,
                full_name=normalized_name,
                password_hash=password_hash,
                role=role,
                is_active=is_active,
            )

            self.db.commit()

            return user

        except IntegrityError as exc:
            self.db.rollback()

            raise ConflictError(
                code=duplicate_error_code,
                message="Email đã được sử dụng.",
                details={"email": normalized_email},
            ) from exc

        except Exception:
            self.db.rollback()
            raise

    def create_user_by_admin(
        self,
        *,
        email: str,
        full_name: str,
        password: str,
        role: UserRole,
        is_active: bool = True,
    ) -> User:
        """
        Tạo tài khoản bởi ADMIN.

        Việc xác minh người gọi có phải ADMIN không thuộc route dependency.
        Service này chỉ xử lý nghiệp vụ tạo tài khoản.
        """
        return self._create_user_account(
            email=email,
            full_name=full_name,
            password=password,
            role=role,
            is_active=is_active,
            duplicate_error_code="USER_EMAIL_ALREADY_EXISTS",
        )

    def register(
        self,
        *,
        email: str,
        full_name: str,
        password: str,
    ) -> User:
        """
        Đăng ký một tài khoản MEMBER mới.
        """
        return self._create_user_account(
            email=email,
            full_name=full_name,
            password=password,
            role=UserRole.MEMBER,
            is_active=True,
            duplicate_error_code="AUTH_EMAIL_ALREADY_EXISTS",
        )

    def login(
        self,
        *,
        email: str,
        password: str,
    ) -> LoginResult:
        """
        Xác thực user và tạo access/refresh token.
        """
        user = self.users.get_by_email(email)

        # Không phân biệt email không tồn tại và mật khẩu sai.
        if user is None or not verify_password(
            password,
            user.password_hash,
        ):
            raise UnauthorizedError(
                code="AUTH_INVALID_CREDENTIALS",
                message="Email hoặc mật khẩu không đúng.",
            )

        if not user.is_active:
            raise ForbiddenError(
                code="AUTH_ACCOUNT_INACTIVE",
                message="Tài khoản đã bị khóa.",
            )

        access = create_access_token(
            user_id=user.id,
            role=user.role,
        )

        refresh = create_refresh_token(
            user_id=user.id,
            role=user.role,
        )

        try:
            self.refresh_tokens.create(
                jti=refresh.jti,
                user_id=user.id,
                expires_at=refresh.expires_at,
            )

            self.db.commit()

        except Exception:
            self.db.rollback()
            raise

        return LoginResult(
            user=user,
            tokens=TokenPair(
                access_token=access.token,
                refresh_token=refresh.token,
                token_type="bearer",
                access_expires_at=access.expires_at,
                refresh_expires_at=refresh.expires_at,
            ),
        )

    def refresh_access_token(
        self,
        refresh_token: str,
    ) -> AccessTokenResult:
        """
        Dùng refresh token hợp lệ để cấp access token mới.
        """
        decoded = self._decode_refresh_token(refresh_token)

        stored_token = self.refresh_tokens.get_active_by_jti(
            decoded.jti
        )

        if stored_token is None:
            raise UnauthorizedError(
                code="AUTH_REFRESH_TOKEN_REVOKED",
                message="Refresh token không hợp lệ hoặc đã bị thu hồi.",
            )

        if stored_token.user_id != decoded.user_id:
            raise UnauthorizedError(
                code="AUTH_REFRESH_TOKEN_INVALID",
                message="Refresh token không hợp lệ.",
            )

        user = self.users.get_by_id(decoded.user_id)

        if user is None:
            raise UnauthorizedError(
                code="AUTH_REFRESH_TOKEN_INVALID",
                message="Refresh token không hợp lệ.",
            )

        if not user.is_active:
            raise ForbiddenError(
                code="AUTH_ACCOUNT_INACTIVE",
                message="Tài khoản đã bị khóa.",
            )

        # Phải lấy role mới nhất từ database.
        access = create_access_token(
            user_id=user.id,
            role=user.role,
        )

        return AccessTokenResult(
            access_token=access.token,
            token_type="bearer",
            expires_at=access.expires_at,
        )

    def logout(
        self,
        refresh_token: str,
    ) -> None:
        """
        Thu hồi refresh token của một phiên đăng nhập.
        """
        decoded = self._decode_refresh_token(refresh_token)

        stored_token = self.refresh_tokens.get_active_by_jti(
            decoded.jti
        )

        if stored_token is None:
            raise UnauthorizedError(
                code="AUTH_REFRESH_TOKEN_REVOKED",
                message="Refresh token không hợp lệ hoặc đã bị thu hồi.",
            )

        if stored_token.user_id != decoded.user_id:
            raise UnauthorizedError(
                code="AUTH_REFRESH_TOKEN_INVALID",
                message="Refresh token không hợp lệ.",
            )

        try:
            self.refresh_tokens.revoke(stored_token)
            self.db.commit()

        except Exception:
            self.db.rollback()
            raise

    def change_password(
        self,
        *,
        user_id: uuid.UUID,
        current_password: str,
        new_password: str,
    ) -> None:
        """
        Đổi mật khẩu và đăng xuất tất cả các phiên.
        """
        user = self.users.get_by_id(user_id)

        if user is None:
            raise NotFoundError(
                code="USER_NOT_FOUND",
                message="Không tìm thấy người dùng.",
            )

        if not verify_password(
            current_password,
            user.password_hash,
        ):
            raise BadRequestError(
                code="AUTH_CURRENT_PASSWORD_INCORRECT",
                message="Mật khẩu hiện tại không đúng.",
            )

        if verify_password(
            new_password,
            user.password_hash,
        ):
            raise BadRequestError(
                code="AUTH_NEW_PASSWORD_SAME_AS_OLD",
                message="Mật khẩu mới phải khác mật khẩu hiện tại.",
            )

        self._validate_password_policy(new_password)

        new_password_hash = hash_password(new_password)

        try:
            self.users.update_password_hash(
                user,
                password_hash=new_password_hash,
            )

            self.refresh_tokens.revoke_all_by_user_id(
                user.id
            )

            self.db.commit()

        except Exception:
            self.db.rollback()
            raise

    @staticmethod
    def _validate_password_policy(password: str) -> None:
        """
        Service kiểm tra lại để bảo vệ các lời gọi
        không đi qua Pydantic schema.
        """
        if len(password) < 8:
            raise BadRequestError(
                code="AUTH_PASSWORD_TOO_SHORT",
                message="Mật khẩu phải có ít nhất 8 ký tự.",
            )

        if not any(character.isalpha() for character in password):
            raise BadRequestError(
                code="AUTH_PASSWORD_REQUIRES_LETTER",
                message="Mật khẩu phải có ít nhất một chữ cái.",
            )

        if not any(character.isdigit() for character in password):
            raise BadRequestError(
                code="AUTH_PASSWORD_REQUIRES_NUMBER",
                message="Mật khẩu phải có ít nhất một chữ số.",
            )

    @staticmethod
    def _decode_refresh_token(
        refresh_token: str,
    ) -> DecodedToken:
        try:
            return decode_token(
                refresh_token,
                expected_type="refresh",
            )

        except TokenExpiredError as exc:
            raise UnauthorizedError(
                code="AUTH_REFRESH_TOKEN_EXPIRED",
                message="Refresh token đã hết hạn.",
            ) from exc

        except (TokenInvalidError, TokenTypeError) as exc:
            raise UnauthorizedError(
                code="AUTH_REFRESH_TOKEN_INVALID",
                message="Refresh token không hợp lệ.",
            ) from exc