"""
Seed data cho Smart Team Workspace.

Sinh dữ liệu demo đủ để:
  - Đăng nhập bằng cả 3 vai trò (ADMIN / PM / MEMBER)
  - Kanban có thẻ ở cả 4 cột
  - Dashboard có số liệu thật (bao gồm task quá hạn)
  - AI Sprint Summary có đủ ngữ cảnh để tóm tắt có ý nghĩa

Cách chạy
---------
    docker compose exec backend python -m app.scripts.seed_data
    docker compose exec backend python -m app.scripts.seed_data --reset   # xoá sạch rồi tạo lại

Ghi chú cho nhóm
----------------
Script này CHỈ import từ app.models và app.core.security.
Nếu TV2/TV3/TV4 đổi tên field trong model, sửa phần MAPPING ở đầu file là đủ.
Tác giả: TV1
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.comment import Comment
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.user import User

# --------------------------------------------------------------------------- #
# Cấu hình
# --------------------------------------------------------------------------- #

DEFAULT_PASSWORD = "Password123"
NOW = datetime.now(timezone.utc)
random.seed(42)  # cố định để mỗi lần seed ra kết quả giống nhau, dễ quay video demo


# --------------------------------------------------------------------------- #
# Dữ liệu người dùng
# --------------------------------------------------------------------------- #

USERS = [
    # (email, họ tên, vai trò hệ thống)
    ("admin@twl.dev", "Nguyễn Quản Trị", "ADMIN"),
    ("pm@twl.dev", "Trần Minh Quản", "PM"),
    ("lap@twl.dev", "Hoàng Văn Lập", "PM"),
    ("an@twl.dev", "Lê Thị An", "MEMBER"),
    ("binh@twl.dev", "Phạm Quốc Bình", "MEMBER"),
    ("chi@twl.dev", "Đỗ Ngọc Chi", "MEMBER"),
    ("dung@twl.dev", "Vũ Tiến Dũng", "MEMBER"),
    ("em@twl.dev", "Bùi Hà Em", "MEMBER"),
]


# --------------------------------------------------------------------------- #
# Dữ liệu dự án / sprint / task
# --------------------------------------------------------------------------- #

PROJECT_ALPHA = {
    "name": "Website Thương mại điện tử",
    "description": "Đồ án môn Phát triển ứng dụng Web — xây dựng sàn TMĐT thu nhỏ.",
    "owner": "pm@twl.dev",
    "members": ["an@twl.dev", "binh@twl.dev", "chi@twl.dev", "dung@twl.dev"],
}

PROJECT_BETA = {
    "name": "Ứng dụng Quản lý Chi tiêu",
    "description": "Bài tập lớn môn Lập trình di động — app ghi chép thu chi cá nhân.",
    "owner": "lap@twl.dev",
    "members": ["chi@twl.dev", "em@twl.dev"],
}

# (tiêu đề, trạng thái, priority, lệch deadline theo ngày so với hôm nay, email người phụ trách)
TASKS_ALPHA_SPRINT_1 = [
    ("Thiết kế ERD cho toàn hệ thống", "DONE", "HIGH", -8, "an@twl.dev"),
    ("Dựng skeleton FastAPI + Docker Compose", "DONE", "HIGH", -7, "binh@twl.dev"),
    ("API đăng ký / đăng nhập với JWT", "DONE", "URGENT", -5, "an@twl.dev"),
    ("Màn hình đăng nhập bằng React", "DONE", "MEDIUM", -4, "chi@twl.dev"),
    ("Viết unit test cho module xác thực", "REVIEW", "HIGH", -1, "an@twl.dev"),
    ("API CRUD sản phẩm", "IN_PROGRESS", "URGENT", 1, "binh@twl.dev"),
    ("Trang danh sách sản phẩm + phân trang", "IN_PROGRESS", "HIGH", 2, "chi@twl.dev"),
    ("Chức năng giỏ hàng phía frontend", "IN_PROGRESS", "MEDIUM", 3, "dung@twl.dev"),
    ("Tích hợp cổng thanh toán sandbox", "TODO", "HIGH", 5, "binh@twl.dev"),
    ("Trang quản trị đơn hàng", "TODO", "MEDIUM", 6, "dung@twl.dev"),
    ("Tối ưu truy vấn danh sách sản phẩm", "TODO", "LOW", 8, None),
    ("Viết tài liệu API bằng OpenAPI", "TODO", "MEDIUM", 9, "chi@twl.dev"),
    # --- các task quá hạn, tạo tín hiệu rủi ro cho AI summary ---
    ("Chức năng tìm kiếm sản phẩm nâng cao", "IN_PROGRESS", "URGENT", -3, "dung@twl.dev"),
    ("Upload ảnh sản phẩm lên object storage", "TODO", "HIGH", -2, "binh@twl.dev"),
    ("Phân quyền trang quản trị", "REVIEW", "HIGH", -1, "an@twl.dev"),
]

TASKS_ALPHA_BACKLOG = [
    ("Gợi ý sản phẩm bằng AI", "TODO", "LOW", 20, None),
    ("Đánh giá và bình luận sản phẩm", "TODO", "MEDIUM", 18, None),
    ("Xuất báo cáo doanh thu CSV", "TODO", "LOW", 22, None),
]

TASKS_BETA_SPRINT_1 = [
    ("Thiết kế giao diện màn hình chính", "DONE", "HIGH", -6, "chi@twl.dev"),
    ("Model dữ liệu giao dịch", "DONE", "HIGH", -5, "em@twl.dev"),
    ("Chức năng thêm khoản chi", "IN_PROGRESS", "URGENT", 1, "em@twl.dev"),
    ("Biểu đồ chi tiêu theo tháng", "IN_PROGRESS", "HIGH", 2, "chi@twl.dev"),
    ("Đặt hạn mức chi tiêu và cảnh báo", "TODO", "MEDIUM", 4, "em@twl.dev"),
    ("Đồng bộ dữ liệu lên cloud", "TODO", "LOW", 7, None),
    ("Sửa lỗi sai định dạng tiền tệ", "REVIEW", "HIGH", -1, "chi@twl.dev"),
    ("Chế độ tối cho toàn ứng dụng", "TODO", "LOW", 10, None),
]

COMMENTS = [
    "Mình đang bị vướng phần này, chiều nay ai rảnh review giúp với.",
    "Đã đẩy code lên nhánh feature, mọi người xem PR nhé.",
    "Phần này phụ thuộc API của bạn Bình, đợi merge xong mình làm tiếp.",
    "Đã test trên máy local, chạy ổn.",
    "Có thể lùi deadline task này sang sprint sau được không ạ?",
    "Đang chờ phản hồi từ trainer về yêu cầu này.",
    "Mình fix xong bug rồi, chuyển sang Review nhé.",
    "Cần thống nhất lại format response trước khi làm tiếp.",
    "Task này to hơn dự kiến, mình đề xuất tách làm hai.",
    "Đã cập nhật tài liệu API tương ứng.",
]


# --------------------------------------------------------------------------- #
# Hàm hỗ trợ
# --------------------------------------------------------------------------- #


def log(message: str) -> None:
    print(f"  {message}")


def reset_database(db: Session) -> None:
    """Xoá toàn bộ dữ liệu theo đúng thứ tự khoá ngoại."""
    log("Đang xoá dữ liệu cũ...")
    for model in (Comment, Task, Sprint, ProjectMember, Project, User):
        db.execute(delete(model))
    db.commit()
    log("Đã xoá xong.")


def create_users(db: Session) -> dict[str, User]:
    log("Tạo người dùng...")
    users: dict[str, User] = {}
    for email, full_name, role in USERS:
        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(DEFAULT_PASSWORD),
            role=role,
            is_active=True,
            created_at=NOW - timedelta(days=30),
        )
        db.add(user)
        users[email] = user
    db.flush()
    log(f"Đã tạo {len(users)} người dùng (mật khẩu chung: {DEFAULT_PASSWORD})")
    return users


def create_project(db: Session, spec: dict, users: dict[str, User]) -> Project:
    owner = users[spec["owner"]]
    project = Project(
        name=spec["name"],
        description=spec["description"],
        status="ACTIVE",
        owner_id=owner.id,
        created_at=NOW - timedelta(days=21),
    )
    db.add(project)
    db.flush()

    db.add(ProjectMember(project_id=project.id, user_id=owner.id, project_role="OWNER"))
    for email in spec["members"]:
        db.add(
            ProjectMember(
                project_id=project.id,
                user_id=users[email].id,
                project_role="MEMBER",
            )
        )
    db.flush()
    log(f"Dự án '{project.name}' — {len(spec['members']) + 1} thành viên")
    return project


def create_sprint(
    db: Session,
    project: Project,
    name: str,
    goal: str,
    start_offset: int,
    end_offset: int,
    status: str,
) -> Sprint:
    sprint = Sprint(
        project_id=project.id,
        name=name,
        goal=goal,
        start_date=NOW + timedelta(days=start_offset),
        end_date=NOW + timedelta(days=end_offset),
        status=status,
    )
    db.add(sprint)
    db.flush()
    return sprint


def create_tasks(
    db: Session,
    project: Project,
    sprint: Sprint | None,
    specs: list[tuple],
    users: dict[str, User],
) -> list[Task]:
    tasks: list[Task] = []
    position_by_status: dict[str, int] = {}

    for title, status, priority, due_offset, assignee_email in specs:
        position_by_status[status] = position_by_status.get(status, 0) + 65536
        task = Task(
            project_id=project.id,
            sprint_id=sprint.id if sprint else None,
            title=title,
            description=f"Chi tiết yêu cầu cho: {title}. Xem thêm trong docs/backlog.md.",
            assignee_id=users[assignee_email].id if assignee_email else None,
            status=status,
            priority=priority,
            due_date=NOW + timedelta(days=due_offset),
            position=position_by_status[status],
            created_at=NOW - timedelta(days=random.randint(5, 18)),
            completed_at=NOW - timedelta(days=random.randint(1, 5))
            if status == "DONE"
            else None,
        )
        db.add(task)
        tasks.append(task)

    db.flush()
    return tasks


def create_comments(db: Session, tasks: list[Task], users: dict[str, User]) -> int:
    """Gắn comment vào các task đang làm dở — đây là nguồn tín hiệu 'blocker' cho AI."""
    candidates = [t for t in tasks if t.status in ("IN_PROGRESS", "REVIEW")]
    user_list = list(users.values())
    count = 0

    for task in candidates:
        for _ in range(random.randint(1, 3)):
            author = (
                task.assignee_id
                and next((u for u in user_list if u.id == task.assignee_id), None)
            ) or random.choice(user_list)
            db.add(
                Comment(
                    task_id=task.id,
                    author_id=author.id,
                    content=random.choice(COMMENTS),
                    created_at=NOW - timedelta(days=random.randint(0, 4)),
                )
            )
            count += 1

    db.flush()
    return count


# --------------------------------------------------------------------------- #
# Điểm vào
# --------------------------------------------------------------------------- #


def seed(reset: bool = False) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if reset:
            reset_database(db)
        elif db.execute(select(User).limit(1)).scalar_one_or_none():
            print("Database đã có dữ liệu. Dùng --reset nếu muốn tạo lại từ đầu.")
            return

        print("\nBắt đầu seed dữ liệu Smart Team Workspace\n")

        users = create_users(db)

        # ---------------- Dự án 1 ----------------
        alpha = create_project(db, PROJECT_ALPHA, users)
        alpha_s0 = create_sprint(
            db, alpha, "Sprint 0 — Khởi tạo",
            "Dựng nền tảng dự án và hoàn thiện xác thực.",
            -21, -8, "CLOSED",
        )
        alpha_s1 = create_sprint(
            db, alpha, "Sprint 1 — Chức năng cốt lõi",
            "Hoàn thành quản lý sản phẩm, giỏ hàng và thanh toán.",
            -7, 7, "ACTIVE",
        )
        tasks_alpha = create_tasks(db, alpha, alpha_s1, TASKS_ALPHA_SPRINT_1, users)
        tasks_alpha += create_tasks(db, alpha, None, TASKS_ALPHA_BACKLOG, users)
        log(f"  Sprint: {alpha_s0.name}, {alpha_s1.name} — {len(tasks_alpha)} task")

        # ---------------- Dự án 2 ----------------
        beta = create_project(db, PROJECT_BETA, users)
        beta_s1 = create_sprint(
            db, beta, "Sprint 1 — MVP",
            "Ghi chép giao dịch và hiển thị biểu đồ cơ bản.",
            -5, 9, "ACTIVE",
        )
        tasks_beta = create_tasks(db, beta, beta_s1, TASKS_BETA_SPRINT_1, users)
        log(f"  Sprint: {beta_s1.name} — {len(tasks_beta)} task")

        # ---------------- Comment ----------------
        n_comments = create_comments(db, tasks_alpha + tasks_beta, users)
        log(f"Đã tạo {n_comments} bình luận")

        db.commit()

        # ---------------- Tổng kết ----------------
        all_tasks = tasks_alpha + tasks_beta
        overdue = [
            t for t in all_tasks
            if t.due_date and t.due_date < NOW and t.status != "DONE"
        ]

        print("\n" + "=" * 62)
        print("SEED HOÀN TẤT")
        print("=" * 62)
        print(f"  Người dùng      : {len(users)}")
        print(f"  Dự án           : 2")
        print(f"  Sprint          : 3")
        print(f"  Task            : {len(all_tasks)}  (quá hạn: {len(overdue)})")
        print(f"  Bình luận       : {n_comments}")
        print("-" * 62)
        print("  TÀI KHOẢN ĐĂNG NHẬP  (mật khẩu chung: " + DEFAULT_PASSWORD + ")")
        print("    admin@twl.dev   ADMIN   — quản trị hệ thống")
        print("    pm@twl.dev      PM      — chủ dự án TMĐT  (dùng cho demo chính)")
        print("    an@twl.dev      MEMBER  — nhiều task, có task quá hạn")
        print("=" * 62 + "\n")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed dữ liệu demo cho Smart Team Workspace")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Xoá toàn bộ dữ liệu hiện có trước khi seed",
    )
    args = parser.parse_args()

    try:
        seed(reset=args.reset)
    except Exception as exc:  # noqa: BLE001
        print(f"\nSeed thất bại: {exc}\n", file=sys.stderr)
        sys.exit(1)
