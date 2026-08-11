from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.models.project import ProjectStatus
from app.models.task import Task
from app.models.user import User
from app.repositories.task import TaskRepository, now_utc
from app.schemas.task import TaskMoveRequest
from app.services.project import ProjectService

DONE = "DONE"


class TaskService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TaskRepository(db)
        self.projects = ProjectService(db)

    def require_task(self, task_id: uuid.UUID, actor: User) -> Task:
        task = self.repo.get(task_id)
        if not task:
            raise api_error(404, "TASK_NOT_FOUND", "Không tìm thấy công việc.")

        # Quyền nằm ở dự án chứ không ở task: ai đọc được bảng Kanban của
        # dự án thì kéo thả được thẻ trên đó.
        self.projects.require_member(task.project_id, actor)
        return task

    def move(self, task_id: uuid.UUID, payload: TaskMoveRequest, actor: User) -> Task:
        task = self.require_task(task_id, actor)

        project = self.projects.require_project(task.project_id)
        if project.status == ProjectStatus.CLOSED:
            raise api_error(409, "PROJECT_CLOSED", "Dự án đã đóng và chỉ có thể đọc.")

        task.status = payload.status

        if payload.position is not None:
            task.position = payload.position

        # completed_at phải đi theo status, nếu không thì thẻ kéo ngược từ
        # DONE về IN_PROGRESS vẫn mang mốc hoàn thành cũ và báo cáo sai.
        if payload.status == DONE:
            task.completed_at = task.completed_at or now_utc()
        else:
            task.completed_at = None

        self.db.commit()
        self.db.refresh(task)
        return task


__all__ = ["TaskService"]
