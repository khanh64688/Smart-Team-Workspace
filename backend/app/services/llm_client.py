from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import (
    GatewayTimeoutError,
    ServiceUnavailableError,
    TooManyRequestsError,
)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


@dataclass
class ToolCall:
    """Một lời gọi tool do mô hình đề xuất."""

    name: str
    args: dict[str, Any]


@dataclass
class LLMReply:
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)

    # Nguyên văn phần trả lời của mô hình. Phải ghép lại vào contents
    # ở lượt sau thì mô hình mới biết nó đã gọi tool nào.
    raw_parts: list[dict[str, Any]] = field(default_factory=list)


def user_turn(text: str) -> dict[str, Any]:
    return {
        "role": "user",
        "parts": [{"text": text}],
    }


def model_turn(parts: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "role": "model",
        "parts": parts,
    }


def tool_result_turn(
    name: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """
    Kết quả chạy tool ở phía backend, gửi ngược cho mô hình.

    Gemini nhận functionResponse dưới role "user" (không phải "model"):
    đây là dữ liệu đi vào mô hình, không phải lời của mô hình.
    """
    return {
        "role": "user",
        "parts": [
            {
                "functionResponse": {
                    "name": name,
                    "response": data,
                }
            }
        ],
    }


class LLMClient:
    """
    Client mỏng cho nhà cung cấp AI.

    Dùng chung cho AI Sprint Summary và chatbot: đổi Gemini sang provider
    khác chỉ phải sửa ở đây. Chạy trên httpx (đã có sẵn trong
    requirements.txt) nên không cần thêm SDK nào.
    """

    def __init__(
        self,
        *,
        provider: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.provider = (provider or settings.ai_provider).strip().lower()
        self.api_key = (api_key or settings.ai_api_key).strip()
        self.model = model or settings.ai_model
        self.timeout = timeout or settings.ai_timeout_seconds

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key) and self.provider not in ("", "none")

    def _ensure_configured(self) -> None:
        if not self.api_key or self.provider in ("", "none"):
            raise ServiceUnavailableError(
                code="AI_NOT_CONFIGURED",
                message=(
                    "Tính năng AI chưa được cấu hình. Cần điền AI_API_KEY "
                    "vào .env ở gốc repo hoặc backend/.env, rồi khởi động "
                    "lại backend."
                ),
            )

        if self.provider != "gemini":
            raise ServiceUnavailableError(
                code="AI_PROVIDER_UNSUPPORTED",
                message=f"Chưa hỗ trợ nhà cung cấp AI '{self.provider}'.",
                details={"supported": ["gemini"]},
            )

    def _post(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        self._ensure_configured()

        url = f"{GEMINI_BASE_URL}/models/{self.model}:generateContent"

        try:
            response = httpx.post(
                url,
                json=payload,
                timeout=self.timeout,
                headers={
                    # Truyền key qua header thay vì query string: query string
                    # hay bị ghi lại trong access log của proxy.
                    "x-goog-api-key": self.api_key,
                    "Content-Type": "application/json",
                },
            )

        except httpx.TimeoutException as exc:
            raise GatewayTimeoutError(
                code="AI_TIMEOUT",
                message=(
                    f"Nhà cung cấp AI không phản hồi trong {self.timeout:.0f} giây."
                ),
            ) from exc

        except httpx.RequestError as exc:
            raise ServiceUnavailableError(
                code="AI_UNREACHABLE",
                message="Không kết nối được tới nhà cung cấp AI.",
            ) from exc

        if response.status_code == 429:
            # Hết quota bên Gemini là lỗi giới hạn tần suất, không phải
            # dịch vụ chết. Trả đúng 429 để frontend nói được với người
            # dùng là "thử lại sau" thay vì "hệ thống lỗi".
            raise TooManyRequestsError(
                code="AI_RATE_LIMITED",
                message=(
                    "Đã hết lượt gọi AI cho phép lúc này. "
                    "Vui lòng thử lại sau ít phút."
                ),
                details={
                    "provider_message": _provider_message(response),
                },
            )

        if response.status_code != 200:
            raise ServiceUnavailableError(
                code="AI_PROVIDER_ERROR",
                message="Nhà cung cấp AI trả về lỗi.",
                details={
                    "status": response.status_code,
                    "provider_message": _provider_message(response),
                },
            )

        return response.json()

    def _build_payload(
        self,
        *,
        contents: list[dict[str, Any]],
        system: str | None,
        tools: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": settings.ai_max_output_tokens,
            },
        }

        if system:
            payload["systemInstruction"] = {
                "parts": [{"text": system}]
            }

        if tools:
            payload["tools"] = [{"functionDeclarations": tools}]

        return payload

    def generate(
        self,
        *,
        user: str,
        system: str | None = None,
    ) -> str:
        """Sinh văn bản thuần, không dùng tool."""

        data = self._post(
            self._build_payload(
                contents=[user_turn(user)],
                system=system,
                tools=None,
            )
        )

        return _parse_reply(data).text

    def generate_with_tools(
        self,
        *,
        contents: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        system: str | None = None,
    ) -> LLMReply:
        """
        Một lượt tool-calling.

        Mô hình chỉ được chọn tên tool trong `tools` và điền tham số —
        nó không sinh SQL và không chạm vào database. Việc chạy tool
        do ChatService làm, qua tầng repository đã lọc quyền.
        """

        data = self._post(
            self._build_payload(
                contents=contents,
                system=system,
                tools=tools,
            )
        )

        return _parse_reply(data)


def _provider_message(response: httpx.Response) -> str:
    """Bóc message lỗi của provider, không để lộ payload đã gửi."""

    try:
        body = response.json()
    except ValueError:
        return response.text[:200]

    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            return str(error.get("message", ""))[:300]

    return ""


def _parse_reply(data: dict[str, Any]) -> LLMReply:
    candidates = data.get("candidates") or []

    if not candidates:
        # Không có candidate nghĩa là prompt bị chặn bởi bộ lọc an toàn.
        feedback = data.get("promptFeedback") or {}
        raise ServiceUnavailableError(
            code="AI_EMPTY_RESPONSE",
            message="Nhà cung cấp AI không trả về nội dung nào.",
            details={"block_reason": feedback.get("blockReason")},
        )

    parts = (candidates[0].get("content") or {}).get("parts") or []

    texts: list[str] = []
    tool_calls: list[ToolCall] = []

    for part in parts:
        # Model dòng 3.x trả kèm phần suy luận nội bộ — không phải câu
        # trả lời cho người dùng, phải bỏ qua.
        if part.get("thought"):
            continue

        if "text" in part:
            texts.append(part["text"])

        function_call = part.get("functionCall")
        if function_call:
            tool_calls.append(
                ToolCall(
                    name=function_call.get("name", ""),
                    args=function_call.get("args") or {},
                )
            )

    return LLMReply(
        text="\n".join(texts).strip(),
        tool_calls=tool_calls,
        raw_parts=parts,
    )


__all__ = [
    "LLMClient",
    "LLMReply",
    "ToolCall",
    "model_turn",
    "tool_result_turn",
    "user_turn",
]
