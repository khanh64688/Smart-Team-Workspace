## Làm gì

<!-- Mô tả ngắn gọn thay đổi. Kèm mã user story nếu có, ví dụ: US-07 -->

## Ảnh hưởng module nào

<!-- Ví dụ: backend/auth, frontend/kanban, docs. Ghi rõ nếu có đổi hợp đồng API
     hoặc thêm migration — người khác cần biết để chạy lại alembic. -->

- [ ] Có thêm/sửa migration Alembic
- [ ] Có đổi `docs/openapi.yaml` (hợp đồng API giữa BE và FE)
- [ ] Có thêm biến môi trường mới (đã cập nhật `.env.example`)

## Cách test

<!-- Người review làm theo được. Ví dụ:
     1. docker compose up --build
     2. Đăng nhập pm@twl.dev / Password123
     3. Vào /projects, bấm Tạo dự án -->

## Checklist trước khi xin review

- [ ] Nhánh này xuất phát từ `develop`
- [ ] CI xanh (job **CI passed**) — CI đỏ thì không merge
- [ ] Đã chạy `ruff check .` ở máy, không còn lỗi
- [ ] Đã thêm hoặc cập nhật test cho phần code mới
- [ ] Không commit `.env`, khoá API, hay file `__pycache__` / `node_modules`
- [ ] Commit theo quy ước `<type>(<scope>): <mô tả>`

## Người review

<!-- Tag ít nhất 1 người, ưu tiên người phụ trách module liên quan.
     Review chéo: TV2 ↔ frontend auth · TV3 ↔ migration · TV4 ↔ logic Kanban · TV5–TV6 ↔ test frontend -->
