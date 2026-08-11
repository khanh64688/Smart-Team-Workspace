from fastapi import APIRouter

from app.api.routes import auth, users
from app.api.v1 import projects


api_router = APIRouter()


api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

api_router.include_router(projects.router)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"],
)


__all__ = [
    "api_router",
]
