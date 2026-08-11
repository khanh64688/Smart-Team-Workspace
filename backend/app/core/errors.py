from typing import Any

from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError, ServiceError, UnauthorizedError


def api_error(status: int, code: str, message: str, details: Any = None) -> ServiceError:
    """Adapter TV3 sang hệ thống ServiceError chuẩn của TV2."""
    error_types = {
        400: BadRequestError,
        401: UnauthorizedError,
        403: ForbiddenError,
        404: NotFoundError,
        409: ConflictError,
    }
    error_type = error_types.get(status, ServiceError)
    return error_type(code=code, message=message, details=details)
