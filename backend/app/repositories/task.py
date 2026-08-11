import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sprint import Sprint
from app.models.task import Task


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(
        self,
        task_id: uuid.UUID,
    ) -> Task | None:
        return self.db.scalar(
            select(Task).where(
                Task.id == task_id,
            )
        )

    def list_by_project(
        self,
        project_id: uuid.UUID,
    ) -> list[Task]:
        stmt = (
            select(Task)
            .where(
                Task.project_id == project_id,
            )
            .order_by(
                Task.position,
                Task.created_at,
            )
        )

        return list(
            self.db.scalars(stmt).all()
        )

    def create(
        self,
        task: Task,
    ) -> Task:
        self.db.add(task)
        self.db.flush()

        return task

    def update(
        self,
        task: Task,
    ) -> Task:
        self.db.flush()

        return task

    def delete(
        self,
        task: Task,
    ) -> None:
        self.db.delete(task)

    def get_sprint(
        self,
        sprint_id: uuid.UUID,
    ) -> Sprint | None:
        return self.db.get(
            Sprint,
            sprint_id,
        )

