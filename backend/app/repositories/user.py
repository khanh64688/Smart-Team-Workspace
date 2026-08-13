from __future__ import annotations

import uuid
from collections.abc import Mapping
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import User, UserRole


class UserRepository:
    """
    Repository chịu trách nhiệm truy cập dữ liệu bảng users.

    Không xử lý:
    - HTTPException
    - Phân quyền
    - Hash mật khẩu
    - JWT
    - Commit hoặc rollback transaction
    """

    PROFILE_UPDATE_FIELDS = frozenset(
        {
            "full_name",
            "avatar",
        }
    )

    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def normalize_email(email: str) -> str:
        """
        Chuẩn hóa email để việc đăng ký và đăng nhập nhất quán.

        Ví dụ:
            "  User@Example.com  "
        thành:
            "user@example.com"
        """
        return email.strip().lower()

    def get_by_id(
        self,
        user_id: uuid.UUID,
    ) -> User | None:
        """
        Lấy một user theo khóa chính UUID.

        Trả về:
        - User nếu tìm thấy.
        - None nếu không tìm thấy.
        """
        return self.db.get(User, user_id)

    def get_by_email(
        self,
        email: str,
    ) -> User | None:
        """
        Lấy user theo email.

        Email được strip và chuyển thành chữ thường trước khi truy vấn.
        """
        normalized_email = self.normalize_email(email)

        statement = select(User).where(
            User.email == normalized_email
        )

        return self.db.scalar(statement)

    def exists_by_email(
        self,
        email: str,
        *,
        exclude_user_id: uuid.UUID | None = None,
    ) -> bool:
        """
        Kiểm tra email đã tồn tại hay chưa.

        exclude_user_id hữu ích khi sau này cho phép user cập nhật email.
        User hiện tại không bị xem là trùng với chính mình.
        """
        normalized_email = self.normalize_email(email)

        statement = select(User.id).where(
            User.email == normalized_email
        )

        if exclude_user_id is not None:
            statement = statement.where(
                User.id != exclude_user_id
            )

        statement = statement.limit(1)

        return self.db.scalar(statement) is not None

    def list_users(
        self,
        *,
        q: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[User], int]:
        """
        Lấy danh sách người dùng, hỗ trợ:

        - Tìm theo tên hoặc email.
        - Lọc theo role.
        - Lọc theo trạng thái active.
        - Phân trang bằng offset và limit.

        Trả về:
            (danh_sách_user, tổng_số_bản_ghi)
        """
        safe_offset = max(offset, 0)
        safe_limit = min(max(limit, 1), 100)

        filters = []

        if q is not None and q.strip():
            keyword = f"%{q.strip()}%"

            filters.append(
                or_(
                    User.full_name.ilike(keyword),
                    User.email.ilike(keyword),
                )
            )

        if role is not None:
            filters.append(User.role == role)

        if is_active is not None:
            filters.append(User.is_active == is_active)

        count_statement = select(
            func.count(User.id)
        ).where(*filters)

        total = self.db.scalar(count_statement) or 0

        data_statement = (
            select(User)
            .where(*filters)
            .order_by(User.created_at.desc())
            .offset(safe_offset)
            .limit(safe_limit)
        )

        users = list(
            self.db.scalars(data_statement).all()
        )

        return users, total

    def create(
        self,
        *,
        email: str,
        full_name: str,
        password_hash: str,
        role: UserRole = UserRole.MEMBER,
        is_active: bool = True,
        avatar: str | None = None,
    ) -> User:
        """
        Tạo user mới.

        Repository chỉ nhận password_hash.
        Không được truyền mật khẩu plaintext vào phương thức này.
        """
        user = User(
            email=self.normalize_email(email),
            full_name=full_name.strip(),
            password_hash=password_hash,
            role=role,
            is_active=is_active,
            avatar=avatar,
        )

        self.db.add(user)

        # Đẩy INSERT xuống database nhưng chưa commit transaction.
        self.db.flush()

        # Tải lại id, created_at và các giá trị do database sinh.
        self.db.refresh(user)

        # Nguyen duc dat them test
        # self.db.commit()
        # thu ma eo dc

        return user

    def update_profile(
        self,
        user: User,
        *,
        values: Mapping[str, Any],
    ) -> User:
        """
        Cập nhật thông tin hồ sơ user.

        Chỉ cho phép:
        - full_name
        - avatar

        Không cho phép cập nhật role, is_active hoặc password_hash
        qua phương thức hồ sơ thông thường.
        """
        invalid_fields = (
            set(values.keys()) - self.PROFILE_UPDATE_FIELDS
        )

        if invalid_fields:
            invalid_names = ", ".join(
                sorted(invalid_fields)
            )

            raise ValueError(
                "Không được cập nhật các trường hồ sơ: "
                f"{invalid_names}"
            )

        for field_name, value in values.items():
            if field_name == "full_name" and isinstance(
                value,
                str,
            ):
                value = value.strip()

            setattr(user, field_name, value)

        self.db.flush()
        self.db.refresh(user)

        return user

    def update_password_hash(
        self,
        user: User,
        *,
        password_hash: str,
    ) -> User:
        """
        Cập nhật mật khẩu đã hash.

        Việc kiểm tra mật khẩu cũ và tạo hash mới
        thuộc Security và AuthService.
        """
        user.password_hash = password_hash

        self.db.flush()
        self.db.refresh(user)

        return user

    def update_role(
        self,
        user: User,
        *,
        role: UserRole,
    ) -> User:
        """
        Cập nhật vai trò hệ thống của user.

        Việc xác minh người gọi có phải ADMIN hay không
        thuộc dependency/service, không thuộc repository.
        """
        user.role = role

        self.db.flush()
        self.db.refresh(user)

        return user

    def update_active_status(
        self,
        user: User,
        *,
        is_active: bool,
    ) -> User:
        """
        Khóa hoặc mở khóa tài khoản.

        Dự án không hard-delete user vì cần giữ lịch sử
        task và comment.
        """
        user.is_active = is_active

        self.db.flush()
        self.db.refresh(user)

        return user