import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.sprint import Sprint
from app.models.task import Task


class SprintRepository:

    def __init__(self, db: Session):
        self.db = db

    def get(
        self,
        sprint_id: uuid.UUID,
    ) -> Sprint | None:

        return self.db.scalar(
            select(Sprint).where(
                Sprint.id == sprint_id
            )
        )


    def list_by_project(
        self,
        project_id: uuid.UUID,
    ) -> list[Sprint]:

        stmt = (
            select(Sprint)
            .where(
                Sprint.project_id == project_id
            )
            .order_by(
                Sprint.start_date.desc()
            )
        )

        return list(
            self.db.scalars(stmt).all()
        )

    def count_by_project(
        self,
        project_id: uuid.UUID,
    ) -> int:
        statement = (
            select(func.count())
            .select_from(Sprint)
            .where(Sprint.project_id == project_id)
        )

        return self.db.scalar(statement) or 0


    def get_active_by_project(
        self,
        project_id: uuid.UUID,
    ) -> Sprint | None:

        return self.db.scalar(
            select(Sprint).where(
                Sprint.project_id == project_id,
                Sprint.status == "ACTIVE",
            )
        )


    def create(
        self,
        sprint: Sprint,
    ) -> Sprint:

        self.db.add(sprint)
        self.db.flush()
        self.db.refresh(sprint)

        return sprint


    def update(
        self,
        sprint: Sprint,
    ) -> Sprint:

        self.db.flush()
        self.db.refresh(sprint)

        return sprint



    def delete(
        self,
        sprint: Sprint,
    ) -> None:

        self.db.delete(sprint)
        self.db.flush()



    def has_tasks(
        self,
        sprint_id: uuid.UUID,
    ) -> bool:

        task_id = self.db.scalar(
            select(Task.id)
            .where(
                Task.sprint_id == sprint_id
            )
            .limit(1)
        )

        return task_id is not None