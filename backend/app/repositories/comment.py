import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.comment import Comment


class CommentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, comment_id: uuid.UUID) -> Comment | None:
        stmt = select(Comment).where(
            Comment.id == comment_id
        )

        return self.db.scalar(stmt)

    def get_by_task(
        self,
        task_id: uuid.UUID,
    ) -> list[Comment]:
        stmt = (
            select(Comment)
            .where(Comment.task_id == task_id)
            .order_by(Comment.created_at.asc())
        )

        return list(self.db.scalars(stmt).all())

    def create(
        self,
        *,
        task_id: uuid.UUID,
        author_id: uuid.UUID,
        content: str,
    ) -> Comment:
        comment = Comment(
            task_id=task_id,
            author_id=author_id,
            content=content,
            created_at=datetime.now(timezone.utc),
        )

        self.db.add(comment)
        self.db.flush()

        return comment

    def update(
        self,
        comment: Comment,
        *,
        content: str,
    ) -> Comment:
        comment.content = content

        self.db.flush()

        return comment

    def delete(
        self,
        comment: Comment,
    ) -> None:
        self.db.delete(comment)
        self.db.flush()