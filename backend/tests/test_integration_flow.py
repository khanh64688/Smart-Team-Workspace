"""
Integration test toàn luồng (end-to-end) cho Smart Team Workspace.

Khác với các file test theo module (test_auth, test_task, test_comment...)
vốn kiểm tra từng endpoint một cách độc lập, file này đi hết kịch bản
nghiệp vụ mô tả trong README:

    Đăng ký → Đăng nhập → Tạo dự án → Thêm thành viên → Chia Sprint
    → Giao Task → Kéo thả Kanban → Bình luận → Thông báo
    → Lọc/thống kê Dashboard → Đóng Sprint → Đóng dự án

Mỗi bước dùng dữ liệu do bước trước sinh ra, nên test phát hiện được
những lỗi mà unit test từng module không thấy: sai kiểu dữ liệu giữa
các tầng, thiếu commit, permission không nhất quán giữa các service.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.models import User, UserRole
from app.models.project_member import ProjectRole

PASSWORD = "Password123"

# Bốn cột Kanban theo đúng thứ tự nghiệp vụ.
KANBAN_FLOW = [
    "IN_PROGRESS",
    "REVIEW",
    "DONE",
]


def utc(**offset) -> str:
    """
    Sinh mốc thời gian ISO-8601 có timezone.

    Schema TaskCreate/SprintCreate từ chối datetime naive nên mọi mốc
    thời gian trong test đều phải kèm offset.
    """

    return (
        datetime.now(UTC) + timedelta(**offset)
    ).isoformat()


def make_actor(
    client,
    db_session,
    *,
    email: str,
    full_name: str,
    role: UserRole = UserRole.MEMBER,
) -> dict:
    """
    Đăng ký một tài khoản, nâng role hệ thống nếu cần, rồi đăng nhập.

    Phải đăng nhập lại sau khi đổi role vì role được nhúng vào JWT.
    """

    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": full_name,
            "password": PASSWORD,
            "confirm_password": PASSWORD,
        },
    )

    assert register.status_code == 201, register.text

    user_id = register.json()["id"]

    if role != UserRole.MEMBER:
        user = db_session.get(
            User,
            uuid.UUID(user_id),
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

    body = login.json()

    assert body["user"]["role"] == role.value

    return {
        "id": user_id,
        "email": email,
        "full_name": full_name,
        "role": role,
        "access_token": body["access_token"],
        "refresh_token": body["refresh_token"],
        "headers": {
            "Authorization": f"Bearer {body['access_token']}",
        },
    }


@pytest.fixture()
def workspace(client, db_session) -> dict:
    """
    Dựng sẵn bối cảnh chung của một nhóm làm đồ án:

    - `pm`       : PM hệ thống, OWNER của dự án
    - `an`, `binh`: MEMBER trong dự án
    - `outsider` : MEMBER hợp lệ nhưng KHÔNG thuộc dự án
    - `admin`    : ADMIN hệ thống

    Fixture dừng ngay sau khi dự án đã có đủ thành viên. Việc tạo
    sprint/task để từng test tự làm, tránh ràng buộc chéo giữa các test.
    """

    pm = make_actor(
        client,
        db_session,
        email="pm.flow@twl.dev",
        full_name="Phuong Manager",
        role=UserRole.PM,
    )

    an = make_actor(
        client,
        db_session,
        email="an.flow@twl.dev",
        full_name="Nguyen An",
    )

    binh = make_actor(
        client,
        db_session,
        email="binh.flow@twl.dev",
        full_name="Tran Binh",
    )

    outsider = make_actor(
        client,
        db_session,
        email="outsider.flow@twl.dev",
        full_name="Le Ngoai",
    )

    admin = make_actor(
        client,
        db_session,
        email="admin.flow@twl.dev",
        full_name="Quan Tri",
        role=UserRole.ADMIN,
    )

    # PM tạo dự án — service tự thêm PM làm OWNER.
    created = client.post(
        "/api/v1/projects",
        json={
            "name": "Website TMDT",
            "description": "Do an mon Cong nghe phan mem",
        },
        headers=pm["headers"],
    )

    assert created.status_code == 201, created.text

    project = created.json()

    assert project["owner_id"] == pm["id"]
    assert project["status"] == "ACTIVE"

    # PM thêm hai thành viên vào dự án.
    for member in (an, binh):
        added = client.post(
            f"/api/v1/projects/{project['id']}/members",
            json={
                "user_id": member["id"],
                "project_role": ProjectRole.MEMBER.value,
            },
            headers=pm["headers"],
        )

        assert added.status_code == 201, added.text
        assert added.json()["project_role"] == ProjectRole.MEMBER.value

    return {
        "pm": pm,
        "an": an,
        "binh": binh,
        "outsider": outsider,
        "admin": admin,
        "project": project,
    }


class TestFullTeamWorkflow:
    """
    Luồng hạnh phúc đầy đủ, chạy tuần tự trong một transaction.
    """

    def test_project_to_kanban_done(self, client, workspace):
        pm = workspace["pm"]
        an = workspace["an"]
        project = workspace["project"]

        # --- Bước 1: dự án hiện ra trong danh sách của cả PM và MEMBER.
        for actor in (pm, an):
            listed = client.get(
                "/api/v1/projects",
                headers=actor["headers"],
            )

            assert listed.status_code == 200, listed.text

            ids = [
                item["id"]
                for item in listed.json()["data"]
            ]

            assert project["id"] in ids

        # --- Bước 2: dự án có đúng ba thành viên với đúng vai trò.
        members = client.get(
            f"/api/v1/projects/{project['id']}/members",
            headers=pm["headers"],
        )

        assert members.status_code == 200, members.text

        roles = {
            member["user_id"]: member["project_role"]
            for member in members.json()
        }

        assert roles[pm["id"]] == ProjectRole.OWNER.value
        assert roles[an["id"]] == ProjectRole.MEMBER.value
        assert len(roles) == 3

        # --- Bước 3: PM chia Sprint.
        sprint_response = client.post(
            f"/api/v1/projects/{project['id']}/sprints",
            json={
                "name": "Sprint 1",
                "goal": "Hoan thanh module dang nhap",
                "start_date": utc(days=-1),
                "end_date": utc(days=13),
            },
            headers=pm["headers"],
        )

        assert sprint_response.status_code == 201, sprint_response.text

        sprint = sprint_response.json()

        assert sprint["project_id"] == project["id"]
        assert sprint["status"] == "ACTIVE"

        # --- Bước 4: PM giao Task cho An, kèm deadline và priority.
        task_response = client.post(
            "/api/v1/tasks",
            json={
                "project_id": project["id"],
                "sprint_id": sprint["id"],
                "title": "Dung form dang nhap",
                "description": "React Hook Form + validate",
                "assignee_id": an["id"],
                "priority": "HIGH",
                "due_date": utc(days=5),
            },
            headers=pm["headers"],
        )

        assert task_response.status_code == 201, task_response.text

        task = task_response.json()

        assert task["assignee_id"] == an["id"]
        assert task["sprint_id"] == sprint["id"]
        assert task["status"] == "TODO"
        assert task["priority"] == "HIGH"
        assert task["completed_at"] is None

        # --- Bước 5: An nhận được thông báo "được giao task mới".
        notifications = client.get(
            "/api/v1/notifications",
            headers=an["headers"],
        )

        assert notifications.status_code == 200, notifications.text

        assigned = [
            item
            for item in notifications.json()
            if item["type"] == "TASK_ASSIGNED"
            and item["task_id"] == task["id"]
        ]

        assert len(assigned) == 1
        assert assigned[0]["is_read"] is False
        assert pm["full_name"] in assigned[0]["message"]

        # --- Bước 6: An kéo thẻ qua từng cột Kanban.
        # Service chỉ cho phép nhảy một bậc nên phải đi lần lượt.
        for next_status in KANBAN_FLOW:
            moved = client.patch(
                f"/api/v1/tasks/{task['id']}/move",
                json={
                    "status": next_status,
                },
                headers=an["headers"],
            )

            assert moved.status_code == 200, moved.text
            assert moved.json()["status"] == next_status

        # Chuyển sang DONE phải đóng dấu thời điểm hoàn thành.
        finished = client.get(
            f"/api/v1/tasks/{task['id']}",
            headers=an["headers"],
        )

        assert finished.status_code == 200, finished.text
        assert finished.json()["status"] == "DONE"
        assert finished.json()["completed_at"] is not None

        # --- Bước 7: PM bình luận, An nhận thông báo comment.
        comment_response = client.post(
            f"/api/v1/tasks/{task['id']}/comments",
            json={
                "content": "Nho them test cho truong hop sai mat khau nhe.",
            },
            headers=pm["headers"],
        )

        assert comment_response.status_code == 201, comment_response.text

        comment = comment_response.json()

        assert comment["author_id"] == pm["id"]
        assert comment["task_id"] == task["id"]

        comment_notifications = client.get(
            "/api/v1/notifications",
            params={
                "unread_only": True,
            },
            headers=an["headers"],
        )

        assert comment_notifications.status_code == 200

        types = [
            item["type"]
            for item in comment_notifications.json()
        ]

        assert "TASK_COMMENT" in types
        assert "TASK_ASSIGNED" in types

        # --- Bước 8: An đọc thông báo, badge chưa đọc về 0.
        read_all = client.post(
            "/api/v1/notifications/read-all",
            headers=an["headers"],
        )

        assert read_all.status_code == 200, read_all.text
        assert read_all.json()["marked"] >= 2

        unread = client.get(
            "/api/v1/notifications/unread-count",
            headers=an["headers"],
        )

        assert unread.status_code == 200
        assert unread.json()["unread_count"] == 0

        # --- Bước 9: An trả lời comment, PM đọc được cả hai.
        reply = client.post(
            f"/api/v1/tasks/{task['id']}/comments",
            json={
                "content": "Da, em bo sung trong hom nay.",
            },
            headers=an["headers"],
        )

        assert reply.status_code == 201, reply.text

        thread = client.get(
            f"/api/v1/tasks/{task['id']}/comments",
            headers=pm["headers"],
        )

        assert thread.status_code == 200, thread.text
        assert len(thread.json()) == 2

        # --- Bước 10: PM đóng Sprint sau khi task đã xong.
        closed_sprint = client.patch(
            f"/api/v1/sprints/{sprint['id']}/close",
            headers=pm["headers"],
        )

        assert closed_sprint.status_code == 200, closed_sprint.text
        assert closed_sprint.json()["status"] == "CLOSED"

        # --- Bước 11: PM (OWNER) đóng dự án, dự án chuyển sang chỉ đọc.
        closed_project = client.patch(
            f"/api/v1/projects/{project['id']}/close",
            headers=pm["headers"],
        )

        assert closed_project.status_code == 200, closed_project.text
        assert closed_project.json()["status"] == "CLOSED"

        readonly = client.put(
            f"/api/v1/projects/{project['id']}",
            json={
                "name": "Ten moi sau khi dong",
            },
            headers=pm["headers"],
        )

        assert readonly.status_code == 409, readonly.text
        assert readonly.json()["error"]["code"] == "PROJECT_CLOSED"


class TestFlowPermissionBoundaries:
    """
    Các nhánh từ chối trên đúng luồng nghiệp vụ, đối chiếu
    docs/permission-matrix.md.
    """

    @pytest.fixture()
    def board(self, client, workspace) -> dict:
        """
        Một sprint kèm task đã giao cho An, dùng chung cho cả nhóm test.
        """

        pm = workspace["pm"]
        project = workspace["project"]

        sprint = client.post(
            f"/api/v1/projects/{project['id']}/sprints",
            json={
                "name": "Sprint kiem thu quyen",
                "start_date": utc(days=-1),
                "end_date": utc(days=13),
            },
            headers=pm["headers"],
        )

        assert sprint.status_code == 201, sprint.text

        task = client.post(
            "/api/v1/tasks",
            json={
                "project_id": project["id"],
                "sprint_id": sprint.json()["id"],
                "title": "Task cua An",
                "assignee_id": workspace["an"]["id"],
            },
            headers=pm["headers"],
        )

        assert task.status_code == 201, task.text

        return {
            **workspace,
            "sprint": sprint.json(),
            "task": task.json(),
        }

    def test_outsider_bi_chan_o_moi_tang(self, client, board):
        """
        Người ngoài dự án không đọc được dự án, sprint, task hay comment.
        """

        headers = board["outsider"]["headers"]
        project_id = board["project"]["id"]
        task_id = board["task"]["id"]

        endpoints = [
            ("get", f"/api/v1/projects/{project_id}", None),
            ("get", f"/api/v1/projects/{project_id}/members", None),
            ("get", f"/api/v1/projects/{project_id}/sprints", None),
            ("get", f"/api/v1/tasks/{task_id}", None),
            ("get", f"/api/v1/tasks/{task_id}/comments", None),
        ]

        for method, url, payload in endpoints:
            response = getattr(client, method)(
                url,
                headers=headers,
                **({"json": payload} if payload else {}),
            )

            assert response.status_code == 403, (
                f"{method.upper()} {url} -> {response.status_code}"
            )

            assert (
                response.json()["error"]["code"]
                == "PROJECT_MEMBERSHIP_REQUIRED"
            )

    def test_member_khong_sua_duoc_task_nguoi_khac(self, client, board):
        """
        BR: MEMBER chỉ được sửa và chuyển trạng thái task mình phụ trách.
        """

        binh = board["binh"]
        task_id = board["task"]["id"]

        updated = client.put(
            f"/api/v1/tasks/{task_id}",
            json={
                "title": "Binh doi ten task cua An",
            },
            headers=binh["headers"],
        )

        assert updated.status_code == 403, updated.text
        assert (
            updated.json()["error"]["code"] == "TASK_UPDATE_FORBIDDEN"
        )

        moved = client.patch(
            f"/api/v1/tasks/{task_id}/move",
            json={
                "status": "IN_PROGRESS",
            },
            headers=binh["headers"],
        )

        assert moved.status_code == 403, moved.text
        assert moved.json()["error"]["code"] == "TASK_MOVE_FORBIDDEN"

    def test_member_chi_duoc_tu_gan_task(self, client, board):
        """
        BR: MEMBER tạo task thì chỉ được gán cho chính mình.
        """

        binh = board["binh"]
        project_id = board["project"]["id"]

        forbidden = client.post(
            "/api/v1/tasks",
            json={
                "project_id": project_id,
                "title": "Binh giao viec cho An",
                "assignee_id": board["an"]["id"],
            },
            headers=binh["headers"],
        )

        assert forbidden.status_code == 403, forbidden.text
        assert (
            forbidden.json()["error"]["code"] == "TASK_SELF_ASSIGN_ONLY"
        )

        # Không truyền assignee thì service tự gán cho chính người tạo.
        allowed = client.post(
            "/api/v1/tasks",
            json={
                "project_id": project_id,
                "title": "Binh tu nhan viec",
            },
            headers=binh["headers"],
        )

        assert allowed.status_code == 201, allowed.text
        assert allowed.json()["assignee_id"] == binh["id"]

    def test_member_khong_duoc_giao_viec_va_tao_sprint(self, client, board):
        """
        Giao việc và tạo Sprint là quyền của OWNER/MANAGER/ADMIN.
        """

        binh = board["binh"]

        assigned = client.patch(
            f"/api/v1/tasks/{board['task']['id']}/assign",
            json={
                "assignee_id": binh["id"],
            },
            headers=binh["headers"],
        )

        assert assigned.status_code == 403, assigned.text
        assert (
            assigned.json()["error"]["code"] == "PROJECT_MANAGER_REQUIRED"
        )

        sprint = client.post(
            f"/api/v1/projects/{board['project']['id']}/sprints",
            json={
                "name": "Sprint cua Binh",
                "start_date": utc(days=1),
                "end_date": utc(days=15),
            },
            headers=binh["headers"],
        )

        assert sprint.status_code == 403, sprint.text

    def test_khong_the_nhay_cot_kanban(self, client, board):
        """
        BR: kéo thẻ chỉ được nhảy một bậc, TODO → DONE bị từ chối.
        """

        an = board["an"]

        skipped = client.patch(
            f"/api/v1/tasks/{board['task']['id']}/move",
            json={
                "status": "DONE",
            },
            headers=an["headers"],
        )

        assert skipped.status_code == 400, skipped.text
        assert (
            skipped.json()["error"]["code"] == "TASK_INVALID_TRANSITION"
        )

    def test_khong_giao_task_cho_nguoi_ngoai_du_an(self, client, board):
        """
        BR: người được giao task phải là thành viên dự án.
        """

        response = client.patch(
            f"/api/v1/tasks/{board['task']['id']}/assign",
            json={
                "assignee_id": board["outsider"]["id"],
            },
            headers=board["pm"]["headers"],
        )

        assert response.status_code == 400, response.text
        assert (
            response.json()["error"]["code"]
            == "TASK_ASSIGNEE_NOT_PROJECT_MEMBER"
        )

    def test_admin_di_xuyen_moi_tang(self, client, board):
        """
        ADMIN không phải thành viên dự án nhưng vẫn đọc và sửa được.
        """

        admin = board["admin"]

        readable = client.get(
            f"/api/v1/projects/{board['project']['id']}",
            headers=admin["headers"],
        )

        assert readable.status_code == 200, readable.text

        moved = client.patch(
            f"/api/v1/tasks/{board['task']['id']}/move",
            json={
                "status": "IN_PROGRESS",
            },
            headers=admin["headers"],
        )

        assert moved.status_code == 200, moved.text
        assert moved.json()["status"] == "IN_PROGRESS"

    def test_khong_co_token_thi_bi_tu_choi(self, client, board):
        """
        Mọi endpoint nghiệp vụ đều nằm sau lớp xác thực.
        """

        response = client.get(
            f"/api/v1/tasks/{board['task']['id']}",
        )

        assert response.status_code == 401, response.text


class TestFlowNotificationLifecycle:
    """
    Vòng đời thông báo bám theo US-18: giao việc, bình luận,
    sắp đến hạn và quá hạn.
    """

    def test_deadline_sinh_thong_bao_va_khong_bi_lap(self, client, workspace):
        pm = workspace["pm"]
        an = workspace["an"]
        project = workspace["project"]

        # Một task sắp đến hạn (trong 24 giờ) và một task đã quá hạn.
        due_soon = client.post(
            "/api/v1/tasks",
            json={
                "project_id": project["id"],
                "title": "Task sap den han",
                "assignee_id": an["id"],
                "due_date": utc(hours=6),
            },
            headers=pm["headers"],
        )

        assert due_soon.status_code == 201, due_soon.text

        overdue = client.post(
            "/api/v1/tasks",
            json={
                "project_id": project["id"],
                "title": "Task da qua han",
                "assignee_id": an["id"],
                "due_date": utc(days=-2),
            },
            headers=pm["headers"],
        )

        assert overdue.status_code == 201, overdue.text

        # Không có scheduler: thông báo deadline sinh ngay khi đọc danh sách.
        first_poll = client.get(
            "/api/v1/notifications",
            headers=an["headers"],
        )

        assert first_poll.status_code == 200, first_poll.text

        by_type = {}

        for item in first_poll.json():
            by_type.setdefault(item["type"], []).append(item)

        assert len(by_type.get("TASK_DUE_SOON", [])) == 1
        assert len(by_type.get("TASK_OVERDUE", [])) == 1
        assert len(by_type.get("TASK_ASSIGNED", [])) == 2

        # Frontend poll 30 giây một lần — gọi lại không được nhân bản.
        second_poll = client.get(
            "/api/v1/notifications",
            headers=an["headers"],
        )

        assert second_poll.status_code == 200
        assert len(second_poll.json()) == len(first_poll.json())

    def test_khong_tu_bao_cho_chinh_minh(self, client, workspace):
        """
        Tự nhận việc hoặc tự bình luận trên task của mình thì không
        sinh thông báo.
        """

        an = workspace["an"]

        self_task = client.post(
            "/api/v1/tasks",
            json={
                "project_id": workspace["project"]["id"],
                "title": "An tu nhan viec",
            },
            headers=an["headers"],
        )

        assert self_task.status_code == 201, self_task.text

        self_comment = client.post(
            f"/api/v1/tasks/{self_task.json()['id']}/comments",
            json={
                "content": "Ghi chu cho chinh minh.",
            },
            headers=an["headers"],
        )

        assert self_comment.status_code == 201, self_comment.text

        notifications = client.get(
            "/api/v1/notifications",
            headers=an["headers"],
        )

        assert notifications.status_code == 200

        related = [
            item
            for item in notifications.json()
            if item["task_id"] == self_task.json()["id"]
        ]

        assert related == []

    def test_thong_bao_cua_nguoi_khac_tra_ve_404(self, client, workspace):
        """
        Không được phép biết thông báo của người khác có tồn tại hay không.
        """

        pm = workspace["pm"]
        an = workspace["an"]

        task = client.post(
            "/api/v1/tasks",
            json={
                "project_id": workspace["project"]["id"],
                "title": "Task de sinh thong bao",
                "assignee_id": an["id"],
            },
            headers=pm["headers"],
        )

        assert task.status_code == 201, task.text

        notifications = client.get(
            "/api/v1/notifications",
            headers=an["headers"],
        )

        notification_id = notifications.json()[0]["id"]

        # Bình đọc trộm thông báo của An.
        stolen = client.patch(
            f"/api/v1/notifications/{notification_id}/read",
            headers=workspace["binh"]["headers"],
        )

        assert stolen.status_code == 404, stolen.text
        assert (
            stolen.json()["error"]["code"] == "NOTIFICATION_NOT_FOUND"
        )

        # Chính chủ thì đọc được.
        owned = client.patch(
            f"/api/v1/notifications/{notification_id}/read",
            headers=an["headers"],
        )

        assert owned.status_code == 200, owned.text
        assert owned.json()["is_read"] is True


class TestFlowDashboardAndFilters:
    """
    Dữ liệu nền của Dashboard và bộ lọc Kanban đều lấy từ
    GET /api/v1/tasks, nên nhóm test này kiểm tra trực tiếp endpoint đó.
    """

    @pytest.fixture()
    def seeded_board(self, client, workspace) -> dict:
        """
        Gieo 4 task đủ trạng thái, priority, assignee và tình trạng deadline.
        """

        pm = workspace["pm"]
        project = workspace["project"]

        sprint = client.post(
            f"/api/v1/projects/{project['id']}/sprints",
            json={
                "name": "Sprint thong ke",
                "start_date": utc(days=-2),
                "end_date": utc(days=12),
            },
            headers=pm["headers"],
        )

        assert sprint.status_code == 201, sprint.text

        sprint_id = sprint.json()["id"]

        specs = [
            ("Thiet ke ERD", "HIGH", workspace["an"], sprint_id, utc(days=-3)),
            ("Viet API login", "URGENT", workspace["an"], sprint_id, utc(days=4)),
            ("Dung layout", "LOW", workspace["binh"], sprint_id, utc(days=6)),
            ("Viet tai lieu", "MEDIUM", workspace["binh"], None, None),
        ]

        tasks = []

        for title, priority, assignee, sprint_ref, due in specs:
            payload = {
                "project_id": project["id"],
                "title": title,
                "priority": priority,
                "assignee_id": assignee["id"],
            }

            if sprint_ref is not None:
                payload["sprint_id"] = sprint_ref

            if due is not None:
                payload["due_date"] = due

            created = client.post(
                "/api/v1/tasks",
                json=payload,
                headers=pm["headers"],
            )

            assert created.status_code == 201, created.text

            tasks.append(created.json())

        # Đẩy task đầu tiên sang IN_PROGRESS để có phân bố trạng thái.
        moved = client.patch(
            f"/api/v1/tasks/{tasks[0]['id']}/move",
            json={
                "status": "IN_PROGRESS",
            },
            headers=pm["headers"],
        )

        assert moved.status_code == 200, moved.text

        tasks[0] = moved.json()

        return {
            **workspace,
            "sprint_id": sprint_id,
            "tasks": tasks,
        }

    def list_tasks(self, client, board, actor, **params) -> list[dict]:
        response = client.get(
            "/api/v1/tasks",
            params={
                "project_id": board["project"]["id"],
                **params,
            },
            headers=actor["headers"],
        )

        assert response.status_code == 200, response.text

        return response.json()

    def test_thong_ke_theo_trang_thai_va_priority(self, client, seeded_board):
        pm = seeded_board["pm"]

        every = self.list_tasks(client, seeded_board, pm)

        assert len(every) == 4

        by_status = {}

        for task in every:
            by_status[task["status"]] = by_status.get(task["status"], 0) + 1

        assert by_status == {
            "TODO": 3,
            "IN_PROGRESS": 1,
        }

        todo = self.list_tasks(
            client,
            seeded_board,
            pm,
            status="TODO",
        )

        assert len(todo) == 3
        assert {task["status"] for task in todo} == {"TODO"}

        urgent = self.list_tasks(
            client,
            seeded_board,
            pm,
            priority="URGENT",
        )

        assert len(urgent) == 1
        assert urgent[0]["title"] == "Viet API login"

    def test_loc_theo_nguoi_phu_trach_va_sprint(self, client, seeded_board):
        pm = seeded_board["pm"]

        of_an = self.list_tasks(
            client,
            seeded_board,
            pm,
            assignee=seeded_board["an"]["id"],
        )

        assert len(of_an) == 2
        assert {
            task["assignee_id"] for task in of_an
        } == {seeded_board["an"]["id"]}

        in_sprint = self.list_tasks(
            client,
            seeded_board,
            pm,
            sprint=seeded_board["sprint_id"],
        )

        assert len(in_sprint) == 3
        assert all(
            task["sprint_id"] == seeded_board["sprint_id"]
            for task in in_sprint
        )

    def test_loc_qua_han_va_tim_kiem(self, client, seeded_board):
        pm = seeded_board["pm"]

        overdue = self.list_tasks(
            client,
            seeded_board,
            pm,
            overdue=True,
        )

        assert len(overdue) == 1
        assert overdue[0]["title"] == "Thiet ke ERD"

        found = self.list_tasks(
            client,
            seeded_board,
            pm,
            q="API",
        )

        assert len(found) == 1
        assert found[0]["title"] == "Viet API login"

        empty = self.list_tasks(
            client,
            seeded_board,
            pm,
            q="khong-ton-tai-tu-khoa-nay",
        )

        assert empty == []

    def test_member_thay_cung_bang_du_lieu_voi_pm(self, client, seeded_board):
        """
        Bảng Kanban dùng chung cho cả nhóm: MEMBER thấy mọi task của dự án,
        không chỉ task của mình.
        """

        pm_view = self.list_tasks(client, seeded_board, seeded_board["pm"])
        member_view = self.list_tasks(client, seeded_board, seeded_board["an"])

        assert {task["id"] for task in pm_view} == {
            task["id"] for task in member_view
        }

    def test_phan_trang_khong_lam_mat_du_lieu(self, client, seeded_board):
        pm = seeded_board["pm"]

        first_page = self.list_tasks(
            client,
            seeded_board,
            pm,
            page=1,
            size=3,
        )

        second_page = self.list_tasks(
            client,
            seeded_board,
            pm,
            page=2,
            size=3,
        )

        assert len(first_page) == 3
        assert len(second_page) == 1

        ids = {task["id"] for task in first_page} | {
            task["id"] for task in second_page
        }

        assert len(ids) == 4


class TestFlowAuthSession:
    """
    Vòng đời phiên đăng nhập chạy song song với luồng nghiệp vụ:
    access token ngắn hạn, refresh token dài hạn, đổi mật khẩu thu hồi hết.
    """

    def test_refresh_va_doi_mat_khau_thu_hoi_phien(self, client, workspace):
        an = workspace["an"]
        project_id = workspace["project"]["id"]

        # Refresh cấp access token mới và token đó dùng được ngay.
        refreshed = client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": an["refresh_token"],
            },
        )

        assert refreshed.status_code == 200, refreshed.text

        new_headers = {
            "Authorization": f"Bearer {refreshed.json()['access_token']}",
        }

        still_works = client.get(
            f"/api/v1/projects/{project_id}",
            headers=new_headers,
        )

        assert still_works.status_code == 200, still_works.text

        # Đổi mật khẩu thu hồi toàn bộ refresh token đang có.
        changed = client.put(
            "/api/v1/auth/change-password",
            json={
                "old_password": PASSWORD,
                "new_password": "MatKhauMoi456",
            },
            headers=an["headers"],
        )

        assert changed.status_code == 200, changed.text

        revoked = client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": an["refresh_token"],
            },
        )

        assert revoked.status_code == 401, revoked.text

        # Mật khẩu cũ không dùng được nữa, mật khẩu mới thì được.
        old_login = client.post(
            "/api/v1/auth/login",
            json={
                "email": an["email"],
                "password": PASSWORD,
            },
        )

        assert old_login.status_code == 401, old_login.text

        new_login = client.post(
            "/api/v1/auth/login",
            json={
                "email": an["email"],
                "password": "MatKhauMoi456",
            },
        )

        assert new_login.status_code == 200, new_login.text

    def test_logout_thu_hoi_dung_mot_phien(self, client, workspace):
        binh = workspace["binh"]

        logged_out = client.post(
            "/api/v1/auth/logout",
            json={
                "refresh_token": binh["refresh_token"],
            },
        )

        assert logged_out.status_code == 200, logged_out.text

        reused = client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": binh["refresh_token"],
            },
        )

        assert reused.status_code == 401, reused.text


class TestFlowMemberRemoval:
    """
    Rời dự án giữa chừng là tình huống thật của nhóm sinh viên:
    task của người rời phải được gỡ khỏi người đó, không bị xoá.
    """

    def test_xoa_thanh_vien_go_task_ve_chua_giao(self, client, workspace):
        pm = workspace["pm"]
        an = workspace["an"]
        project_id = workspace["project"]["id"]

        task = client.post(
            "/api/v1/tasks",
            json={
                "project_id": project_id,
                "title": "Task se bi bo lai",
                "assignee_id": an["id"],
            },
            headers=pm["headers"],
        )

        assert task.status_code == 201, task.text

        removed = client.delete(
            f"/api/v1/projects/{project_id}/members/{an['id']}",
            headers=pm["headers"],
        )

        assert removed.status_code == 204, removed.text

        # Task vẫn còn nhưng không còn người phụ trách.
        orphan = client.get(
            f"/api/v1/tasks/{task.json()['id']}",
            headers=pm["headers"],
        )

        assert orphan.status_code == 200, orphan.text
        assert orphan.json()["assignee_id"] is None

        # Người đã rời thì mất quyền truy cập dự án.
        blocked = client.get(
            f"/api/v1/projects/{project_id}",
            headers=an["headers"],
        )

        assert blocked.status_code == 403, blocked.text

    def test_owner_cuoi_cung_khong_the_roi_du_an(self, client, workspace):
        pm = workspace["pm"]
        project_id = workspace["project"]["id"]

        response = client.delete(
            f"/api/v1/projects/{project_id}/members/me",
            headers=pm["headers"],
        )

        assert response.status_code == 400, response.text
        assert (
            response.json()["error"]["code"] == "LAST_OWNER_REQUIRED"
        )
