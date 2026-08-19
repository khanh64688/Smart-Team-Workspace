from fastapi import APIRouter

from app.api.v1 import auth, chat, comment, notification, projects, sprint, task, users
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
api_router.include_router(notification.router)
api_router.include_router(chat.router)


__all__ = [
    "api_router",
]
