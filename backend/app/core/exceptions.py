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