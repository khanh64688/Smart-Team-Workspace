import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.models.project_member import ProjectRole
from app.models.task import Task
from app.models.user import User, UserRole
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.schemas.task import (
    TaskAssign,
    TaskCreate,
    TaskMove,
    TaskUpdate,
)
from app.services.notification import NotificationService
from app.services.project import ProjectService

MAX_TASKS_PER_PROJECT = 100
class TaskService:
    def __init__(self, db: Session):
        self.db = db

        # Repository của Task
        self.repo = TaskRepository(db)

        # ProjectService xử lý permission của actor
        self.project_service = ProjectService(db)

        # một user cụ thể có thuộc project hay không.
        self.project_repo = ProjectRepository(db)

        # Sinh thông báo khi task được giao cho người khác.
        self.notification_service = NotificationService(db)

    def require_task(
        self,
        task_id: uuid.UUID,
    ) -> Task:

        task = self.repo.get(task_id)

        if not task:
            raise api_error(
                404,
                "TASK_NOT_FOUND",
                "Không tìm thấy task.",
            )

        return task

    def require_task_member(
        self,
        task: Task,
        actor: User,
    ):

        return self.project_service.require_member(
            task.project_id,
            actor,
        )

    def require_assignee_member(
        self,
        project_id: uuid.UUID,
        assignee_id: uuid.UUID,
    ):

        membership = self.project_repo.membership(
            project_id,
            assignee_id,
        )

        if not membership:
            raise api_error(
                400,
                "TASK_ASSIGNEE_NOT_PROJECT_MEMBER",
                "Người được giao task phải là thành viên của project.",
                details={
                    "project_id": str(project_id),
                    "assignee_id": str(assignee_id),
                },
            )

        return membership

    # def list_tasks(
    #     self,
    #     project_id: uuid.UUID,
    #     actor: User,
    # ) -> list[Task]:

    #     self.project_service.require_member(
    #         project_id,
    #         actor,
    #     )

    #     return self.repo.list_by_project(
    #         project_id,
    #     )

    def list_tasks(
        self,
        project_id: uuid.UUID,
        actor: User,
        q: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        assignee_id: uuid.UUID | None = None,
        sprint_id: uuid.UUID | None = None,
        overdue: bool = False,
        page: int = 1,
        size: int = 20,
    ) -> list[Task]:

        self.project_service.require_member(
            project_id,
            actor,
        )

        offset = (page - 1) * size

        return self.repo.list_by_project(
            project_id=project_id,
            q=q,
            status=status,
            priority=priority,
            assignee_id=assignee_id,
            sprint_id=sprint_id,
            overdue=overdue,
            offset=offset,
            limit=size,
        )

    def get(
        self,
        task_id: uuid.UUID,
        actor: User,
    ) -> Task:

        task = self.require_task(task_id)

        self.require_task_member(
            task,
            actor,
        )

        return task



    def create(
        self,
        payload: TaskCreate,
        actor: User,
    ) -> Task:

        membership = self.project_service.require_member(
            payload.project_id,
            actor,
        )

        task_count = self.repo.count_by_project(
            payload.project_id
        )

        if task_count >= MAX_TASKS_PER_PROJECT:
            raise api_error(
                409,
                "TASK_LIMIT_REACHED",
                (
                    f"Project chỉ được phép có tối đa "
                    f"{MAX_TASKS_PER_PROJECT} task."
                ),
            )

        assignee_id = payload.assignee_id

        if (
            actor.role != UserRole.ADMIN
            and membership.project_role == ProjectRole.MEMBER
        ):
            if (
                assignee_id is not None
                and assignee_id != actor.id
            ):
                raise api_error(
                    403,
                    "TASK_SELF_ASSIGN_ONLY",
                    "MEMBER chỉ được tự gán task cho chính mình.",
                )

            assignee_id = actor.id


        if assignee_id is not None:
            self.require_assignee_member(
                payload.project_id,
                assignee_id,
            )


        if payload.sprint_id is not None:

            sprint = self.repo.get_sprint(
                payload.sprint_id,
            )

            if not sprint:
                raise api_error(
                    404,
                    "SPRINT_NOT_FOUND",
                    "Không tìm thấy sprint.",
                )

            if sprint.project_id != payload.project_id:
                raise api_error(
                    400,
                    "TASK_SPRINT_PROJECT_MISMATCH",
                    "Sprint không thuộc project của task.",
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
            created_at=datetime.now(UTC),
        )

        try:
            self.repo.create(task)

            # Nằm trong cùng transaction với task: task lưu lỗi thì
            # cũng không còn thông báo mồ côi.
            self.notification_service.notify_task_assigned(
                task,
                assignee_id,
                actor,
            )

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
        actor: User,
    ) -> Task:

        task = self.require_task(task_id)

        membership = self.require_task_member(
            task,
            actor,
        )

        if (
            actor.role != UserRole.ADMIN
            and membership.project_role == ProjectRole.MEMBER
        ):
            if task.assignee_id != actor.id:
                raise api_error(
                    403,
                    "TASK_UPDATE_FORBIDDEN",
                    "MEMBER chỉ được sửa task mình phụ trách.",
                )

        changes: dict[str, Any] = payload.model_dump(
            exclude_unset=True,
        )

        # Không cho PUT thay đổi assignee.
        changes.pop(
            "assignee_id",
            None,
        )

        for field, value in changes.items():
            setattr(
                task,
                field,
                value,
            )

        try:
            self.repo.update(task)

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
        actor: User,
    ) -> Task:

        task = self.require_task(task_id)

        self.project_service.require_manager(
            task.project_id,
            actor,
        )

        if payload.assignee_id is not None:
            self.require_assignee_member(
                task.project_id,
                payload.assignee_id,
            )

        previous_assignee_id = task.assignee_id

        task.assignee_id = payload.assignee_id

        try:
            # Gán lại đúng người đang phụ trách thì không báo lại.
            if payload.assignee_id != previous_assignee_id:
                self.notification_service.notify_task_assigned(
                    task,
                    payload.assignee_id,
                    actor,
                )

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
        actor: User,
    ) -> Task:

        task = self.require_task(task_id)

        membership = self.require_task_member(
            task,
            actor,
        )

        if (
            actor.role != UserRole.ADMIN
            and membership.project_role == ProjectRole.MEMBER
        ):
            if task.assignee_id != actor.id:
                raise api_error(
                    403,
                    "TASK_MOVE_FORBIDDEN",
                    "MEMBER chỉ được đổi trạng thái task mình phụ trách.",
                )

        current_status = task.status
        new_status = payload.status

        status_order = {
            "TODO": 0,
            "IN_PROGRESS": 1,
            "REVIEW": 2,
            "DONE": 3,
        }

        if (
            current_status not in status_order
            or new_status not in status_order
        ):
            raise api_error(
                400,
                "TASK_INVALID_STATUS",
                "Trạng thái task không hợp lệ.",
            )

        difference = abs(
            status_order[new_status]
            - status_order[current_status]
        )

        if difference > 1:
            raise api_error(
                400,
                "TASK_INVALID_TRANSITION",
                (
                    f"Không thể chuyển task từ "
                    f"{current_status} sang "
                    f"{new_status}."
                ),
            )

        task.status = new_status

        if new_status == "DONE":
            task.completed_at = datetime.now(
                UTC,
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
        actor: User,
    ) -> None:

        task = self.require_task(task_id)

        self.project_service.require_manager(
            task.project_id,
            actor,
        )

        try:
            self.repo.delete(task)

            self.db.commit()

        except Exception:
            self.db.rollback()
            raise

