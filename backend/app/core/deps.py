from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.database import get_db
from app.models.user import User


def get_current_user(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    db: Session = Depends(get_db),
) -> User:
    """Điểm tích hợp TV2: thay phần đọc X-User-Id bằng xác minh JWT."""
    if not x_user_id:
        raise api_error(401, "UNAUTHENTICATED", "Bạn cần đăng nhập.")
    user = db.get(User, x_user_id)
    if not user or not user.is_active:
        raise api_error(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.")
    return user
