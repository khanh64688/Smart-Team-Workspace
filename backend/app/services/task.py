import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
)
from app.models import User, UserRole
from app.models.project_member import ProjectRole
from app.models.task import Task
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.schemas.task import (
    TaskAssign,
    TaskCreate,
    TaskMove,
    TaskUpdate,
)


class TaskService:
    def __init__(self, db):
        self.db = db
        self.tasks = TaskRepository(db)
        self.projects = ProjectRepository(db)

    def get_task(
        self,
        task_id: uuid.UUID,
    ) -> Task:
        task = self.tasks.get(task_id)

        if task is None:
            raise NotFoundError(
                code="TASK_NOT_FOUND",
                message="Không tìm thấy task.",
                details={
                    "task_id": str(task_id),
                },
            )

        return task

    def get_project_membership(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
    ):
        project = self.projects.get(project_id)

        if project is None:
            raise NotFoundError(
                code="PROJECT_NOT_FOUND",
                message="Không tìm thấy project.",
                details={
                    "project_id": str(project_id),
                },
            )

        membership = self.projects.membership(
            project_id,
            user_id,
        )

        if membership is None:
            raise ForbiddenError(
                code="PROJECT_MEMBERSHIP_REQUIRED",
                message="Bạn không phải thành viên của project.",
                details={
                    "project_id": str(project_id),
                },
            )

        return membership

    def require_manager(
        self,
        project_id: uuid.UUID,
        current_user: User,
    ):
        if current_user.role == UserRole.ADMIN:
            return None

        membership = self.get_project_membership(
            project_id,
            current_user.id,
        )

        if membership.project_role not in (
            ProjectRole.OWNER,
            ProjectRole.MANAGER,
        ):
            raise ForbiddenError(
                code="TASK_MANAGER_REQUIRED",
                message="Chỉ OWNER hoặc MANAGER mới có quyền thực hiện hành động này.",
            )

        return membership

    def require_task_access(
        self,
        task: Task,
        current_user: User,
    ):
        if current_user.role == UserRole.ADMIN:
            return None

        membership = self.get_project_membership(
            task.project_id,
            current_user.id,
        )

        return membership

    def require_assignee_member(
        self,
        project_id: uuid.UUID,
        assignee_id: uuid.UUID,
    ):
        membership = self.projects.membership(
            project_id,
            assignee_id,
        )

        if membership is None:
            raise BadRequestError(
                code="TASK_ASSIGNEE_NOT_PROJECT_MEMBER",
                message="Người được giao task phải là thành viên của project.",
                details={
                    "assignee_id": str(assignee_id),
                    "project_id": str(project_id),
                },
            )

        return membership

    def list_tasks(
        self,
        project_id: uuid.UUID,
        current_user: User,
    ) -> list[Task]:

        self.get_project_membership(
            project_id,
            current_user.id,
        )

        return self.tasks.list_by_project(
            project_id,
        )

    def get(
        self,
        task_id: uuid.UUID,
        current_user: User,
    ) -> Task:

        task = self.get_task(task_id)

        self.require_task_access(
            task,
            current_user,
        )

        return task

    def create(
        self,
        payload: TaskCreate,
        current_user: User,
    ) -> Task:

        membership = self.get_project_membership(
            payload.project_id,
            current_user.id,
        )

        assignee_id = payload.assignee_id

        if (
            current_user.role != UserRole.ADMIN
            and membership.project_role == ProjectRole.MEMBER
        ):
            if (
                assignee_id is not None
                and assignee_id != current_user.id
            ):
                raise ForbiddenError(
                    code="TASK_SELF_ASSIGN_ONLY",
                    message="MEMBER chỉ được tự gán task cho chính mình.",
                )

            assignee_id = current_user.id

        if assignee_id is not None:
            self.require_assignee_member(
                payload.project_id,
                assignee_id,
            )

        if payload.sprint_id is not None:
            sprint = self.tasks.get_sprint(
                payload.sprint_id,
            )

            if sprint is None:
                raise NotFoundError(
                    code="SPRINT_NOT_FOUND",
                    message="Không tìm thấy sprint.",
                    details={
                        "sprint_id": str(payload.sprint_id),
                    },
                )

            if str(sprint.project_id) != str(
                payload.project_id
            ):
                raise BadRequestError(
                    code="TASK_SPRINT_PROJECT_MISMATCH",
                    message="Sprint không thuộc project của task.",
                )

        task = Task(
            project_id=payload.project_id,
            sprint_id=payload.sprint_id,
            title=payload.title,
            description=payload.description,
            assignee_id=assignee_id,
            status=payload.status,
            priority=payload.priority,
            due_date=payload.due_date,
            position=payload.position,
            created_at=datetime.now(timezone.utc),
        )

        try:
            self.tasks.create(task)
            self.db.commit()
            self.db.refresh(task)

            return task

        except Exception:
            self.db.rollback()
            raise

    def update(
        self,
        task_id: uuid.UUID,
        payload: TaskUpdate,
        current_user: User,
    ) -> Task:

        task = self.get_task(task_id)

        membership = self.require_task_access(
            task,
            current_user,
        )

        if (
            current_user.role != UserRole.ADMIN
            and membership.project_role == ProjectRole.MEMBER
        ):
            if task.assignee_id != current_user.id:
                raise ForbiddenError(
                    code="TASK_UPDATE_FORBIDDEN",
                    message="MEMBER chỉ được sửa task mình phụ trách.",
                )

        changes: dict[str, Any] = payload.model_dump(
            exclude_unset=True,
        )

        # Không cho PUT thay đổi assignee.
        # Việc assign phải thông qua /assign.
        changes.pop("assignee_id", None)

        for field, value in changes.items():
            setattr(task, field, value)

        try:
            self.tasks.update(task)
            self.db.commit()
            self.db.refresh(task)

            return task

        except Exception:
            self.db.rollback()
            raise

    def assign(
        self,
        task_id: uuid.UUID,
        payload: TaskAssign,
        current_user: User,
    ) -> Task:

        task = self.get_task(task_id)

        self.require_manager(
            task.project_id,
            current_user,
        )

        if payload.assignee_id is not None:
            self.require_assignee_member(
                task.project_id,
                payload.assignee_id,
            )

        task.assignee_id = payload.assignee_id

        try:
            self.db.commit()
            self.db.refresh(task)

            return task

        except Exception:
            self.db.rollback()
            raise


    def move(
        self,
        task_id: uuid.UUID,
        payload: TaskMove,
        current_user: User,
    ) -> Task:

        task = self.get_task(task_id)

        membership = self.require_task_access(
            task,
            current_user,
        )

        if (
            current_user.role != UserRole.ADMIN
            and membership.project_role == ProjectRole.MEMBER
        ):
            if task.assignee_id != current_user.id:
                raise ForbiddenError(
                    code="TASK_MOVE_FORBIDDEN",
                    message="MEMBER chỉ được đổi trạng thái task mình phụ trách.",
                )

        current_status = task.status
        new_status = payload.status

        status_order = {
            "TODO": 0,
            "IN_PROGRESS": 1,
            "REVIEW": 2,
            "DONE": 3,
        }

        difference = abs(
            status_order[new_status]
            - status_order[current_status]
        )

        if difference > 1:
            raise BadRequestError(
                code="TASK_INVALID_TRANSITION",
                message=(
                    f"Không thể chuyển task từ "
                    f"{current_status} sang {new_status}."
                ),
            )

        task.status = new_status


        if new_status == "DONE":
            task.completed_at = datetime.now(
                timezone.utc,
            )

        elif current_status == "DONE":
            task.completed_at = None

        try:
            self.db.commit()
            self.db.refresh(task)

            return task

        except Exception:
            self.db.rollback()
            raise


    def delete(
        self,
        task_id: uuid.UUID,
        current_user: User,
    ) -> None:

        task = self.get_task(task_id)

        self.require_manager(
            task.project_id,
            current_user,
        )

        try:
            self.tasks.delete(task)
            self.db.commit()

        except Exception:
            self.db.rollback()
            raise
