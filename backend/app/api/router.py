from fastapi import APIRouter

from app.api.v1 import auth
from app.api.v1 import users
from app.api.v1 import projects
from app.api.v1 import sprint
from app.api.v1 import task
from app.api.v1 import comment
from app.api.v1 import chat
from app.core.config import settings


# API version prefix được cấu hình tập trung qua settings/.env.
# Prefix của từng resource được khai báo trong router của module tương ứng.
api_router = APIRouter(
    prefix=settings.api_v1_prefix
)


api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(sprint.router)
api_router.include_router(task.router)
api_router.include_router(comment.router)
api_router.include_router(chat.router)


__all__ = [
    "api_router",
]
