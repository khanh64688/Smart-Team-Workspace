"""make completed_at nullable

Revision ID: cd0a6e8dceb0
Revises: 20260801_01
Create Date: 2026-08-09 00:46:02.157178

Revision này được autogenerate trên một DB local còn sót bảng sprints/tasks/comments
cũ, nên nó sinh ra các lệnh sai so với chuỗi migration chính thức:

  - `drop_table('sprints'/'comments'/'tasks')`: 3 bảng đó chưa hề tồn tại ở bước này
    (chúng được tạo ở 20260810_01), nên trên DB trắng sẽ lỗi UndefinedTable.
  - `create_unique_constraint('uq_project_member', ...)`: constraint đã được tạo sẵn
    trong 20260801_01, tạo lại sẽ lỗi DuplicateObject.
  - `downgrade()` tạo lại 3 bảng trên, trong khi chúng thuộc về 20260810_01.

`tasks.completed_at` giờ đã nullable ngay từ lúc tạo bảng ở 20260810_01, nên revision
này không còn việc gì để làm. Giữ lại làm no-op để không phá chuỗi revision ở các DB
hoặc branch đã tham chiếu tới nó.
"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = 'cd0a6e8dceb0'
down_revision: Union[str, Sequence[str], None] = '20260801_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
