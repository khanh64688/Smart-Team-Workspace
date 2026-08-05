from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import (
    HTTPException as StarletteHTTPException,
)

from app.core.exceptions import ServiceError


def _error_content(
    *,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Tạo format lỗi thống nhất cho toàn hệ thống.
    """
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details,
        }
    }


async def service_error_handler(
    _request: Request,
    exc: ServiceError,
) -> JSONResponse:
    """
    Chuyển ServiceError thành HTTP response.

    Ví dụ:
        UnauthorizedError → 401
        ForbiddenError    → 403
        NotFoundError     → 404
        ConflictError     → 409
    """
    headers: dict[str, str] = {}

    if exc.status_code == 401:
        headers["WWW-Authenticate"] = "Bearer"

    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(
            _error_content(
                code=exc.code,
                message=exc.message,
                details=exc.details,
            )
        ),
        headers=headers,
    )


async def validation_error_handler(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """
    Chuẩn hóa lỗi Pydantic/FastAPI thành format lỗi chung.

    Không đưa giá trị input vào response để tránh phản hồi lại
    mật khẩu hoặc dữ liệu nhạy cảm.
    """
    validation_errors = [
        {
            "type": error["type"],
            "location": list(error["loc"]),
            "message": error["msg"],
        }
        for error in exc.errors()
    ]

    return JSONResponse(
        status_code=422,
        content=jsonable_encoder(
            _error_content(
                code="REQUEST_VALIDATION_ERROR",
                message="Dữ liệu gửi lên không hợp lệ.",
                details={
                    "errors": validation_errors,
                },
            )
        ),
    )


async def http_exception_handler(
    _request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    """
    Chuẩn hóa các lỗi HTTP do FastAPI/Starlette sinh ra,
    ví dụ route không tồn tại.
    """
    if isinstance(exc.detail, str):
        code = f"HTTP_{exc.status_code}"
        message = exc.detail
        details = None
    elif isinstance(exc.detail, dict) and "error" in exc.detail:
        # Detail was set via api_error() → {"error": {"code": ..., "message": ...}}
        code = exc.detail["error"].get("code", f"HTTP_{exc.status_code}")
        message = exc.detail["error"].get("message", "Yêu cầu không thể được xử lý.")
        details = exc.detail["error"].get("details") or None
    else:
        code = f"HTTP_{exc.status_code}"
        message = "Yêu cầu không thể được xử lý."
        details = {
            "detail": exc.detail,
        }

    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(
            _error_content(
                code=code,
                message=message,
                details=details,
            )
        ),
        headers=exc.headers,
    )


def register_exception_handlers(
    app: FastAPI,
) -> None:
    """
    Đăng ký toàn bộ exception handler vào FastAPI app.
    """
    app.add_exception_handler(
        ServiceError,
        service_error_handler,
    )

    app.add_exception_handler(
        RequestValidationError,
        validation_error_handler,
    )

    app.add_exception_handler(
        StarletteHTTPException,
        http_exception_handler,
    )