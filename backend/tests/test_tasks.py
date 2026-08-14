import uuid

from app.models import User, UserRole


PASSWORD = "Password123"


def make_user(
    client,
    db_session,
    *,
    email: str,
    role: UserRole = UserRole.MEMBER,
):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": email.split("@")[0],
            "password": PASSWORD,
            "confirm_password": PASSWORD,
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
            "password": PASSWORD,
        },
    )

    assert login.status_code == 200, login.text

    headers = {
        "Authorization": (
            f"Bearer {login.json()['access_token']}"
        )
    }

    return user, headers


def create_project(
    client,
    headers,
    *,
    name: str = "Task Test Project",
):
    response = client.post(
        "/api/v1/projects",
        json={
            "name": name,
            "description": "Project dùng cho test task",
        },
        headers=headers,
    )

    assert response.status_code == 201, response.text

    return response.json()


def add_member(
    client,
    headers,
    *,
    project_id: str,
    user_id: uuid.UUID,
):
    response = client.post(
        f"/api/v1/projects/{project_id}/members",
        json={
            "user_id": str(user_id),
            "project_role": "MEMBER",
        },
        headers=headers,
    )

    assert response.status_code == 201, response.text

    return response.json()


def create_task(
    client,
    headers,
    *,
    project_id: str,
    title: str = "Test Task",
    assignee_id: uuid.UUID | None = None,
):
    payload = {
        "project_id": project_id,
        "title": title,
        "priority": "MEDIUM",
    }

    if assignee_id is not None:
        payload["assignee_id"] = str(assignee_id)

    return client.post(
        "/api/v1/tasks",
        json=payload,
        headers=headers,
    )


def test_task_auth_required(
    client,
):
    response = client.get(
        "/api/v1/tasks",
        params={
            "project_id": str(uuid.uuid4()),
        },
    )

    assert response.status_code == 401

    assert (
        response.json()["error"]["code"]
        == "AUTH_CREDENTIALS_REQUIRED"
    )


def test_member_cannot_move_other_members_task(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="pm-task-other@example.com",
        role=UserRole.PM,
    )

    assignee, _ = make_user(
        client,
        db_session,
        email="task-assignee@example.com",
    )

    other_member, other_headers = make_user(
        client,
        db_session,
        email="task-other-member@example.com",
    )

    project = create_project(
        client,
        pm_headers,
    )

    project_id = project["id"]

    add_member(
        client,
        pm_headers,
        project_id=project_id,
        user_id=assignee.id,
    )

    add_member(
        client,
        pm_headers,
        project_id=project_id,
        user_id=other_member.id,
    )

    task_response = create_task(
        client,
        pm_headers,
        project_id=project_id,
        assignee_id=assignee.id,
    )

    assert task_response.status_code == 201, (
        task_response.text
    )

    task_id = task_response.json()["id"]

    response = client.patch(
        f"/api/v1/tasks/{task_id}/move",
        json={
            "status": "IN_PROGRESS",
        },
        headers=other_headers,
    )

    assert response.status_code == 403

    assert (
        response.json()["error"]["code"]
        == "TASK_MOVE_FORBIDDEN"
    )


def test_member_can_move_own_task(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="pm-own-task@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="own-task-member@example.com",
    )

    project = create_project(
        client,
        pm_headers,
    )

    project_id = project["id"]

    add_member(
        client,
        pm_headers,
        project_id=project_id,
        user_id=member.id,
    )

    task_response = create_task(
        client,
        pm_headers,
        project_id=project_id,
        assignee_id=member.id,
    )

    assert task_response.status_code == 201, (
        task_response.text
    )

    task_id = task_response.json()["id"]

    response = client.patch(
        f"/api/v1/tasks/{task_id}/move",
        json={
            "status": "IN_PROGRESS",
        },
        headers=member_headers,
    )

    assert response.status_code == 200, response.text

    assert response.json()["status"] == "IN_PROGRESS"


def test_assign_task_to_outsider_returns_400(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="pm-assign@example.com",
        role=UserRole.PM,
    )

    outsider, _ = make_user(
        client,
        db_session,
        email="task-outsider@example.com",
    )

    project = create_project(
        client,
        pm_headers,
    )

    project_id = project["id"]

    task_response = create_task(
        client,
        pm_headers,
        project_id=project_id,
    )

    assert task_response.status_code == 201, (
        task_response.text
    )

    task_id = task_response.json()["id"]

    response = client.patch(
        f"/api/v1/tasks/{task_id}/assign",
        json={
            "assignee_id": str(outsider.id),
        },
        headers=pm_headers,
    )

    assert response.status_code == 400

    assert (
        response.json()["error"]["code"]
        == "TASK_ASSIGNEE_NOT_PROJECT_MEMBER"
    )


def test_todo_cannot_jump_directly_to_done(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="pm-transition@example.com",
        role=UserRole.PM,
    )

    project = create_project(
        client,
        pm_headers,
    )

    project_id = project["id"]

    task_response = create_task(
        client,
        pm_headers,
        project_id=project_id,
    )

    assert task_response.status_code == 201, (
        task_response.text
    )

    task_id = task_response.json()["id"]

    assert task_response.json()["status"] == "TODO"

    response = client.patch(
        f"/api/v1/tasks/{task_id}/move",
        json={
            "status": "DONE",
        },
        headers=pm_headers,
    )

    assert response.status_code == 400

    assert (
        response.json()["error"]["code"]
        == "TASK_INVALID_TRANSITION"
    )