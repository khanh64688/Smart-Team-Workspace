from datetime import datetime, timedelta, timezone

from app.models import UserRole


def make_sprint_payload(
    *,
    name: str = "Sprint 1",
    status: str = "ACTIVE",
):
    start = datetime.now(timezone.utc) + timedelta(days=1)
    end = start + timedelta(days=7)

    return {
        "name": name,
        "goal": "Complete sprint tasks",
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "status": status,
    }


def make_user(client, db_session, *, email: str, role: UserRole):
    from app.models import User
    import uuid

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": email.split("@")[0],
            "password": "Password123",
            "confirm_password": "Password123",
        },
    )

    assert response.status_code == 201, response.text

    user = db_session.get(
        User,
        uuid.UUID(response.json()["id"]),
    )

    assert user is not None

    user.role = role
    db_session.commit()

    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "Password123",
        },
    )

    assert login.status_code == 200, login.text

    return user, {
        "Authorization": f"Bearer {login.json()['access_token']}"
    }


def create_project(client, headers, name="Sprint Test Project"):
    response = client.post(
        "/api/v1/projects",
        json={
            "name": name,
            "description": "Sprint test project",
        },
        headers=headers,
    )

    assert response.status_code == 201, response.text

    return response.json()


def add_member(
    client,
    project_id,
    user,
    headers,
    project_role="MEMBER",
):
    response = client.post(
        f"/api/v1/projects/{project_id}/members",
        json={
            "user_id": str(user.id),
            "project_role": project_role,
        },
        headers=headers,
    )

    assert response.status_code == 201, response.text

    return response.json()



def test_get_project_sprints_requires_auth(client, db_session):
    _, pm_headers = make_user(
        client,
        db_session,
        email="sprint-auth-pm@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    response = client.get(
        f"/api/v1/projects/{project['id']}/sprints"
    )

    assert response.status_code == 401


def test_member_can_view_sprints(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="sprint-view-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="sprint-view-member@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        member,
        pm_headers,
        "MEMBER",
    )

    payload = make_sprint_payload()

    created = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json=payload,
        headers=pm_headers,
    )

    assert created.status_code == 201, created.text

    response = client.get(
        f"/api/v1/projects/{project['id']}/sprints",
        headers=member_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert isinstance(body, list)
    assert len(body) == 1
    assert body[0]["name"] == "Sprint 1"
    assert body[0]["project_id"] == project["id"]


def test_outsider_cannot_view_project_sprints(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="sprint-outsider-pm@example.com",
        role=UserRole.PM,
    )

    _, outsider_headers = make_user(
        client,
        db_session,
        email="sprint-outsider@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    response = client.get(
        f"/api/v1/projects/{project['id']}/sprints",
        headers=outsider_headers,
    )

    assert response.status_code == 403



def test_pm_can_create_sprint(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="sprint-create-pm@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    response = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json=make_sprint_payload(),
        headers=pm_headers,
    )

    assert response.status_code == 201, response.text

    body = response.json()

    assert body["project_id"] == project["id"]
    assert body["name"] == "Sprint 1"
    assert body["status"] == "ACTIVE"


def test_member_cannot_create_sprint(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="sprint-create-member-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="sprint-create-member@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        member,
        pm_headers,
        "MEMBER",
    )

    response = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json=make_sprint_payload(),
        headers=member_headers,
    )

    assert response.status_code == 403


def test_create_sprint_rejects_invalid_dates(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="sprint-invalid-date@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    start = datetime.now(timezone.utc) + timedelta(days=5)
    end = start - timedelta(days=1)

    response = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json={
            "name": "Invalid Sprint",
            "goal": "Invalid dates",
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "status": "PLANNED",
        },
        headers=pm_headers,
    )

    assert response.status_code == 422


def test_create_sprint_rejects_invalid_status(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="sprint-invalid-status@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    response = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json=make_sprint_payload(status="DONE"),
        headers=pm_headers,
    )

    assert response.status_code == 422



def test_pm_can_update_sprint(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="sprint-update-pm@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    created = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json=make_sprint_payload(),
        headers=pm_headers,
    )

    assert created.status_code == 201

    sprint_id = created.json()["id"]

    response = client.put(
        f"/api/v1/sprints/{sprint_id}",
        json={
            "name": "Updated Sprint",
            "goal": "Updated goal",
        },
        headers=pm_headers,
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert body["id"] == sprint_id
    assert body["name"] == "Updated Sprint"
    assert body["goal"] == "Updated goal"


def test_member_cannot_update_sprint(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="sprint-update-member-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="sprint-update-member@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        member,
        pm_headers,
    )

    created = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json=make_sprint_payload(),
        headers=pm_headers,
    )

    sprint_id = created.json()["id"]

    response = client.put(
        f"/api/v1/sprints/{sprint_id}",
        json={
            "name": "Illegal Update",
        },
        headers=member_headers,
    )

    assert response.status_code == 403



def test_pm_can_close_sprint(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="sprint-close-pm@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    created = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json=make_sprint_payload(),
        headers=pm_headers,
    )

    assert created.status_code == 201

    sprint_id = created.json()["id"]

    response = client.patch(
        f"/api/v1/sprints/{sprint_id}/close",
        headers=pm_headers,
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert body["id"] == sprint_id
    assert body["status"] == "CLOSED"


def test_member_cannot_close_sprint(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="sprint-close-member-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="sprint-close-member@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        member,
        pm_headers,
    )

    created = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json=make_sprint_payload(),
        headers=pm_headers,
    )

    sprint_id = created.json()["id"]

    response = client.patch(
        f"/api/v1/sprints/{sprint_id}/close",
        headers=member_headers,
    )

    assert response.status_code == 403



def test_pm_can_delete_sprint_without_tasks(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="sprint-delete-pm@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    created = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json=make_sprint_payload(),
        headers=pm_headers,
    )

    sprint_id = created.json()["id"]

    response = client.delete(
        f"/api/v1/sprints/{sprint_id}",
        headers=pm_headers,
    )

    assert response.status_code == 204

    get_response = client.get(
        f"/api/v1/projects/{project['id']}/sprints",
        headers=pm_headers,
    )

    assert get_response.status_code == 200
    assert all(
        sprint["id"] != sprint_id
        for sprint in get_response.json()
    )


def test_member_cannot_delete_sprint(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="sprint-delete-member-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="sprint-delete-member@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        member,
        pm_headers,
    )

    created = client.post(
        f"/api/v1/projects/{project['id']}/sprints",
        json=make_sprint_payload(),
        headers=pm_headers,
    )

    sprint_id = created.json()["id"]

    response = client.delete(
        f"/api/v1/sprints/{sprint_id}",
        headers=member_headers,
    )

    assert response.status_code == 403