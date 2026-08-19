import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

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

    # def list_by_project(
    #     self,
    #     project_id: uuid.UUID,
    # ) -> list[Task]:
    #     stmt = (
    #         select(Task)
    #         .where(
    #             Task.project_id == project_id,
    #         )
    #         .order_by(
    #             Task.position,
    #             Task.created_at,
    #         )
    #     )

    #     return list(
    #         self.db.scalars(stmt).all()
    #     )

    def list_by_project(
        self,
        project_id: uuid.UUID,
        q: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        assignee_id: uuid.UUID | None = None,
        sprint_id: uuid.UUID | None = None,
        overdue: bool = False,
        offset: int = 0,
        limit: int = 20,
    ) -> list[Task]:

        query = (
            self.db.query(Task)
            # Nạp sẵn assignee cho cả trang, tránh N+1 khi serialize
            # TaskResponse.assignee.
            .options(selectinload(Task.assignee))
            .filter(
                Task.project_id == project_id,
            )
        )

        # Search
        if q:
            keyword = f"%{q.strip()}%"

            query = query.filter(
                or_(
                    Task.title.ilike(keyword),
                    Task.description.ilike(keyword),
                )
            )

        # Status
        if status:
            query = query.filter(
                Task.status == status,
            )

        # Priority
        if priority:
            query = query.filter(
                Task.priority == priority,
            )

        # Assignee
        if assignee_id:
            query = query.filter(
                Task.assignee_id == assignee_id,
            )

        # Sprint
        if sprint_id:
            query = query.filter(
                Task.sprint_id == sprint_id,
            )

        # Overdue
        if overdue:
            now = datetime.now(UTC)

            query = query.filter(
                Task.due_date.is_not(None),
                Task.due_date < now,
                Task.status != "DONE",
            )

        return (
            query
            .order_by(
                Task.position.asc(),
                Task.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )


    def count_by_project(
        self,
        project_id: uuid.UUID,
    ) -> int:
        statement = (
            select(func.count())
            .select_from(Task)
            .where(Task.project_id == project_id)
        )

        return self.db.scalar(statement) or 0

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

