from datetime import UTC, datetime, timedelta

from app.models import UserRole


def make_user(client, db_session, *, email: str, role: UserRole):
    import uuid

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


def create_project(client, headers):
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "Comment Test Project",
            "description": "Comment tests",
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


def create_task(client, project_id, headers):
    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project_id,
            "title": "Comment Test Task",
            "description": "Task for comments",
            "status": "TODO",
            "priority": "MEDIUM",
        },
        headers=headers,
    )

    assert response.status_code == 201, response.text

    return response.json()


def create_comment(client, task_id, headers, content="Test comment"):
    response = client.post(
        f"/api/v1/tasks/{task_id}/comments",
        json={
            "content": content,
        },
        headers=headers,
    )

    assert response.status_code == 201, response.text

    return response.json()



def test_get_comments_requires_auth(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="comment-auth-pm@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    response = client.get(
        f"/api/v1/tasks/{task['id']}/comments"
    )

    assert response.status_code == 401


def test_member_can_view_comments(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="comment-view-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="comment-view-member@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        member,
        pm_headers,
    )

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    create_comment(
        client,
        task["id"],
        pm_headers,
        "Hello comment",
    )

    response = client.get(
        f"/api/v1/tasks/{task['id']}/comments",
        headers=member_headers,
    )

    assert response.status_code == 200

    body = response.json()

    assert len(body) == 1
    assert body[0]["content"] == "Hello comment"


def test_outsider_cannot_view_comments(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="comment-outsider-pm@example.com",
        role=UserRole.PM,
    )

    _, outsider_headers = make_user(
        client,
        db_session,
        email="comment-outsider@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    response = client.get(
        f"/api/v1/tasks/{task['id']}/comments",
        headers=outsider_headers,
    )

    assert response.status_code == 403



def test_member_can_create_comment(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="comment-create-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="comment-create-member@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        member,
        pm_headers,
    )

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    response = client.post(
        f"/api/v1/tasks/{task['id']}/comments",
        json={
            "content": "Member comment",
        },
        headers=member_headers,
    )

    assert response.status_code == 201, response.text

    body = response.json()

    assert body["task_id"] == task["id"]
    assert body["author_id"] == str(member.id)
    assert body["content"] == "Member comment"


def test_outsider_cannot_create_comment(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="comment-create-outsider-pm@example.com",
        role=UserRole.PM,
    )

    _, outsider_headers = make_user(
        client,
        db_session,
        email="comment-create-outsider@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    response = client.post(
        f"/api/v1/tasks/{task['id']}/comments",
        json={
            "content": "Illegal comment",
        },
        headers=outsider_headers,
    )

    assert response.status_code == 403


def test_create_comment_rejects_empty_content(
    client,
    db_session,
):
    _, pm_headers = make_user(
        client,
        db_session,
        email="comment-empty@example.com",
        role=UserRole.PM,
    )

    project = create_project(client, pm_headers)

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    response = client.post(
        f"/api/v1/tasks/{task['id']}/comments",
        json={
            "content": "",
        },
        headers=pm_headers,
    )

    assert response.status_code == 422



def test_author_can_update_comment(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="comment-update-author-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="comment-update-author@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        member,
        pm_headers,
    )

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    comment = create_comment(
        client,
        task["id"],
        member_headers,
        "Original",
    )

    response = client.put(
        f"/api/v1/comments/{comment['id']}",
        json={
            "content": "Updated",
        },
        headers=member_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["content"] == "Updated"


def test_other_member_cannot_update_comment(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="comment-update-other-pm@example.com",
        role=UserRole.PM,
    )

    author, author_headers = make_user(
        client,
        db_session,
        email="comment-update-author2@example.com",
        role=UserRole.MEMBER,
    )

    other, other_headers = make_user(
        client,
        db_session,
        email="comment-update-other@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(client, project["id"], author, pm_headers)
    add_member(client, project["id"], other, pm_headers)

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    comment = create_comment(
        client,
        task["id"],
        author_headers,
        "Original",
    )

    response = client.put(
        f"/api/v1/comments/{comment['id']}",
        json={
            "content": "Illegal update",
        },
        headers=other_headers,
    )

    assert response.status_code == 403


def test_update_comment_after_15_minutes_is_rejected(
    client,
    db_session,
):
    from app.models.comment import Comment

    pm, pm_headers = make_user(
        client,
        db_session,
        email="comment-expired-pm@example.com",
        role=UserRole.PM,
    )

    author, author_headers = make_user(
        client,
        db_session,
        email="comment-expired-author@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        author,
        pm_headers,
    )

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    comment = create_comment(
        client,
        task["id"],
        author_headers,
        "Old comment",
    )

    comment_model = db_session.get(
        Comment,
        comment["id"],
    )

    assert comment_model is not None

    comment_model.created_at = (
        datetime.now(UTC)
        - timedelta(minutes=16)
    )

    db_session.commit()

    response = client.put(
        f"/api/v1/comments/{comment['id']}",
        json={
            "content": "Too late",
        },
        headers=author_headers,
    )

    assert response.status_code == 403


def test_author_can_delete_comment(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="comment-delete-author-pm@example.com",
        role=UserRole.PM,
    )

    author, author_headers = make_user(
        client,
        db_session,
        email="comment-delete-author@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        author,
        pm_headers,
    )

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    comment = create_comment(
        client,
        task["id"],
        author_headers,
    )

    response = client.delete(
        f"/api/v1/comments/{comment['id']}",
        headers=author_headers,
    )

    assert response.status_code == 204


def test_other_member_cannot_delete_comment(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="comment-delete-other-pm@example.com",
        role=UserRole.PM,
    )

    author, author_headers = make_user(
        client,
        db_session,
        email="comment-delete-other-author@example.com",
        role=UserRole.MEMBER,
    )

    other, other_headers = make_user(
        client,
        db_session,
        email="comment-delete-other-member@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(client, project["id"], author, pm_headers)
    add_member(client, project["id"], other, pm_headers)

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    comment = create_comment(
        client,
        task["id"],
        author_headers,
    )

    response = client.delete(
        f"/api/v1/comments/{comment['id']}",
        headers=other_headers,
    )

    assert response.status_code == 403


def test_pm_can_delete_member_comment(
    client,
    db_session,
):
    pm, pm_headers = make_user(
        client,
        db_session,
        email="comment-delete-pm@example.com",
        role=UserRole.PM,
    )

    member, member_headers = make_user(
        client,
        db_session,
        email="comment-delete-pm-member@example.com",
        role=UserRole.MEMBER,
    )

    project = create_project(client, pm_headers)

    add_member(
        client,
        project["id"],
        member,
        pm_headers,
    )

    task = create_task(
        client,
        project["id"],
        pm_headers,
    )

    comment = create_comment(
        client,
        task["id"],
        member_headers,
    )

    response = client.delete(
        f"/api/v1/comments/{comment['id']}",
        headers=pm_headers,
    )

    assert response.status_code == 204