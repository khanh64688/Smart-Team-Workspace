import uuid
from datetime import UTC, datetime

from app.models import User, UserRole
from app.models.task import Task

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


def create_project(client, headers, name="Task Board"):
    response = client.post("/api/v1/projects", json={"name": name, "description": "Demo"}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def seed_task(db_session, project_id, *, status="TODO"):
    task = Task(
        project_id=uuid.UUID(project_id),
        title="Kéo thẻ sang cột khác",
        status=status,
        priority="HIGH",
        position=65536,
        created_at=datetime.now(UTC),
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task


def move(client, task_id, headers, status):
    return client.patch(f"/api/v1/tasks/{task_id}/move", json={"status": status}, headers=headers)


def test_move_task_updates_status(client, db_session):
    _, headers = make_user(client, db_session, email="pm-move@example.com", role=UserRole.PM)
    project_id = create_project(client, headers)
    task = seed_task(db_session, project_id)

    response = move(client, task.id, headers, "IN_PROGRESS")

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "IN_PROGRESS"

    db_session.refresh(task)
    assert task.status == "IN_PROGRESS"


def test_move_to_done_sets_completed_at_and_back_clears_it(client, db_session):
    _, headers = make_user(client, db_session, email="pm-done@example.com", role=UserRole.PM)
    project_id = create_project(client, headers)
    task = seed_task(db_session, project_id)

    assert move(client, task.id, headers, "DONE").status_code == 200
    db_session.refresh(task)
    assert task.completed_at is not None

    assert move(client, task.id, headers, "IN_PROGRESS").status_code == 200
    db_session.refresh(task)
    assert task.completed_at is None


def test_move_rejects_unknown_status(client, db_session):
    _, headers = make_user(client, db_session, email="pm-status@example.com", role=UserRole.PM)
    project_id = create_project(client, headers)
    task = seed_task(db_session, project_id)

    assert move(client, task.id, headers, "ARCHIVED").status_code == 422


def test_non_member_cannot_move_task(client, db_session):
    _, owner_headers = make_user(client, db_session, email="pm-owner@example.com", role=UserRole.PM)
    project_id = create_project(client, owner_headers)
    task = seed_task(db_session, project_id)

    _, outsider_headers = make_user(client, db_session, email="outsider-move@example.com")
    response = move(client, task.id, outsider_headers, "DONE")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "PROJECT_MEMBERSHIP_REQUIRED"


def test_move_missing_task_returns_404(client, db_session):
    _, headers = make_user(client, db_session, email="pm-missing@example.com", role=UserRole.PM)

    response = move(client, uuid.uuid4(), headers, "DONE")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "TASK_NOT_FOUND"
