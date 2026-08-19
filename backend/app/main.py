from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.exception_handlers import (
    register_exception_handlers,
)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API cho hệ thống Smart Team Workspace.",
)


# Chạy bằng docker-compose thì frontend đi qua nginx proxy (same-origin) nên
# không cần CORS; middleware này để dành cho `npm run dev` ở cổng 5173 gọi
# thẳng backend 8000 — khi đó trình duyệt gửi preflight OPTIONS trước mỗi
# request POST/PUT có Content-Type: application/json.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
