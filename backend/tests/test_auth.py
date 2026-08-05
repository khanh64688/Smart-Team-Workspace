from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models import User


def test_register_success(
    client,
    db_session: Session,
):
    email = "register-success@example.com"
    password = "Password123"

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Register Success",
            "password": password,
            "confirm_password": password,
        },
    )

    # Đổi 201 thành 200 nếu route của bạn khai báo 200.
    assert response.status_code == 201, response.text

    body = response.json()

    assert body["email"] == email
    assert body["full_name"] == "Register Success"
    assert body["role"] == "MEMBER"
    assert body["is_active"] is True

    # Không được lộ dữ liệu bảo mật trong response.
    assert "password" not in body
    assert "password_hash" not in body
    assert "refresh_tokens" not in body

    db_session.expire_all()

    user = db_session.scalar(
        select(User).where(User.email == email)
    )

    assert user is not None
    assert user.password_hash != password
    assert verify_password(
        password,
        user.password_hash,
    )


def test_register_duplicate_email_returns_409(
    client,
    register_user,
):
    email = "duplicate@example.com"

    register_user(email=email)

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Duplicate User",
            "password": "Password123",
            "confirm_password": "Password123",
        },
    )

    assert response.status_code == 409, response.text

    body = response.json()

    assert body["error"]["code"] == "AUTH_EMAIL_ALREADY_EXISTS"


def test_register_rejects_weak_password(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "weak-password@example.com",
            "full_name": "Weak Password",
            "password": "12345678",
            "confirm_password": "12345678",
        },
    )

    # Chỉ có số, không có chữ.
    assert response.status_code == 422, response.text


def test_register_rejects_client_role(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "illegal-admin@example.com",
            "full_name": "Illegal Admin",
            "password": "Password123",
            "confirm_password": "Password123",
            "role": "ADMIN",
        },
    )

    # RegisterRequest là strict và không có field role.
    assert response.status_code == 422, response.text


def test_login_success_returns_tokens(
    client,
    register_user,
):
    email = "login-success@example.com"

    register_user(email=email)

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "Password123",
        },
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"].lower() == "bearer"
    assert body["user"]["email"] == email
    assert body["user"]["role"] == "MEMBER"


def test_login_uses_same_error_for_wrong_credentials(
    client,
    register_user,
):
    email = "credential-test@example.com"

    register_user(email=email)

    wrong_password = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "WrongPassword123",
        },
    )

    missing_email = client.post(
        "/api/v1/auth/login",
        json={
            "email": "not-found@example.com",
            "password": "Password123",
        },
    )

    assert wrong_password.status_code == 401
    assert missing_email.status_code == 401

    wrong_error = wrong_password.json()["error"]
    missing_error = missing_email.json()["error"]

    assert wrong_error["code"] == "AUTH_INVALID_CREDENTIALS"
    assert missing_error["code"] == "AUTH_INVALID_CREDENTIALS"

    # Không được tiết lộ email có tồn tại hay không.
    assert wrong_error["message"] == missing_error["message"]


def test_refresh_returns_new_access_token(
    client,
    register_user,
    login_user,
):
    email = "refresh@example.com"

    register_user(email=email)
    login = login_user(email=email)

    response = client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": login["refresh_token"],
        },
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert body["access_token"]
    assert body["token_type"].lower() == "bearer"


def test_access_token_cannot_refresh(
    client,
    register_user,
    login_user,
):
    email = "wrong-token-type@example.com"

    register_user(email=email)
    login = login_user(email=email)

    response = client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": login["access_token"],
        },
    )

    assert response.status_code == 401, response.text


def test_logout_revokes_refresh_token(
    client,
    register_user,
    login_user,
):
    email = "logout@example.com"

    register_user(email=email)
    login = login_user(email=email)

    refresh_token = login["refresh_token"]

    logout_response = client.post(
        "/api/v1/auth/logout",
        json={
            "refresh_token": refresh_token,
        },
    )

    assert logout_response.status_code == 200, logout_response.text

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": refresh_token,
        },
    )

    assert refresh_response.status_code == 401
    assert (
        refresh_response.json()["error"]["code"]
        == "AUTH_REFRESH_TOKEN_REVOKED"
    )


def test_change_password_rejects_wrong_old_password(
    client,
    register_user,
    login_user,
    auth_headers,
):
    email = "wrong-old-password@example.com"

    register_user(email=email)
    login = login_user(email=email)

    response = client.put(
        "/api/v1/auth/change-password",
        headers=auth_headers(login["access_token"]),
        json={
            "old_password": "WrongPassword123",
            "new_password": "NewPassword456",
        },
    )

    assert response.status_code == 400, response.text
    assert (
        response.json()["error"]["code"]
        == "AUTH_CURRENT_PASSWORD_INCORRECT"
    )


def test_change_password_revokes_old_refresh_token(
    client,
    register_user,
    login_user,
    auth_headers,
):
    email = "change-password@example.com"
    old_password = "Password123"
    new_password = "NewPassword456"

    register_user(
        email=email,
        password=old_password,
    )

    login = login_user(
        email=email,
        password=old_password,
    )

    old_refresh_token = login["refresh_token"]

    response = client.put(
        "/api/v1/auth/change-password",
        headers=auth_headers(login["access_token"]),
        json={
            "old_password": old_password,
            "new_password": new_password,
        },
    )

    assert response.status_code == 200, response.text

    # Mật khẩu cũ không còn đăng nhập được.
    old_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": old_password,
        },
    )

    assert old_login.status_code == 401

    # Mật khẩu mới đăng nhập được.
    new_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": new_password,
        },
    )

    assert new_login.status_code == 200

    # Refresh token cũ đã bị thu hồi.
    old_refresh = client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": old_refresh_token,
        },
    )

    assert old_refresh.status_code == 401