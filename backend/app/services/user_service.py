from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestError,
    NotFoundError,
)
from app.models import User, UserRole
from app.repositories import (
    RefreshTokenRepository,
    UserRepository,
)


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.refresh_tokens = RefreshTokenRepository(db)

    def get_user(
        self,
        user_id: uuid.UUID,
    ) -> User:
        user = self.users.get_by_id(user_id)

        if user is None:
            raise NotFoundError(
                code="USER_NOT_FOUND",
                message="Không tìm thấy người dùng.",
                details={"user_id": str(user_id)},
            )

        return user

    def update_my_profile(
        self,
        *,
        user_id: uuid.UUID,
        changes: dict[str, Any],
    ) -> User:
        user = self.get_user(user_id)

        allowed_fields = {
            "full_name",
            "avatar",
        }

        invalid_fields = set(changes) - allowed_fields

        if invalid_fields:
            raise BadRequestError(
                code="USER_INVALID_UPDATE_FIELDS",
                message="Có trường không được phép cập nhật.",
                details={
                    "fields": sorted(invalid_fields),
                },
            )

        if "full_name" in changes:
            full_name = changes["full_name"]

            if (
                not isinstance(full_name, str)
                or not full_name.strip()
            ):
                raise BadRequestError(
                    code="USER_FULL_NAME_REQUIRED",
                    message="Họ tên không được để trống.",
                )

            changes["full_name"] = full_name.strip()

        if not changes:
            return user

        try:
            updated_user = self.users.update_profile(
                user,
                values=changes,
            )

            self.db.commit()

            return updated_user

        except ValueError as exc:
            self.db.rollback()

            raise BadRequestError(
                code="USER_INVALID_UPDATE_FIELDS",
                message=str(exc),
            ) from exc

        except Exception:
            self.db.rollback()
            raise

    def list_users(
        self,
        *,
        page: int = 1,
        size: int = 20,
        q: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        """
        Chuyển page/size của API thành offset/limit cho repository.
        """
        if page < 1:
            raise BadRequestError(
                code="PAGINATION_INVALID_PAGE",
                message="Page phải lớn hơn hoặc bằng 1.",
            )

        if size < 1 or size > 100:
            raise BadRequestError(
                code="PAGINATION_INVALID_SIZE",
                message="Size phải nằm trong khoảng từ 1 đến 100.",
            )

        offset = (page - 1) * size

        return self.users.list_users(
            q=q,
            role=role,
            is_active=is_active,
            offset=offset,
            limit=size,
        )

    def change_role(
        self,
        *,
        actor_id: uuid.UUID,
        target_user_id: uuid.UUID,
        new_role: UserRole,
    ) -> User:
        """
        Việc kiểm tra actor có phải ADMIN được thực hiện
        bởi require_role ở mốc 8.

        Service xử lý business rule không tự hạ quyền.
        """
        target_user = self.get_user(target_user_id)

        if (
            actor_id == target_user_id
            and target_user.role == UserRole.ADMIN
            and new_role != UserRole.ADMIN
        ):
            raise BadRequestError(
                code="USER_CANNOT_DEMOTE_SELF",
                message="Admin không thể tự hạ quyền chính mình.",
            )

        if target_user.role == new_role:
            return target_user

        try:
            updated_user = self.users.update_role(
                target_user,
                role=new_role,
            )

            self.db.commit()

            return updated_user

        except Exception:
            self.db.rollback()
            raise

    def set_active(
        self,
        *,
        actor_id: uuid.UUID,
        target_user_id: uuid.UUID,
        is_active: bool,
    ) -> User:
        """
        Khóa hoặc mở khóa tài khoản.

        Khi khóa, thu hồi toàn bộ refresh token để các phiên
        không thể tiếp tục làm mới access token.
        """
        target_user = self.get_user(target_user_id)

        if actor_id == target_user_id and not is_active:
            raise BadRequestError(
                code="USER_CANNOT_DEACTIVATE_SELF",
                message="Admin không thể tự khóa tài khoản chính mình.",
            )

        if target_user.is_active == is_active:
            return target_user

        try:
            updated_user = self.users.update_active_status(
                target_user,
                is_active=is_active,
            )

            if not is_active:
                self.refresh_tokens.revoke_all_by_user_id(
                    target_user.id
                )

            self.db.commit()

            return updated_user

        except Exception:
            self.db.rollback()
            raise