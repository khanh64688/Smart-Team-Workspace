from __future__ import annotations

from typing import Any


class ServiceError(Exception):
    """
    Exception cơ sở của tầng service.

    Sang mốc 9, exception handler sẽ chuyển lỗi này
    thành HTTP response.
    """

    status_code: int = 500

    def __init__(
        self,
        *,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.details = details

        super().__init__(message)


class BadRequestError(ServiceError):
    status_code = 400


class UnauthorizedError(ServiceError):
    status_code = 401


class ForbiddenError(ServiceError):
    status_code = 403


class NotFoundError(ServiceError):
    status_code = 404


class ConflictError(ServiceError):
    status_code = 409


class TooManyRequestsError(ServiceError):
    status_code = 429


class ServiceUnavailableError(ServiceError):
    """
    Phụ thuộc bên ngoài không dùng được.

    Ví dụ: chưa cấu hình AI_API_KEY, hoặc nhà cung cấp AI trả lỗi.
    """

    status_code = 503


class GatewayTimeoutError(ServiceError):
    """
    Phụ thuộc bên ngoài phản hồi quá chậm.

    Dùng cho lời gọi tới nhà cung cấp AI vượt quá ai_timeout_seconds.
    """

    status_code = 504