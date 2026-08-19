import uuid
from datetime import UTC, datetime, timedelta

from app.models import UserRole


def make_user(client, db_session, *, email: str, role: UserRole):
    from app.models import User

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


def create_project(client, headers, name="Notification Project"):
    response = client.post(
        "/api/v1/projects",
        json={
            "name": name,
            "description": "Notification tests",
        },
        headers=headers,
    )

    assert response.status_code == 201, response.text

    return response.json()


def add_member(client, project_id, user, headers):
    response = client.post(
        f"/api/v1/projects/{project_id}/members",
        json={
            "user_id": str(user.id),
            "project_role": "MEMBER",
        },
        headers=headers,
    )

    assert response.status_code == 201, response.text


def create_task(
    client,
    project_id,
    headers,
    *,
    title="Notification Task",
    assignee_id=None,
    due_date=None,
):
    payload = {
        "project_id": project_id,
        "title": title,
        "status": "TODO",
        "priority": "MEDIUM",
    }

    if assignee_id is not None:
        payload["assignee_id"] = str(assignee_id)

    if due_date is not None:
        payload["due_date"] = due_date.isoformat()

    response = client.post(
        "/api/v1/tasks",
        json=payload,
        headers=headers,
    )

    assert response.status_code == 201, response.text

    return response.json()


def list_notifications(client, headers, **params):
    response = client.get(
        "/api/v1/notifications",
        headers=headers,
        params=params,
    )

    assert response.status_code == 200, response.text

    return response.json()


def setup_pm_and_member(
    client,
    db_session,
    prefix: str,
):
    """
    Tạo một PM sở hữu project và một MEMBER đã tham gia project đó.
    """

    pm, pm_headers = make_user(
        client,
        db_session,
        email=f"{prefix}-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email=f"{prefix}-member@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        member,
        pm_headers,
    )

    return (
        pm,
        pm_headers,
        member,
        member_headers,
        project,
    )


def test_list_notifications_requires_auth(client):
    response = client.get("/api/v1/notifications")

    assert response.status_code == 401


def test_notification_created_when_task_assigned_on_create(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-create")

    task = create_task(
        client,
        project["id"],
        pm_headers,
        title="Task được giao",
        assignee_id=member.id,
    )

    items = list_notifications(client, member_headers)

    assert len(items) == 1
    assert items[0]["type"] == "TASK_ASSIGNED"
    assert items[0]["task_id"] == task["id"]
    assert items[0]["is_read"] is False
    assert "Task được giao" in items[0]["message"]


def test_notification_created_when_task_reassigned(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-assign")

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    response = client.patch(
        f"/api/v1/tasks/{task['id']}/assign",
        json={"assignee_id": str(member.id)},
        headers=pm_headers,
    )

    assert response.status_code == 200, response.text

    items = list_notifications(client, member_headers)

    assert len(items) == 1
    assert items[0]["type"] == "TASK_ASSIGNED"


def test_no_notification_when_assigning_same_person_twice(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-same")

    task = create_task(
        client,
        project["id"],
        pm_headers,
        assignee_id=member.id,
    )

    # Gán lại đúng người đang phụ trách: không sinh thông báo thứ hai.
    response = client.patch(
        f"/api/v1/tasks/{task['id']}/assign",
        json={"assignee_id": str(member.id)},
        headers=pm_headers,
    )

    assert response.status_code == 200, response.text

    items = list_notifications(client, member_headers)

    assert len(items) == 1


def test_no_notification_when_self_assigning(
    client,
    db_session,
):
    (
        _pm,
        _pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-self")

    create_task(
        client,
        project["id"],
        member_headers,
        assignee_id=member.id,
    )

    items = list_notifications(client, member_headers)

    assert items == []


def test_notification_created_on_new_comment(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-comment")

    task = create_task(
        client,
        project["id"],
        pm_headers,
        assignee_id=member.id,
    )

    response = client.post(
        f"/api/v1/tasks/{task['id']}/comments",
        json={"content": "Nhớ làm sớm nhé"},
        headers=pm_headers,
    )

    assert response.status_code == 201, response.text

    items = list_notifications(client, member_headers)

    types = [item["type"] for item in items]

    assert "TASK_COMMENT" in types

    comment_item = next(
        item for item in items if item["type"] == "TASK_COMMENT"
    )

    assert comment_item["task_id"] == task["id"]
    assert "Nhớ làm sớm nhé" in comment_item["message"]


def test_no_notification_when_commenting_on_own_task(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-own-comment")

    task = create_task(
        client,
        project["id"],
        pm_headers,
        assignee_id=member.id,
    )

    response = client.post(
        f"/api/v1/tasks/{task['id']}/comments",
        json={"content": "Tôi đang làm"},
        headers=member_headers,
    )

    assert response.status_code == 201, response.text

    items = list_notifications(client, member_headers)

    types = [item["type"] for item in items]

    assert "TASK_COMMENT" not in types


def test_due_soon_notification_is_generated_once(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-due")

    due_date = datetime.now(UTC) + timedelta(hours=5)

    create_task(
        client,
        project["id"],
        pm_headers,
        assignee_id=member.id,
        due_date=due_date,
    )

    first = list_notifications(client, member_headers)

    due_soon = [
        item for item in first if item["type"] == "TASK_DUE_SOON"
    ]

    assert len(due_soon) == 1

    # Polling gọi lại không được sinh thêm bản ghi trùng.
    second = list_notifications(client, member_headers)

    due_soon_again = [
        item for item in second if item["type"] == "TASK_DUE_SOON"
    ]

    assert len(due_soon_again) == 1


def test_no_due_soon_notification_beyond_24h(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-far-due")

    due_date = datetime.now(UTC) + timedelta(days=3)

    create_task(
        client,
        project["id"],
        pm_headers,
        assignee_id=member.id,
        due_date=due_date,
    )

    items = list_notifications(client, member_headers)

    types = [item["type"] for item in items]

    assert "TASK_DUE_SOON" not in types


def test_overdue_notification_is_generated(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-overdue")

    due_date = datetime.now(UTC) - timedelta(days=1)

    create_task(
        client,
        project["id"],
        pm_headers,
        assignee_id=member.id,
        due_date=due_date,
    )

    items = list_notifications(client, member_headers)

    types = [item["type"] for item in items]

    assert "TASK_OVERDUE" in types
    assert "TASK_DUE_SOON" not in types


def test_unread_count_and_mark_read(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-read")

    create_task(
        client,
        project["id"],
        pm_headers,
        assignee_id=member.id,
    )

    count = client.get(
        "/api/v1/notifications/unread-count",
        headers=member_headers,
    )

    assert count.status_code == 200, count.text
    assert count.json()["unread_count"] == 1

    item = list_notifications(client, member_headers)[0]

    marked = client.patch(
        f"/api/v1/notifications/{item['id']}/read",
        headers=member_headers,
    )

    assert marked.status_code == 200, marked.text
    assert marked.json()["is_read"] is True

    count_after = client.get(
        "/api/v1/notifications/unread-count",
        headers=member_headers,
    )

    assert count_after.json()["unread_count"] == 0


def test_mark_all_read(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-read-all")

    for index in range(3):
        create_task(
            client,
            project["id"],
            pm_headers,
            title=f"Task {index}",
            assignee_id=member.id,
        )

    response = client.post(
        "/api/v1/notifications/read-all",
        headers=member_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["marked"] == 3

    unread = list_notifications(
        client,
        member_headers,
        unread_only=True,
    )

    assert unread == []


def test_cannot_mark_other_users_notification(
    client,
    db_session,
):
    (
        _pm,
        pm_headers,
        member,
        member_headers,
        project,
    ) = setup_pm_and_member(client, db_session, "notify-isolation")

    other, other_headers = make_user(
        client,
        db_session,
        email="notify-isolation-other@example.com",
        role=UserRole.MEMBER,
    )

    create_task(
        client,
        project["id"],
        pm_headers,
        assignee_id=member.id,
    )

    item = list_notifications(client, member_headers)[0]

    # Thông báo của người khác trả 404 để không lộ sự tồn tại của nó.
    response = client.patch(
        f"/api/v1/notifications/{item['id']}/read",
        headers=other_headers,
    )

    assert response.status_code == 404

    assert list_notifications(client, other_headers) == []
