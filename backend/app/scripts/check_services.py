from __future__ import annotations

import uuid

from sqlalchemy import delete

from app.core.exceptions import (
    BadRequestError,
    ConflictError,
    UnauthorizedError,
)
from app.core.security import decode_token
from app.database import SessionLocal
from app.models import RefreshToken, User, UserRole
from app.services import AuthService, UserService


def main() -> None:
    unique_value = uuid.uuid4().hex[:12]
    email = f"moc7-{unique_value}@example.com"

    old_password = "Password123"
    new_password = "NewPassword456"

    created_user_id: uuid.UUID | None = None

    with SessionLocal() as db:
        auth_service = AuthService(db)
        user_service = UserService(db)

        try:
            print("1. Đăng ký user...")

            user = auth_service.register(
                email=f"  {email.upper()}  ",
                full_name="  Mốc 7 Test User  ",
                password=old_password,
            )

            created_user_id = user.id

            assert user.email == email
            assert user.full_name == "Mốc 7 Test User"
            assert user.role == UserRole.MEMBER
            assert user.is_active is True
            assert user.password_hash != old_password

            print("   OK")

            print("2. Chặn đăng ký email trùng...")

            try:
                auth_service.register(
                    email=email,
                    full_name="Duplicate User",
                    password=old_password,
                )
            except ConflictError as exc:
                assert exc.status_code == 409
                print("   OK")
            else:
                raise AssertionError(
                    "Email trùng không bị từ chối."
                )

            print("3. Chặn đăng nhập sai mật khẩu...")

            try:
                auth_service.login(
                    email=email,
                    password="WrongPassword123",
                )
            except UnauthorizedError:
                print("   OK")
            else:
                raise AssertionError(
                    "Sai mật khẩu vẫn đăng nhập được."
                )

            print("4. Đăng nhập thành công...")

            first_login = auth_service.login(
                email=email,
                password=old_password,
            )

            access_payload = decode_token(
                first_login.tokens.access_token,
                expected_type="access",
            )

            assert access_payload.user_id == user.id
            assert access_payload.role == UserRole.MEMBER.value

            print("   OK")

            print("5. Refresh access token...")

            refreshed = auth_service.refresh_access_token(
                first_login.tokens.refresh_token
            )

            refreshed_payload = decode_token(
                refreshed.access_token,
                expected_type="access",
            )

            assert refreshed_payload.user_id == user.id

            print("   OK")

            print("6. Logout...")

            auth_service.logout(
                first_login.tokens.refresh_token
            )

            print("   OK")

            print("7. Chặn token đã logout...")

            try:
                auth_service.refresh_access_token(
                    first_login.tokens.refresh_token
                )
            except UnauthorizedError:
                print("   OK")
            else:
                raise AssertionError(
                    "Refresh token đã logout vẫn hoạt động."
                )

            print("8. Tạo hai phiên mới...")

            second_login = auth_service.login(
                email=email,
                password=old_password,
            )

            third_login = auth_service.login(
                email=email,
                password=old_password,
            )

            print("   OK")

            print("9. Chặn mật khẩu cũ sai...")

            try:
                auth_service.change_password(
                    user_id=user.id,
                    current_password="WrongPassword123",
                    new_password=new_password,
                )
            except BadRequestError as exc:
                assert (
                    exc.code
                    == "AUTH_CURRENT_PASSWORD_INCORRECT"
                )
                print("   OK")
            else:
                raise AssertionError(
                    "Mật khẩu cũ sai vẫn đổi được."
                )

            print("10. Đổi mật khẩu...")

            auth_service.change_password(
                user_id=user.id,
                current_password=old_password,
                new_password=new_password,
            )

            print("   OK")

            print("11. Token cũ đã bị thu hồi...")

            for old_token in (
                second_login.tokens.refresh_token,
                third_login.tokens.refresh_token,
            ):
                try:
                    auth_service.refresh_access_token(old_token)
                except UnauthorizedError:
                    pass
                else:
                    raise AssertionError(
                        "Refresh token cũ vẫn hoạt động."
                    )

            print("   OK")

            print("12. Mật khẩu cũ không đăng nhập được...")

            try:
                auth_service.login(
                    email=email,
                    password=old_password,
                )
            except UnauthorizedError:
                print("   OK")
            else:
                raise AssertionError(
                    "Mật khẩu cũ vẫn đăng nhập được."
                )

            print("13. Mật khẩu mới đăng nhập được...")

            final_login = auth_service.login(
                email=email,
                password=new_password,
            )

            assert final_login.tokens.access_token

            print("   OK")

            print("14. Cập nhật hồ sơ...")

            updated_user = user_service.update_my_profile(
                user_id=user.id,
                changes={
                    "full_name": "Mốc 7 Updated User",
                    "avatar": "https://example.com/avatar.png",
                },
            )

            assert updated_user.full_name == "Mốc 7 Updated User"
            assert (
                updated_user.avatar
                == "https://example.com/avatar.png"
            )

            print("   OK")

            print("15. Kiểm tra phân trang user...")

            users, total = user_service.list_users(
                page=1,
                size=20,
                q=email,
            )

            assert total >= 1
            assert any(item.id == user.id for item in users)

            print("   OK")

            print("16. Logout phiên cuối...")

            auth_service.logout(
                final_login.tokens.refresh_token
            )

            print("   OK")

            print()
            print("MỐC 7 HOÀN TẤT")

        finally:
            db.rollback()

            if created_user_id is not None:
                # Xóa token trước để script vẫn hoạt động
                # ngay cả khi cascade chưa đúng.
                db.execute(
                    delete(RefreshToken).where(
                        RefreshToken.user_id
                        == created_user_id
                    )
                )

                db.execute(
                    delete(User).where(
                        User.id == created_user_id
                    )
                )

                db.commit()


if __name__ == "__main__":
    main()