from __future__ import annotations

import uuid
from datetime import timedelta

from app.core.security import (
    TokenExpiredError,
    TokenInvalidError,
    TokenTypeError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import UserRole


def main() -> None:
    print("1. Hash mật khẩu...")

    plain_password = "Password123"
    password_hash = hash_password(plain_password)

    assert password_hash != plain_password
    assert password_hash.startswith("$argon2")

    print("   OK - Mật khẩu đã được hash bằng Argon2")

    print("2. Kiểm tra mật khẩu đúng...")

    assert verify_password(
        plain_password,
        password_hash,
    )

    print("   OK")

    print("3. Kiểm tra mật khẩu sai...")

    assert not verify_password(
        "SaiMatKhau123",
        password_hash,
    )

    print("   OK")

    user_id = uuid.uuid4()
    role = UserRole.MEMBER

    print("4. Tạo access token...")

    access_token = create_access_token(
        user_id=user_id,
        role=role,
    )

    assert access_token.token
    assert access_token.jti

    print(f"   OK - JTI: {access_token.jti}")

    print("5. Giải mã access token...")

    access_payload = decode_token(
        access_token.token,
        expected_type="access",
    )

    assert access_payload.user_id == user_id
    assert access_payload.role == UserRole.MEMBER.value
    assert access_payload.token_type == "access"
    assert access_payload.jti == access_token.jti

    print("   OK")
    print(f"   User id: {access_payload.user_id}")
    print(f"   Role: {access_payload.role}")
    print(f"   Type: {access_payload.token_type}")

    print("6. Tạo refresh token...")

    refresh_token = create_refresh_token(
        user_id=user_id,
        role=role,
    )

    assert refresh_token.token
    assert refresh_token.jti
    assert refresh_token.jti != access_token.jti

    print(f"   OK - JTI: {refresh_token.jti}")

    print("7. Giải mã refresh token...")

    refresh_payload = decode_token(
        refresh_token.token,
        expected_type="refresh",
    )

    assert refresh_payload.user_id == user_id
    assert refresh_payload.role == UserRole.MEMBER.value
    assert refresh_payload.token_type == "refresh"
    assert refresh_payload.jti == refresh_token.jti

    print("   OK")

    print("8. Chặn access token dùng như refresh token...")

    try:
        decode_token(
            access_token.token,
            expected_type="refresh",
        )
    except TokenTypeError:
        print("   OK - Đã từ chối sai loại token")
    else:
        raise AssertionError(
            "Access token đã bị chấp nhận như refresh token."
        )

    print("9. Chặn token bị sửa nội dung...")

    tampered_token = access_token.token + "x"

    try:
        decode_token(tampered_token)
    except TokenInvalidError:
        print("   OK - Đã từ chối token bị sửa")
    else:
        raise AssertionError(
            "Token bị sửa vẫn được chấp nhận."
        )

    print("10. Chặn token hết hạn...")

    expired_token = create_access_token(
        user_id=user_id,
        role=role,
        expires_delta=timedelta(seconds=-1),
    )

    try:
        decode_token(expired_token.token)
    except TokenExpiredError:
        print("   OK - Đã từ chối token hết hạn")
    else:
        raise AssertionError(
            "Token hết hạn vẫn được chấp nhận."
        )

    print()
    print("MỐC 6 HOÀN TẤT")


if __name__ == "__main__":
    main()