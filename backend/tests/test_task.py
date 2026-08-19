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
    project_role: str = "MEMBER",
):
    response = client.post(
        f"/api/v1/projects/{project_id}/members",
        json={
            "user_id": str(user_id),
            "project_role": project_role,
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
        "description": "Test task description",
        "status": "TODO",
        "priority": "MEDIUM",
    }

    if assignee_id is not None:
        payload["assignee_id"] = str(assignee_id)

    response = client.post(
        "/api/v1/tasks",
        json=payload,
        headers=headers,
    )

    assert response.status_code == 201, response.text

    return response.json()


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


def test_member_can_list_tasks(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-list-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="task-list-member@example.com",
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        pm_headers,
        project_id=project["id"],
        user_id=member.id,
    )

    create_task(
        client,
        pm_headers,
        project_id=project["id"],
        title="Task A",
    )

    response = client.get(
        "/api/v1/tasks",
        params={
            "project_id": project["id"],
        },
        headers=member_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert isinstance(body, list)
    assert len(body) == 1
    assert body[0]["title"] == "Task A"


def test_outsider_cannot_list_tasks(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-outsider-pm@example.com",
        role=UserRole.PM,
    )

    _, outsider_headers = make_user(
        client,
        db_session,
        email="task-outsider@example.com",
    )

    project = create_project(client, pm_headers)

    response = client.get(
        "/api/v1/tasks",
        params={
            "project_id": project["id"],
        },
        headers=outsider_headers,
    )

    assert response.status_code == 403


def test_get_task_by_id(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-get-pm@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    task = create_task(
        client,
        pm_headers,
        project_id=project["id"],
    )

    response = client.get(
        f"/api/v1/tasks/{task['id']}",
        headers=pm_headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == task["id"]


def test_task_list_includes_assignee_profile(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="pm-assignee-profile@example.com",
        role=UserRole.PM,
    )

    assignee, _ = make_user(
        client,
        db_session,
        email="assignee-profile@example.com",
    )

    project = create_project(client, pm_headers)

    project_id = project["id"]

    add_member(
        client,
        pm_headers,
        project_id=project_id,
        user_id=assignee.id,
    )

    create_task(
        client,
        pm_headers,
        project_id=project_id,
        title="Task có người phụ trách",
        assignee_id=assignee.id,
    )

    create_task(
        client,
        pm_headers,
        project_id=project_id,
        title="Task chưa giao",
    )

    listed = client.get(
        "/api/v1/tasks",
        params={"project_id": project_id},
        headers=pm_headers,
    )

    assert listed.status_code == 200, listed.text

    by_title = {t["title"]: t for t in listed.json()}

    with_assignee = by_title["Task có người phụ trách"]

    assert with_assignee["assignee"] is not None
    assert with_assignee["assignee"]["id"] == str(assignee.id)
    assert with_assignee["assignee"]["full_name"] == assignee.full_name
    assert "avatar" in with_assignee["assignee"]

    # Không rò rỉ email của thành viên khác ra bảng task.
    assert "email" not in with_assignee["assignee"]

    assert by_title["Task chưa giao"]["assignee"] is None


def test_member_can_create_task_assigned_to_self(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-create-self-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="task-create-self-member@example.com",
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        pm_headers,
        project_id=project["id"],
        user_id=member.id,
    )

    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project["id"],
            "title": "My Task",
            "description": "Created by member",
            "status": "TODO",
            "priority": "MEDIUM",
            "assignee_id": str(member.id),
        },
        headers=member_headers,
    )

    assert response.status_code == 201, response.text

    body = response.json()

    assert body["title"] == "My Task"
    assert body["assignee_id"] == str(member.id)


def test_member_cannot_assign_task_to_other_user(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-create-other-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="task-create-other-member@example.com",
    )

    other, _ = make_user(
        client,
        db_session,
        email="task-create-other-target@example.com",
    )

    project = create_project(client, pm_headers)

    project_id = project["id"]

    add_member(
        client,
        pm_headers,
        project_id=project_id,
        user_id=member.id,
    )

    add_member(
        client,
        pm_headers,
        project_id=project_id,
        user_id=other.id,
    )

    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project_id,
            "title": "Illegal Assignment",
            "status": "TODO",
            "priority": "MEDIUM",
            "assignee_id": str(other.id),
        },
        headers=member_headers,
    )

    assert response.status_code == 403


def test_create_task_rejects_invalid_status(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-invalid-status@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project["id"],
            "title": "Invalid Status",
            "status": "INVALID",
            "priority": "MEDIUM",
        },
        headers=pm_headers,
    )

    assert response.status_code == 422


def test_create_task_rejects_invalid_priority(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-invalid-priority@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project["id"],
            "title": "Invalid Priority",
            "status": "TODO",
            "priority": "INVALID",
        },
        headers=pm_headers,
    )

    assert response.status_code == 422


def test_create_task_rejects_naive_due_date(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-naive-date@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project["id"],
            "title": "Invalid Due Date",
            "status": "TODO",
            "priority": "MEDIUM",
            "due_date": "2030-01-01T12:00:00",
        },
        headers=pm_headers,
    )

    assert response.status_code == 422


def test_member_can_update_own_task(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-update-own-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="task-update-own-member@example.com",
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        pm_headers,
        project_id=project["id"],
        user_id=member.id,
    )

    task = create_task(
        client,
        pm_headers,
        project_id=project["id"],
        assignee_id=member.id,
    )

    response = client.put(
        f"/api/v1/tasks/{task['id']}",
        json={
            "title": "Updated My Task",
            "description": "Updated description",
        },
        headers=member_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["title"] == "Updated My Task"


def test_member_cannot_update_other_member_task(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-update-other-pm@example.com",
        role=UserRole.PM,
    )

    member1, member1_headers = make_user(
        client,
        db_session,
        email="task-update-other-member1@example.com",
    )

    member2, _ = make_user(
        client,
        db_session,
        email="task-update-other-member2@example.com",
    )

    project = create_project(client, pm_headers)

    project_id = project["id"]

    add_member(
        client,
        pm_headers,
        project_id=project_id,
        user_id=member1.id,
    )

    add_member(
        client,
        pm_headers,
        project_id=project_id,
        user_id=member2.id,
    )

    task = create_task(
        client,
        pm_headers,
        project_id=project_id,
        assignee_id=member2.id,
    )

    response = client.put(
        f"/api/v1/tasks/{task['id']}",
        json={
            "title": "Illegal Update",
        },
        headers=member1_headers,
    )

    assert response.status_code == 403


def test_pm_can_assign_task(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-assign-pm@example.com",
        role=UserRole.PM,
    )

    member, _ = make_user(
        client,
        db_session,
        email="task-assign-member@example.com",
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        pm_headers,
        project_id=project["id"],
        user_id=member.id,
    )

    task = create_task(
        client,
        pm_headers,
        project_id=project["id"],
    )

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/assign",
        json={
            "assignee_id": str(member.id),
        },
        headers=pm_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["assignee_id"] == str(member.id)


def test_member_cannot_assign_task(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-assign-denied-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="task-assign-denied-member@example.com",
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        pm_headers,
        project_id=project["id"],
        user_id=member.id,
    )

    task = create_task(
        client,
        pm_headers,
        project_id=project["id"],
    )

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/assign",
        json={
            "assignee_id": str(member.id),
        },
        headers=member_headers,
    )

    assert response.status_code == 403


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
        email="task-assign-outsider@example.com",
    )

    project = create_project(client, pm_headers)

    task = create_task(
        client,
        pm_headers,
        project_id=project["id"],
    )

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/assign",
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


def test_member_can_move_own_task(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-move-own-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="task-move-own-member@example.com",
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        pm_headers,
        project_id=project["id"],
        user_id=member.id,
    )

    task = create_task(
        client,
        pm_headers,
        project_id=project["id"],
        assignee_id=member.id,
    )

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/move",
        json={
            "status": "IN_PROGRESS",
        },
        headers=member_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "IN_PROGRESS"


def test_member_cannot_move_other_member_task(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-move-other-pm@example.com",
        role=UserRole.PM,
    )

    member1, member1_headers = make_user(
        client,
        db_session,
        email="task-move-other-member1@example.com",
    )

    member2, _ = make_user(
        client,
        db_session,
        email="task-move-other-member2@example.com",
    )

    project = create_project(client, pm_headers)

    project_id = project["id"]

    add_member(
        client,
        pm_headers,
        project_id=project_id,
        user_id=member1.id,
    )

    add_member(
        client,
        pm_headers,
        project_id=project_id,
        user_id=member2.id,
    )

    task = create_task(
        client,
        pm_headers,
        project_id=project_id,
        assignee_id=member2.id,
    )

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/move",
        json={
            "status": "IN_PROGRESS",
        },
        headers=member1_headers,
    )

    assert response.status_code == 403

    assert (
        response.json()["error"]["code"]
        == "TASK_MOVE_FORBIDDEN"
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

    project = create_project(client, pm_headers)

    task = create_task(
        client,
        pm_headers,
        project_id=project["id"],
    )

    assert task["status"] == "TODO"

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/move",
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


def test_pm_can_delete_task(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-delete-pm@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    task = create_task(
        client,
        pm_headers,
        project_id=project["id"],
    )

    response = client.delete(
        f"/api/v1/tasks/{task['id']}",
        headers=pm_headers,
    )

    assert response.status_code == 204


def test_member_cannot_delete_task(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="task-delete-member-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="task-delete-member@example.com",
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        pm_headers,
        project_id=project["id"],
        user_id=member.id,
    )

    task = create_task(
        client,
        pm_headers,
        project_id=project["id"],
        assignee_id=member.id,
    )

    response = client.delete(
        f"/api/v1/tasks/{task['id']}",
        headers=member_headers,
    )

    assert response.status_code == 403
