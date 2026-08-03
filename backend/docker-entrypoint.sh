#!/bin/sh
# =============================================================
#  Chạy trước khi khởi động uvicorn.
#  Mục tiêu: người mới clone về gõ `docker compose up` là dùng được ngay,
#  không phải nhớ chạy migration bằng tay.
# =============================================================
set -e

# Chạy migration nếu module Alembic đã được tích hợp (TV3 phụ trách).
# Alembic là idempotent: chạy lại nhiều lần không sao.
if [ -f "alembic.ini" ]; then
    echo "[entrypoint] Đang chạy: alembic upgrade head"
    alembic upgrade head
else
    echo "[entrypoint] Chưa có alembic.ini — bỏ qua migration."
    echo "[entrypoint] SQLAlchemy sẽ tự tạo bảng nếu code có gọi Base.metadata.create_all()."
fi

echo "[entrypoint] Khởi động: $*"
exec "$@"
