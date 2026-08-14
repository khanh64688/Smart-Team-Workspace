from __future__ import annotations

from fastapi import FastAPI
from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.core.exception_handlers import (
    register_exception_handlers,
)
from app.core.exception_handlers import (
    register_exception_handlers,
)


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API cho hệ thống Smart Team Workspace.",
)



register_exception_handlers(app)




app.include_router(api_router)


@app.get(
    "/",
    tags=["System"],
)
def root() -> dict[str, str]:
    return {
        "message": settings.app_name,
        "docs": "/docs",
    }


@app.get(
    "/health",
    tags=["System"],
)
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "environment": settings.app_env,
    }
