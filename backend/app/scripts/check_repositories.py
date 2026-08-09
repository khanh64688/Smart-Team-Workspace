from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models import UserRole
from app.repositories import (
    RefreshTokenRepository,
    UserRepository,
)


def main() -> None:
    db = SessionLocal()

    user_repository = UserRepository(db)
    token_repository = RefreshTokenRepository(db)

    try:
        random_id = uuid.uuid4().hex[:12]
        email = f"repo-test-{random_id}@twl.dev"

        print("1. Tạo user test...")

        user = user_repository.create(
            email=email,
            full_name="Repository Test User",
            password_hash=f"fake-password-hash-{random_id}",
            role=UserRole.MEMBER,
        )

        assert user.id is not None
        assert user.email == email
        assert user.role == UserRole.MEMBER

        print(f"   OK - User id: {user.id}")

        print("2. Tìm user theo id...")

        user_by_id = user_repository.get_by_id(user.id)

        assert user_by_id is not None
        assert user_by_id.id == user.id

        print("   OK")

        print("3. Tìm user theo email...")

        user_by_email = user_repository.get_by_email(
            email.upper()
        )

        assert user_by_email is not None
        assert user_by_email.id == user.id

        print("   OK")

        print("4. Kiểm tra email tồn tại...")

        assert user_repository.exists_by_email(email) is True
        assert (
            user_repository.exists_by_email(
                "not-found@twl.dev"
            )
            is False
        )

        print("   OK")

        print("5. Cập nhật hồ sơ...")

        user_repository.update_profile(
            user,
            values={
                "full_name": "Updated Test User",
                "avatar": "https://example.com/avatar.png",
            },
        )

        assert user.full_name == "Updated Test User"
        assert user.avatar == "https://example.com/avatar.png"

        print("   OK")

        print("6. Tạo refresh token...")

        jti = str(uuid.uuid4())

        refresh_token = token_repository.create(
            jti=jti,
            user_id=user.id,
            expires_at=(
                datetime.now(timezone.utc)
                + timedelta(days=7)
            ),
        )

        assert refresh_token.id is not None
        assert refresh_token.jti == jti
        assert refresh_token.revoked_at is None

        print(f"   OK - Token id: {refresh_token.id}")

        print("7. Tìm refresh token còn hiệu lực...")

        active_token = token_repository.get_active_by_jti(
            jti
        )

        assert active_token is not None
        assert active_token.id == refresh_token.id

        print("   OK")

        print("8. Thu hồi refresh token...")

        was_revoked = token_repository.revoke_by_jti(jti)

        assert was_revoked is True
        assert refresh_token.revoked_at is not None

        print("   OK")

        print("9. Kiểm tra token đã revoke không còn active...")

        active_after_revoke = (
            token_repository.get_active_by_jti(jti)
        )

        assert active_after_revoke is None

        print("   OK")

        print("10. Kiểm tra danh sách user...")

        users, total = user_repository.list_users(
            q=email,
            role=UserRole.MEMBER,
            is_active=True,
            offset=0,
            limit=20,
        )

        assert total >= 1
        assert any(item.id == user.id for item in users)

        print("   OK")

        print()
        print("Tất cả kiểm tra Repository đã thành công.")

        # Không commit để dữ liệu test không được lưu thật.
        db.rollback()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()