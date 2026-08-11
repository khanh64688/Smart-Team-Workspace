from fastapi import APIRouter

from app.api.routes import auth, users
from app.api.v1 import chat
from app.api.v1 import projects
from app.api.v1 import sprint
from app.api.v1 import tasks


api_router = APIRouter()


api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

api_router.include_router(projects.router)
api_router.include_router(sprint.router)
api_router.include_router(tasks.router)
api_router.include_router(chat.router)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"],
)


__all__ = [
    "api_router",
]
