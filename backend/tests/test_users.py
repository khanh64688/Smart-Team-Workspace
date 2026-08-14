from __future__ import annotations


def test_get_me_without_token_returns_401(client):
    response = client.get(
        "/api/v1/users/me"
    )

    assert response.status_code == 401, response.text


def test_get_me_returns_current_user(
    client,
    register_user,
    login_user,
    auth_headers,
):
    email = "get-me@example.com"

    register_user(
        email=email,
        full_name="Get Me User",
    )

    login = login_user(email=email)

    response = client.get(
        "/api/v1/users/me",
        headers=auth_headers(login["access_token"]),
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert body["email"] == email
    assert body["full_name"] == "Get Me User"
    assert body["role"] == "MEMBER"
    assert body["is_active"] is True

    assert "password" not in body
    assert "password_hash" not in body


def test_update_my_profile(
    client,
    register_user,
    login_user,
    auth_headers,
):
    email = "update-profile@example.com"

    register_user(email=email)
    login = login_user(email=email)

    headers = auth_headers(login["access_token"])

    response = client.put(
        "/api/v1/users/me",
        headers=headers,
        json={
            "full_name": "Updated User",
            "avatar": "https://example.com/avatar.png",
        },
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert body["full_name"] == "Updated User"
    assert body["avatar"] == "https://example.com/avatar.png"

    # Gọi lại GET để chứng minh đã lưu vào database.
    get_response = client.get(
        "/api/v1/users/me",
        headers=headers,
    )

    assert get_response.status_code == 200
    assert get_response.json()["full_name"] == "Updated User"


def test_update_profile_rejects_role(
    client,
    register_user,
    login_user,
    auth_headers,
):
    email = "illegal-update@example.com"

    register_user(email=email)
    login = login_user(email=email)

    response = client.put(
        "/api/v1/users/me",
        headers=auth_headers(login["access_token"]),
        json={
            "full_name": "Illegal Update",
            "role": "ADMIN",
        },
    )

    # UserUpdateRequest không cho phép field role.
    assert response.status_code == 422, response.text


def test_empty_profile_update_returns_422(
    client,
    register_user,
    login_user,
    auth_headers,
):
    email = "empty-update@example.com"

    register_user(email=email)
    login = login_user(email=email)

    response = client.put(
        "/api/v1/users/me",
        headers=auth_headers(login["access_token"]),
        json={},
    )

    assert response.status_code == 422, response.text


def test_member_search_only_returns_public_fields(
    client,
    register_user,
    login_user,
    auth_headers,
):
    register_user(
        email="search-target@example.com",
        full_name="Unique Search Target",
    )

    register_user(
        email="search-member@example.com",
        full_name="Search Member",
    )

    member_login = login_user(
        email="search-member@example.com",
    )

    response = client.get(
        "/api/v1/users",
        headers=auth_headers(
            member_login["access_token"]
        ),
        params={
            "q": "Unique Search",
            "page": 1,
            "size": 10,
        },
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert "data" in body
    assert "meta" in body
    assert body["meta"]["page"] == 1
    assert body["meta"]["size"] == 10

    assert len(body["data"]) >= 1

    target = body["data"][0]

    assert "id" in target
    assert "full_name" in target
    assert "avatar" in target

    # MEMBER không được nhìn thấy các trường quản trị.
    assert "email" not in target
    assert "role" not in target
    assert "is_active" not in target


def test_admin_search_returns_full_user_data(
    client,
    register_user,
    make_admin,
    auth_headers,
):
    admin_login = make_admin(
        email="search-admin@example.com"
    )

    register_user(
        email="admin-search-target@example.com",
        full_name="Admin Search Target",
    )

    response = client.get(
        "/api/v1/users",
        headers=auth_headers(
            admin_login["access_token"]
        ),
        params={
            "q": "Admin Search Target",
            "page": 1,
            "size": 10,
        },
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert body["meta"]["page"] == 1
    assert body["meta"]["size"] == 10
    assert body["meta"]["total"] >= 1

    target = body["data"][0]

    assert target["email"] == "admin-search-target@example.com"
    assert target["role"] == "MEMBER"
    assert target["is_active"] is True