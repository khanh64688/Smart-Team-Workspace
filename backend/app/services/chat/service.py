from __future__ import annotations

import re
import time
import uuid
from collections import defaultdict

from sqlalchemy.orm import Session

from app.core.exceptions import TooManyRequestsError
from app.models.user import User
from app.prompts.chat import CHAT_SYSTEM_PROMPT
from app.schemas.chat import (
    AISummaryResponse,
    ChatRequest,
    ChatResponse,
)
from app.services.chat.tools import (
    MAX_ROWS,
    ToolContext,
    declarations,
    run_tool,
)
from app.services.llm_client import (
    LLMClient,
    model_turn,
    tool_result_turn,
    user_turn,
)
from app.services.project import ProjectService

# Chặn cứng số vòng gọi tool. Không dùng while: mô hình gọi tool lòng
# vòng là đốt tiền thật, và một request treo lâu thì người dùng bỏ đi.
MAX_TOOL_ROUNDS = 2

# Số lượt hội thoại cũ được nhồi lại vào prompt.
MAX_HISTORY_TURNS = 6


# Gợi ý hỏi tiếp: sinh bằng code theo tool vừa dùng. Nhờ mô hình đẻ ra
# thì tốn thêm token và có nguy cơ trả về JSON hỏng, trong khi bộ gợi ý
# này vốn cố định.
FOLLOW_UPS: dict[str, list[str]] = {
    "get_overdue_tasks": [
        "Ai đang phụ trách các task này?",
        "Nên chia lại việc thế nào?",
    ],
    "get_my_tasks": [
        "Task nào của tôi sắp tới hạn?",
        "Tôi nên ưu tiên task nào trước?",
    ],
    "get_sprint_progress": [
        "Ai đang quá tải?",
        "Task nào đang rủi ro nhất?",
    ],
    "get_member_workload": [
        "Task nào có thể chuyển giao?",
        "Tóm tắt tiến độ sprint hiện tại",
    ],
    "list_tasks": [
        "Task nào đang quá hạn?",
        "Tóm tắt tiến độ sprint hiện tại",
    ],
}

DEFAULT_FOLLOW_UPS = [
    "Tóm tắt tiến độ sprint hiện tại",
    "Task nào đang quá hạn?",
]


# --------------------------------------------------------------------------- #
# Rate limit
# --------------------------------------------------------------------------- #

# Đủ cho phạm vi đồ án: một tiến trình, lưu trong bộ nhớ, mất khi restart.
# Mục đích là chặn vòng lặp lỗi ở frontend xả sạch quota, không phải
# chống tấn công.
_RATE_WINDOW_SECONDS = 3600
_RATE_MAX_REQUESTS = 30
_recent_calls: dict[uuid.UUID, list[float]] = defaultdict(list)


def _enforce_rate_limit(user_id: uuid.UUID) -> None:
    now = time.monotonic()

    calls = [
        stamp
        for stamp in _recent_calls[user_id]
        if now - stamp < _RATE_WINDOW_SECONDS
    ]

    if len(calls) >= _RATE_MAX_REQUESTS:
        raise TooManyRequestsError(
            code="AI_RATE_LIMIT_EXCEEDED",
            message=(
                f"Bạn đã hỏi trợ lý {_RATE_MAX_REQUESTS} lần trong một giờ. "
                "Vui lòng thử lại sau."
            ),
        )

    calls.append(now)
    _recent_calls[user_id] = calls


# --------------------------------------------------------------------------- #
# Dọn Markdown
# --------------------------------------------------------------------------- #

_MARKDOWN_RULES = [
    (re.compile(r"\*\*(.+?)\*\*", re.S), r"\1"),
    (re.compile(r"__(.+?)__", re.S), r"\1"),
    (re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", re.S), r"\1"),
    (re.compile(r"^#{1,6}\s*", re.M), ""),
    (re.compile(r"^\s*[\*\+]\s+", re.M), "- "),
    (re.compile(r"^\s*-{3,}\s*$", re.M), ""),
    (re.compile(r"\n{3,}"), "\n\n"),
]


def strip_markdown(text: str) -> str:
    """
    Lưới an toàn cho quy tắc "không dùng Markdown" trong system prompt.

    Prompt là lời dặn chứ không phải bảo đảm — Gemini vẫn thỉnh thoảng
    trả về **in đậm**, mà bong bóng chat ở frontend render text thuần
    nên dấu sao sẽ hiện nguyên ra màn hình.
    """
    for pattern, replacement in _MARKDOWN_RULES:
        text = pattern.sub(replacement, text)

    return text.strip()


# --------------------------------------------------------------------------- #
# Service
# --------------------------------------------------------------------------- #


class ChatService:
    def __init__(
        self,
        db: Session,
        llm: LLMClient | None = None,
    ) -> None:
        self.db = db

        # Cho tiêm client từ ngoài để test dùng FakeLLMClient: test không
        # gọi mạng, không đốt quota, chạy được trong CI không cần API key.
        self.llm = llm or LLMClient()
        self.projects = ProjectService(db)

    def ask(
        self,
        *,
        data: ChatRequest,
        actor: User,
    ) -> ChatResponse:
        # Kiểm quyền TRƯỚC khi tốn một token nào. Người ngoài dự án phải
        # nhận 403 chứ không phải một câu trả lời lịch sự.
        self.projects.require_member(data.project_id, actor)

        _enforce_rate_limit(actor.id)

        ctx = ToolContext(
            db=self.db,
            actor=actor,
            project_id=data.project_id,
        )

        contents = self._build_contents(data)

        used_tool: str | None = None
        text = ""

        for _ in range(MAX_TOOL_ROUNDS):
            reply = self.llm.generate_with_tools(
                contents=contents,
                tools=declarations(),
                system=CHAT_SYSTEM_PROMPT,
            )

            text = reply.text

            if not reply.tool_calls:
                break

            call = reply.tool_calls[0]
            used_tool = call.name
            result = run_tool(call.name, ctx, call.args)

            # Phải ghép lại nguyên văn lượt của mô hình thì nó mới nhớ
            # là mình đã gọi tool nào.
            contents.append(model_turn(reply.raw_parts))
            contents.append(tool_result_turn(call.name, result))

        if not text:
            # Hết vòng mà mô hình vẫn đòi gọi thêm tool. Gọi lần cuối,
            # lần này không đưa tool nào, buộc nó phải trả lời bằng
            # dữ liệu đã có.
            text = self.llm.generate_with_tools(
                contents=contents,
                tools=[],
                system=CHAT_SYSTEM_PROMPT,
            ).text

        return ChatResponse(
            reply=strip_markdown(text) or "Mình chưa tìm được dữ liệu phù hợp.",
            summary=(
                self._build_summary(ctx)
                if used_tool == "get_sprint_progress"
                else None
            ),
            suggestions=FOLLOW_UPS.get(used_tool or "", DEFAULT_FOLLOW_UPS),
        )

    def _build_contents(self, data: ChatRequest) -> list[dict]:
        contents: list[dict] = []

        for item in data.history[-MAX_HISTORY_TURNS:]:
            turn = user_turn(item.content)

            if item.role == "assistant":
                turn["role"] = "model"

            contents.append(turn)

        contents.append(user_turn(data.message))

        return contents

    def _build_summary(self, ctx: ToolContext) -> AISummaryResponse:
        """
        Dựng thẻ tóm tắt bằng SQL, không nhờ mô hình đếm.

        Bắt mô hình tự đếm task rồi hiển thị lên thẻ là cách nhanh nhất
        để có một con số sai chình ình giữa buổi demo.
        """
        sprint = ctx.sprints.get_active_by_project(ctx.project_id)
        sprint_id = sprint.id if sprint else None

        counts = ctx.tasks.count_by_status(ctx.project_id, sprint_id=sprint_id)
        total = sum(counts.values())
        done = counts.get("DONE", 0)
        percent = round(done * 100 / total) if total else 0

        completed = ctx.tasks.list_by_project(
            ctx.project_id,
            status="DONE",
            sprint_id=sprint_id,
            limit=5,
        )

        overdue = ctx.tasks.list_overdue(ctx.project_id, limit=MAX_ROWS)

        overloaded = [
            f"{user.full_name} ({total_open} task chưa xong)"
            for user, total_open in ctx.tasks.workload_by_assignee(ctx.project_id)
            if total_open >= 4
        ]

        next_priorities = [
            task.title
            for task in ctx.tasks.list_by_project(ctx.project_id, limit=50)
            if task.status != "DONE" and task.priority in ("URGENT", "HIGH")
        ][:3]

        sprint_label = f"Sprint {sprint.name}" if sprint else "Dự án"

        return AISummaryResponse(
            overview=(
                f"{sprint_label} đã hoàn thành {done}/{total} task ({percent}%). "
                f"Hiện có {len(overdue)} task quá hạn."
            ),
            completed=[task.title for task in completed],
            at_risk=[task.title for task in overdue[:5]],
            # Nhận diện blocker cần phân tích nội dung comment — chưa làm,
            # nên để trống thay vì bịa. Frontend tự ẩn mục rỗng.
            blockers=[],
            overloaded_members=overloaded,
            next_priorities=next_priorities,
        )


__all__ = ["ChatService", "strip_markdown"]
