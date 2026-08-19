from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.models import RefreshToken


class RefreshTokenRepository:
    """
    Repository truy cập dữ liệu bảng refresh_tokens.

    Refresh token trong database được nhận diện bằng jti.

    Không lưu toàn bộ chuỗi JWT vào database.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(
        self,
        token_id: uuid.UUID,
    ) -> RefreshToken | None:
        """
        Tìm refresh token theo primary key UUID.
        """
        return self.db.get(RefreshToken, token_id)

    def get_by_jti(
        self,
        jti: str,
    ) -> RefreshToken | None:
        """
        Tìm refresh token theo JWT ID.

        Có thể trả về token đã hết hạn hoặc đã bị thu hồi.
        """
        statement = select(RefreshToken).where(
            RefreshToken.jti == jti
        )

        return self.db.scalar(statement)

    def get_active_by_jti(
        self,
        jti: str,
    ) -> RefreshToken | None:
        """
        Tìm refresh token còn hiệu lực.

        Token hợp lệ ở tầng database khi:
        - jti tồn tại.
        - revoked_at là NULL.
        - expires_at lớn hơn thời gian hiện tại.
        """
        statement = select(RefreshToken).where(
            RefreshToken.jti == jti,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > func.now(),
        )

        return self.db.scalar(statement)

    def create(
        self,
        *,
        jti: str,
        user_id: uuid.UUID,
        expires_at: datetime,
    ) -> RefreshToken:
        """
        Lưu thông tin một refresh token mới.

        jti được sinh khi tạo JWT ở Mốc 6.
        """
        refresh_token = RefreshToken(
            jti=jti,
            user_id=user_id,
            expires_at=expires_at,
            revoked_at=None,
        )

        self.db.add(refresh_token)
        self.db.flush()
        self.db.refresh(refresh_token)

        return refresh_token

    def revoke(
        self,
        refresh_token: RefreshToken,
        *,
        revoked_at: datetime | None = None,
    ) -> RefreshToken:
        """
        Thu hồi một refresh token.

        Nếu token đã bị thu hồi trước đó thì giữ nguyên revoked_at.
        """
        if refresh_token.revoked_at is None:
            refresh_token.revoked_at = (
                revoked_at
                if revoked_at is not None
                else datetime.now(UTC)
            )

            self.db.flush()
            self.db.refresh(refresh_token)

        return refresh_token

    def revoke_by_jti(
        self,
        jti: str,
    ) -> bool:
        """
        Thu hồi refresh token theo jti.

        Trả về:
        - True nếu tìm thấy token.
        - False nếu không tìm thấy token.
        """
        refresh_token = self.get_by_jti(jti)

        if refresh_token is None:
            return False

        self.revoke(refresh_token)

        return True

    def revoke_all_by_user_id(
        self,
        user_id: uuid.UUID,
        *,
        revoked_at: datetime | None = None,
    ) -> int:
        """
        Thu hồi toàn bộ refresh token chưa bị thu hồi của user.

        Dùng khi:
        - User đổi mật khẩu.
        - Admin khóa tài khoản.
        - Đăng xuất khỏi tất cả thiết bị.

        Trả về số lượng token đã được thu hồi.
        """
        revoke_time = (
            revoked_at
            if revoked_at is not None
            else datetime.now(UTC)
        )

        statement = (
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=revoke_time)
        )

        result = self.db.execute(statement)
        self.db.flush()

        return int(result.rowcount or 0)

    def delete_expired(
        self,
        *,
        before: datetime | None = None,
    ) -> int:
        """
        Xóa vật lý các refresh token đã hết hạn.

        Phương thức này dùng để dọn dữ liệu.
        Không dùng nó để logout.

        Nếu không truyền before, database sử dụng thời gian hiện tại.
        """
        if before is None:
            condition = RefreshToken.expires_at <= func.now()
        else:
            condition = RefreshToken.expires_at <= before

        statement = delete(RefreshToken).where(condition)

        result = self.db.execute(statement)
        self.db.flush()

        return int(result.rowcount or 0)