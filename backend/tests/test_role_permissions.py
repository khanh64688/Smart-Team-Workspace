from __future__ import annotations


def test_member_cannot_change_system_role(
    client,
    register_user,
    login_user,
    auth_headers,
):
    member = register_user(
        email="member-role@example.com",
    )

    login = login_user(
        email="member-role@example.com",
    )

    response = client.patch(
        f"/api/v1/users/{member['id']}/role",
        headers=auth_headers(login["access_token"]),
        json={
            "role": "PM",
        },
    )

    assert response.status_code == 403, response.text


def test_member_cannot_deactivate_user(
    client,
    register_user,
    login_user,
    auth_headers,
):
    member = register_user(
        email="member-active@example.com",
    )

    login = login_user(
        email="member-active@example.com",
    )

    response = client.patch(
        f"/api/v1/users/{member['id']}/active",
        headers=auth_headers(login["access_token"]),
        json={
            "is_active": False,
        },
    )

    assert response.status_code == 403, response.text


def test_admin_can_change_user_role(
    client,
    register_user,
    make_admin,
    auth_headers,
):
    admin_login = make_admin(
        email="change-role-admin@example.com",
    )

    target = register_user(
        email="change-role-target@example.com",
    )

    response = client.patch(
        f"/api/v1/users/{target['id']}/role",
        headers=auth_headers(
            admin_login["access_token"]
        ),
        json={
            "role": "PM",
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["role"] == "PM"


def test_admin_cannot_demote_self(
    client,
    make_admin,
    auth_headers,
):
    admin_login = make_admin(
        email="self-demote@example.com",
    )

    admin_id = admin_login["user"]["id"]

    response = client.patch(
        f"/api/v1/users/{admin_id}/role",
        headers=auth_headers(
            admin_login["access_token"]
        ),
        json={
            "role": "MEMBER",
        },
    )

    assert response.status_code == 400, response.text
    assert (
        response.json()["error"]["code"]
        == "USER_CANNOT_DEMOTE_SELF"
    )


def test_admin_can_deactivate_user(
    client,
    register_user,
    login_user,
    make_admin,
    auth_headers,
):
    admin_login = make_admin(
        email="deactivate-admin@example.com",
    )

    target_email = "deactivate-target@example.com"

    target = register_user(
        email=target_email,
    )

    response = client.patch(
        f"/api/v1/users/{target['id']}/active",
        headers=auth_headers(
            admin_login["access_token"]
        ),
        json={
            "is_active": False,
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["is_active"] is False

    # Tài khoản bị khóa không được đăng nhập.
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": target_email,
            "password": "Password123",
        },
    )

    assert login_response.status_code == 403
    assert (
        login_response.json()["error"]["code"]
        == "AUTH_ACCOUNT_INACTIVE"
    )


def test_admin_cannot_deactivate_self(
    client,
    make_admin,
    auth_headers,
):
    admin_login = make_admin(
        email="self-deactivate@example.com",
    )

    admin_id = admin_login["user"]["id"]

    response = client.patch(
        f"/api/v1/users/{admin_id}/active",
        headers=auth_headers(
            admin_login["access_token"]
        ),
        json={
            "is_active": False,
        },
    )

    assert response.status_code == 400, response.text
    assert (
        response.json()["error"]["code"]
        == "USER_CANNOT_DEACTIVATE_SELF"
    )


def test_invalid_access_token_returns_401(client):
    response = client.get(
        "/api/v1/users/me",
        headers={
            "Authorization": "Bearer invalid-token",
        },
    )

    assert response.status_code == 401, response.text