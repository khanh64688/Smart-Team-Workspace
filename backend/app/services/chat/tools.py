from __future__ import annotations

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.user import User
from app.repositories.sprint import SprintRepository
from app.repositories.task_insights import TaskInsightsRepository, now_utc

# Số dòng tối đa nhồi vào prompt cho mỗi tool. Một dự án 300 task mà đưa
# hết vào thì vừa tốn token vừa làm mô hình trả lời lan man.
MAX_ROWS = 20


@dataclass
class ToolContext:
    """
    Phạm vi dữ liệu của một lượt hỏi.

    project_id đến từ request và ĐÃ qua require_member. Mô hình không
    bao giờ được điền trường này: nếu để nó tự chọn dự án thì chỉ cần
    điền nhầm (hoặc bị người dùng dụ điền) là rò rỉ dữ liệu chéo dự án.
    """

    db: Session
    actor: User
    project_id: uuid.UUID

    @property
    def tasks(self) -> TaskInsightsRepository:
        return TaskInsightsRepository(self.db)

    @property
    def sprints(self) -> SprintRepository:
        return SprintRepository(self.db)


def _slim(task: Task) -> dict[str, Any]:
    """
    Rút gọn task trước khi đưa vào prompt.

    Cố tình bỏ description và comment: đó là văn bản dài do người dùng
    gõ tự do, vừa tốn token vừa là chỗ thuận tiện nhất để nhét câu lệnh
    tấn công vào ngữ cảnh của mô hình.
    """
    days_late = None

    if task.due_date and task.status != "DONE":
        delta = (now_utc() - task.due_date).days
        if delta > 0:
            days_late = delta

    return {
        "title": task.title,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date.date().isoformat() if task.due_date else None,
        "assignee": task.assignee.full_name if task.assignee else None,
        "days_late": days_late,
    }


# --------------------------------------------------------------------------- #
# Các tool
# --------------------------------------------------------------------------- #


def _get_overdue_tasks(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    only_mine = bool(args.get("only_mine"))

    tasks = ctx.tasks.list_overdue(
        ctx.project_id,
        assignee_id=ctx.actor.id if only_mine else None,
    )

    return {
        "scope": "chỉ task của người đang hỏi" if only_mine else "toàn dự án",
        "total": len(tasks),
        "tasks": [_slim(t) for t in tasks[:MAX_ROWS]],
    }


def _get_my_tasks(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    tasks = [
        t
        for t in ctx.tasks.list_by_project(
            ctx.project_id,
            assignee_id=ctx.actor.id,
            limit=MAX_ROWS * 2,
        )
        if t.status != "DONE"
    ]

    return {
        "assignee": ctx.actor.full_name,
        "total": len(tasks),
        "tasks": [_slim(t) for t in tasks[:MAX_ROWS]],
    }


def _list_tasks(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    status = args.get("status")

    tasks = ctx.tasks.list_by_project(
        ctx.project_id,
        status=status if status in ("TODO", "IN_PROGRESS", "REVIEW", "DONE") else None,
        limit=MAX_ROWS,
    )

    return {
        "filter_status": status,
        "total": len(tasks),
        "tasks": [_slim(t) for t in tasks],
    }


def _get_sprint_progress(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    sprint = ctx.sprints.get_active_by_project(ctx.project_id)

    counts = ctx.tasks.count_by_status(
        ctx.project_id,
        sprint_id=sprint.id if sprint else None,
    )

    total = sum(counts.values())
    done = counts.get("DONE", 0)
    overdue = ctx.tasks.list_overdue(ctx.project_id)

    return {
        "sprint": sprint.name if sprint else None,
        "total_tasks": total,
        "done": done,
        "percent_done": round(done * 100 / total) if total else 0,
        "by_status": counts,
        "overdue_count": len(overdue),
        "overdue_titles": [t.title for t in overdue[:MAX_ROWS]],
    }


def _get_member_workload(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    workload = ctx.tasks.workload_by_assignee(ctx.project_id)

    return {
        "note": "Số task chưa hoàn thành của từng thành viên.",
        "members": [
            {"name": user.full_name, "open_tasks": total}
            for user, total in workload[:MAX_ROWS]
        ],
    }


# --------------------------------------------------------------------------- #
# Khai báo gửi cho mô hình
# --------------------------------------------------------------------------- #

# Lưu ý: không tool nào nhận project_id. Mô hình chỉ được chọn HỎI GÌ,
# không được chọn HỎI Ở ĐÂU.
TOOLS: dict[str, tuple[dict[str, Any], Callable[[ToolContext, dict], dict]]] = {
    "get_overdue_tasks": (
        {
            "name": "get_overdue_tasks",
            "description": (
                "Lấy danh sách task đã quá hạn (due_date đã qua và chưa DONE) "
                "trong dự án đang mở."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "only_mine": {
                        "type": "boolean",
                        "description": (
                            "True nếu chỉ lấy task của chính người đang hỏi."
                        ),
                    }
                },
            },
        },
        _get_overdue_tasks,
    ),
    "get_my_tasks": (
        {
            "name": "get_my_tasks",
            "description": (
                "Lấy các task chưa hoàn thành được giao cho chính người đang hỏi."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
        _get_my_tasks,
    ),
    "list_tasks": (
        {
            "name": "list_tasks",
            "description": (
                "Liệt kê task của dự án đang mở, có thể lọc theo trạng thái."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["TODO", "IN_PROGRESS", "REVIEW", "DONE"],
                        "description": "Trạng thái cần lọc.",
                    }
                },
            },
        },
        _list_tasks,
    ),
    "get_sprint_progress": (
        {
            "name": "get_sprint_progress",
            "description": (
                "Lấy tiến độ sprint đang chạy: tổng số task, số đã xong, "
                "phần trăm hoàn thành và số task quá hạn."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
        _get_sprint_progress,
    ),
    "get_member_workload": (
        {
            "name": "get_member_workload",
            "description": (
                "Đếm số task chưa hoàn thành của từng thành viên, dùng để "
                "biết ai đang quá tải."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
        _get_member_workload,
    ),
}


def declarations() -> list[dict[str, Any]]:
    return [declaration for declaration, _ in TOOLS.values()]


def run_tool(
    name: str,
    ctx: ToolContext,
    args: dict[str, Any],
) -> dict[str, Any]:
    """
    Chạy tool theo tên mô hình đã chọn.

    Tên lạ thì trả lỗi dưới dạng dữ liệu chứ không ném exception: mô hình
    đôi khi bịa tên tool, và để nó tự sửa ở lượt sau rẻ hơn là làm hỏng
    cả request.
    """
    entry = TOOLS.get(name)

    if entry is None:
        return {"error": f"Không có tool tên '{name}'."}

    _, handler = entry

    return handler(ctx, args or {})


__all__ = ["MAX_ROWS", "ToolContext", "declarations", "run_tool"]
