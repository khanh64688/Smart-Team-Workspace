import uuid

from app.models import User, UserRole

PASSWORD = "Password123"


def make_user(client, db_session, *, email: str, role: UserRole = UserRole.MEMBER):
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": email.split("@")[0], "password": PASSWORD, "confirm_password": PASSWORD},
    )
    assert registered.status_code == 201, registered.text
    user = db_session.get(User, uuid.UUID(registered.json()["id"]))
    user.role = role
    db_session.commit()
    login = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200, login.text
    return user, {"Authorization": f"Bearer {login.json()['access_token']}"}


def create_project(client, headers, name="Project Alpha"):
    return client.post("/api/v1/projects", json={"name": name, "description": "Demo"}, headers=headers)


def test_auth_required(client):
    response = client.get("/api/v1/projects")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_CREDENTIALS_REQUIRED"


def test_member_cannot_create_project(client, db_session):
    _, headers = make_user(client, db_session, email="member-project@example.com")
    response = create_project(client, headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "AUTH_INSUFFICIENT_ROLE"


def test_creator_is_owner_and_project_defaults_active(client, db_session):
    _, headers = make_user(client, db_session, email="pm-owner@example.com", role=UserRole.PM)
    response = create_project(client, headers)
    assert response.status_code == 201
    project = response.json()
    assert project["status"] == "ACTIVE"
    members = client.get(f"/api/v1/projects/{project['id']}/members", headers=headers)
    assert members.status_code == 200
    assert members.json()[0]["project_role"] == "OWNER"


def test_outsider_gets_403_not_404(client, db_session):
    _, pm_headers = make_user(client, db_session, email="pm-scope@example.com", role=UserRole.PM)
    _, outsider_headers = make_user(client, db_session, email="outsider@example.com")
    project_id = create_project(client, pm_headers).json()["id"]
    response = client.get(f"/api/v1/projects/{project_id}", headers=outsider_headers)
    assert response.status_code == 403


def test_list_is_scoped_searchable_and_paginated(client, db_session):
    _, pm_headers = make_user(client, db_session, email="pm-list@example.com", role=UserRole.PM)
    _, outsider_headers = make_user(client, db_session, email="outsider-list@example.com")
    create_project(client, pm_headers, "Alpha Project")
    create_project(client, pm_headers, "Beta Project")
    scoped = client.get("/api/v1/projects?q=Alpha&page=1&size=1", headers=pm_headers)
    assert scoped.status_code == 200
    assert scoped.json()["meta"] == {"page": 1, "size": 1, "total": 1}
    assert scoped.json()["data"][0]["name"] == "Alpha Project"
    assert client.get("/api/v1/projects", headers=outsider_headers).json()["meta"]["total"] == 0


def test_duplicate_member_returns_409(client, db_session):
    _, pm_headers = make_user(client, db_session, email="pm-member@example.com", role=UserRole.PM)
    member, _ = make_user(client, db_session, email="member-add@example.com")
    project_id = create_project(client, pm_headers).json()["id"]
    payload = {"user_id": str(member.id), "project_role": "MEMBER"}
    assert client.post(f"/api/v1/projects/{project_id}/members", json=payload, headers=pm_headers).status_code == 201
    duplicate = client.post(f"/api/v1/projects/{project_id}/members", json=payload, headers=pm_headers)
    assert duplicate.status_code == 409


def test_last_owner_cannot_leave_or_be_removed(client, db_session):
    _, pm_headers = make_user(client, db_session, email="pm-leave@example.com", role=UserRole.PM)
    project_id = create_project(client, pm_headers).json()["id"]
    leave = client.delete(f"/api/v1/projects/{project_id}/members/me", headers=pm_headers)
    assert leave.status_code == 400
    assert leave.json()["error"]["code"] == "LAST_OWNER_REQUIRED"


def test_only_owner_can_close(client, db_session):
    _, pm_headers = make_user(client, db_session, email="pm-close@example.com", role=UserRole.PM)
    member, member_headers = make_user(client, db_session, email="member-close@example.com")
    project_id = create_project(client, pm_headers).json()["id"]
    client.post(f"/api/v1/projects/{project_id}/members", json={"user_id": str(member.id), "project_role": "MEMBER"}, headers=pm_headers)
    denied = client.patch(f"/api/v1/projects/{project_id}/close", headers=member_headers)
    assert denied.status_code == 403
    closed = client.patch(f"/api/v1/projects/{project_id}/close", headers=pm_headers)
    assert closed.status_code == 200
    assert closed.json()["status"] == "CLOSED"


def test_promoting_owner_updates_primary_owner_and_old_owner_can_leave(client, db_session):
    _, original_headers = make_user(client, db_session, email="owner-original@example.com", role=UserRole.PM)
    new_owner, new_owner_headers = make_user(client, db_session, email="owner-new@example.com")
    project_id = create_project(client, original_headers).json()["id"]
    client.post(
        f"/api/v1/projects/{project_id}/members",
        json={"user_id": str(new_owner.id), "project_role": "MEMBER"},
        headers=original_headers,
    )

    promoted = client.patch(
        f"/api/v1/projects/{project_id}/members/{new_owner.id}",
        json={"project_role": "OWNER"},
        headers=original_headers,
    )
    assert promoted.status_code == 200, promoted.text
    assert promoted.json()["project_role"] == "OWNER"

    project = client.get(f"/api/v1/projects/{project_id}", headers=new_owner_headers)
    assert project.json()["owner_id"] == str(new_owner.id)
    assert client.delete(
        f"/api/v1/projects/{project_id}/members/me",
        headers=original_headers,
    ).status_code == 204


def test_member_cannot_update_project(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="pm-update@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="member-update@example.com",
    )

    project_id = create_project(
        client,
        pm_headers,
    ).json()["id"]

    add_response = client.post(
        f"/api/v1/projects/{project_id}/members",
        json={
            "user_id": str(member.id),
            "project_role": "MEMBER",
        },
        headers=pm_headers,
    )

    assert add_response.status_code == 201

    response = client.put(
        f"/api/v1/projects/{project_id}",
        json={
            "name": "Member Cannot Update",
        },
        headers=member_headers,
    )

    assert response.status_code == 403


def test_pm_project_member_cannot_update_project(
    client,
    db_session,
):
    _, owner_headers = make_user(
        client,
        db_session,
        email="owner-update@example.com",
        role=UserRole.PM,
    )

    pm_member, pm_member_headers = make_user(
        client,
        db_session,
        email="pm-project-member@example.com",
        role=UserRole.PM,
    )

    project_id = create_project(
        client,
        owner_headers,
    ).json()["id"]

    add_response = client.post(
        f"/api/v1/projects/{project_id}/members",
        json={
            "user_id": str(pm_member.id),
            "project_role": "MEMBER",
        },
        headers=owner_headers,
    )

    assert add_response.status_code == 201

    response = client.put(
        f"/api/v1/projects/{project_id}",
        json={
            "name": "PM Member Cannot Update",
        },
        headers=pm_member_headers,
    )

    assert response.status_code == 403

def test_only_owner_can_reopen(client, db_session):
    _, pm_headers = make_user(client, db_session, email="pm-reopen@example.com", role=UserRole.PM)
    member, member_headers = make_user(client, db_session, email="member-reopen@example.com")
    project_id = create_project(client, pm_headers).json()["id"]
    client.post(f"/api/v1/projects/{project_id}/members", json={"user_id": str(member.id), "project_role": "MEMBER"}, headers=pm_headers)
    assert client.patch(f"/api/v1/projects/{project_id}/close", headers=pm_headers).status_code == 200
    denied = client.patch(f"/api/v1/projects/{project_id}/reopen", headers=member_headers)
    assert denied.status_code == 403
    reopened = client.patch(f"/api/v1/projects/{project_id}/reopen", headers=pm_headers)
    assert reopened.status_code == 200
    assert reopened.json()["status"] == "ACTIVE"


def test_reopened_project_is_editable_again(client, db_session):
    _, pm_headers = make_user(client, db_session, email="pm-reopen-edit@example.com", role=UserRole.PM)
    project_id = create_project(client, pm_headers).json()["id"]
    client.patch(f"/api/v1/projects/{project_id}/close", headers=pm_headers)
    blocked = client.put(f"/api/v1/projects/{project_id}", json={"name": "Renamed"}, headers=pm_headers)
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "PROJECT_CLOSED"
    client.patch(f"/api/v1/projects/{project_id}/reopen", headers=pm_headers)
    allowed = client.put(f"/api/v1/projects/{project_id}", json={"name": "Renamed"}, headers=pm_headers)
    assert allowed.status_code == 200
    assert allowed.json()["name"] == "Renamed"
