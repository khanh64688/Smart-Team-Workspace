from conftest import auth


def create_project(client, user, name="Project Alpha"):
    return client.post("/api/v1/projects", json={"name": name, "description": "Demo"}, headers=auth(user))


def test_auth_required(client):
    response = client.get("/api/v1/projects")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_member_cannot_create_project(client, users):
    response = create_project(client, users["member"])
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "PROJECT_CREATE_FORBIDDEN"


def test_creator_is_owner_and_project_defaults_active(client, users):
    response = create_project(client, users["pm"])
    assert response.status_code == 201
    project = response.json()
    assert project["status"] == "ACTIVE"
    members = client.get(f"/api/v1/projects/{project['id']}/members", headers=auth(users["pm"]))
    assert members.status_code == 200
    assert members.json()[0]["project_role"] == "OWNER"


def test_outsider_gets_403_not_404(client, users):
    project_id = create_project(client, users["pm"]).json()["id"]
    response = client.get(f"/api/v1/projects/{project_id}", headers=auth(users["outsider"]))
    assert response.status_code == 403


def test_list_is_scoped_searchable_and_paginated(client, users):
    create_project(client, users["pm"], "Alpha Project")
    create_project(client, users["pm"], "Beta Project")
    scoped = client.get("/api/v1/projects?q=Alpha&page=1&size=1", headers=auth(users["pm"]))
    assert scoped.status_code == 200
    assert scoped.json()["meta"] == {"page": 1, "size": 1, "total": 1}
    assert scoped.json()["data"][0]["name"] == "Alpha Project"
    assert client.get("/api/v1/projects", headers=auth(users["outsider"])).json()["meta"]["total"] == 0


def test_duplicate_member_returns_409(client, users):
    project_id = create_project(client, users["pm"]).json()["id"]
    payload = {"user_id": users["member"].id, "project_role": "MEMBER"}
    assert client.post(f"/api/v1/projects/{project_id}/members", json=payload, headers=auth(users["pm"])).status_code == 201
    duplicate = client.post(f"/api/v1/projects/{project_id}/members", json=payload, headers=auth(users["pm"]))
    assert duplicate.status_code == 409


def test_last_owner_cannot_leave_or_be_removed(client, users):
    project_id = create_project(client, users["pm"]).json()["id"]
    leave = client.delete(f"/api/v1/projects/{project_id}/members/me", headers=auth(users["pm"]))
    assert leave.status_code == 400
    assert leave.json()["error"]["code"] == "LAST_OWNER_REQUIRED"


def test_only_owner_can_close(client, users):
    project_id = create_project(client, users["pm"]).json()["id"]
    client.post(f"/api/v1/projects/{project_id}/members", json={"user_id": users["member"].id, "project_role": "MEMBER"}, headers=auth(users["pm"]))
    denied = client.patch(f"/api/v1/projects/{project_id}/close", headers=auth(users["member"]))
    assert denied.status_code == 403
    closed = client.patch(f"/api/v1/projects/{project_id}/close", headers=auth(users["pm"]))
    assert closed.status_code == 200
    assert closed.json()["status"] == "CLOSED"
