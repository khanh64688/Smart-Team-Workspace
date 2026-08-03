# Smart Team Workspace

> Hệ thống quản lý dự án và công việc cho nhóm sinh viên, tích hợp AI tóm tắt tiến độ Sprint.

Một phiên bản thu gọn của Trello/Jira dành cho nhóm sinh viên làm bài tập lớn, nghiên cứu hoặc đồ án:
**Tạo nhóm → tạo dự án → chia Sprint → giao Task → kéo thả Kanban → theo dõi deadline → AI tổng hợp tiến độ.**

---

## Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ](#công-nghệ)
- [Chạy dự án](#chạy-dự-án)
- [Tài khoản demo](#tài-khoản-demo)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Tài liệu](#tài-liệu)
- [Quy trình làm việc nhóm](#quy-trình-làm-việc-nhóm)
- [Phân công](#phân-công)
- [Kiểm thử](#kiểm-thử)

---

## Tính năng

| Module | Chức năng | Trạng thái |
|---|---|:--:|
| Authentication | Đăng ký, đăng nhập, refresh token, đổi mật khẩu | Bắt buộc |
| User & Role | Administrator / Project Manager / Team Member | Bắt buộc |
| Project | Tạo, sửa, đóng dự án; thêm/xoá thành viên | Bắt buộc |
| Sprint | Tạo, sửa, đóng Sprint | Bắt buộc |
| Task | Giao việc, deadline, priority, trạng thái | Bắt buộc |
| Kanban | Todo · In Progress · Review · Done (kéo thả) | Bắt buộc |
| Comment | Bình luận trong Task | Bắt buộc |
| Dashboard | Thống kê theo trạng thái, priority, quá hạn | Bắt buộc |
| Search & Filter | Tìm Task, Project, User | Bắt buộc |
| Notification | Task mới, gần deadline, comment mới | Nên có |
| **AI Sprint Summary** | **Tóm tắt tiến độ, blocker, việc quá hạn** | **Điểm nhấn** |
| CSV Export | Xuất danh sách Task | Nếu còn thời gian |

**Không nằm trong phạm vi:** WebSocket realtime, chat, Gantt chart, Elasticsearch, Celery/RabbitMQ, OCR, Google Calendar, email quên mật khẩu thật, microservices, train mô hình AI.

---

## Công nghệ

**Backend** — FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL · Pydantic · JWT · Pytest
**Frontend** — React + Vite · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query · React Hook Form · Recharts · DnD Kit
**Hạ tầng** — Docker Compose · GitHub Actions · Render/Railway · Gemini hoặc OpenAI API

Kiến trúc backend theo **Repository Pattern + Service Layer**:

```
API Router  →  Service (business logic)  →  Repository (truy vấn DB)  →  Model
```

---

## Chạy dự án

### Yêu cầu

- Docker Desktop (đã bật Docker Compose v2)
- Git

### Các bước

```bash
# 1. Clone mã nguồn
git clone <repo-url>
cd smart-team-workspace

# 2. Khởi động toàn bộ hệ thống
docker compose up --build

# 3. Seed dữ liệu demo
docker compose exec backend python -m app.scripts.seed_data
```

Chỉ có vậy. **Không cần tạo `.env`, không cần chạy migration bằng tay:**

- Mọi biến môi trường đã có giá trị mặc định ngay trong `docker-compose.yml`.
- `alembic upgrade head` được chạy tự động lúc container backend khởi động.
- Backend chỉ khởi động sau khi PostgreSQL báo sẵn sàng (`healthcheck`), nên
  lần `up` đầu tiên không còn lỗi *connection refused*.

Chỉ tạo `.env` khi cần một trong hai việc sau:

```bash
cp .env.example .env
```

- **Dùng tính năng AI** — điền `AI_API_KEY` (Gemini hoặc OpenAI).
- **Cổng bị chiếm** — máy đã cài sẵn PostgreSQL ở `5432` hoặc đang chạy project
  khác ở `5173`/`8000`, sửa `POSTGRES_PORT` / `FRONTEND_PORT` / `BACKEND_PORT`.

Lệnh dùng hằng ngày:

| Việc | Lệnh |
|---|---|
| Dừng hệ thống | `docker compose down` |
| Dừng và **xoá sạch dữ liệu CSDL** | `docker compose down -v` |
| Xem log backend | `docker compose logs -f backend` |
| Vào shell container | `docker compose exec backend sh` |
| Tạo migration mới | `docker compose exec backend alembic revision --autogenerate -m "mô tả"` |
| Cài thêm thư viện Python | thêm vào `requirements.txt` rồi `docker compose up --build backend` |

| Dịch vụ | Địa chỉ |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

### Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|:--:|---|
| `DATABASE_URL` | ✅ | Chuỗi kết nối PostgreSQL |
| `SECRET_KEY` | ✅ | Khoá ký JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | | Mặc định `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | | Mặc định `7` |
| `AI_PROVIDER` | | `gemini` hoặc `openai` |
| `AI_API_KEY` | | Bỏ trống thì tính năng AI hiện thông báo "chưa cấu hình" |
| `VITE_API_URL` | ✅ | URL backend cho frontend |

> **Bảo mật:** `.env` nằm trong `.gitignore`. Không bao giờ commit khoá thật. `AI_API_KEY` chỉ được dùng ở backend.

---

## Tài khoản demo

Sau khi chạy seed. Mật khẩu chung: `Password123`

| Email | Vai trò | Dùng để demo |
|---|---|---|
| `admin@twl.dev` | ADMIN | Quản trị người dùng |
| `pm@twl.dev` | PM | **Luồng demo chính** — chủ dự án TMĐT |
| `lap@twl.dev` | PM | Chủ dự án thứ hai |
| `an@twl.dev` | MEMBER | Nhiều task, có task quá hạn |
| `binh@twl.dev` | MEMBER | Thành viên đang quá tải |
| `chi@twl.dev` | MEMBER | Tham gia cả hai dự án |

Dữ liệu seed gồm: 8 người dùng · 2 dự án · 3 sprint · 26 task (đủ 4 trạng thái, có task quá hạn) · ~30 bình luận.

---

## Cấu trúc thư mục

```
smart-team-workspace/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Router: auth, projects, sprints, tasks, ...
│   │   ├── core/            # config, database, security, deps (guard)
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── repositories/    # Tầng truy vấn dữ liệu
│   │   ├── services/        # Business logic
│   │   ├── prompts/         # Prompt cho AI
│   │   └── scripts/         # seed_data.py
│   ├── alembic/versions/    # Migration
│   └── tests/
├── frontend/
│   └── src/
│       ├── lib/api.ts       # API client dùng chung (auth interceptor)
│       ├── context/         # AuthContext
│       ├── components/      # layout, ui, kanban, task, charts, filters
│       ├── hooks/           # useAuth, useProjects, useTasks, ...
│       ├── pages/           # Login, Projects, Board, Dashboard, ...
│       └── types/api.ts     # Type sinh từ OpenAPI
│   ├── package.json         # dependency + script dev/build/lint
│   ├── vite.config.ts
│   ├── eslint.config.js
│   ├── Dockerfile           # deps → dev | deps → builder → runtime (nginx)
│   └── nginx.conf           # SPA fallback cho bản build production
├── docs/
│   ├── backlog.md
│   ├── permission-matrix.md
│   ├── demo-script.md
│   ├── erd.png
│   ├── openapi.yaml
│   ├── test-report.md
│   └── scrum/
├── .github/
│   ├── workflows/ci.yml         # CI: ruff · pytest · build frontend · Docker
│   ├── pull_request_template.md # Mẫu PR, tự hiện khi mở PR
│   └── BRANCH_PROTECTION.md     # Cách bật chặn merge khi CI đỏ
├── .env.example             # Mẫu biến môi trường — copy thành .env khi cần
├── ruff.toml                # Cấu hình lint dùng chung toàn repo
└── docker-compose.yml       # db + backend + frontend
```

> `backend/Dockerfile` chia 3 tầng: `builder` (cài dependency) → `runtime`
> (ảnh gọn để deploy, chạy bằng user thường) → `dev` (thêm pytest/ruff và hot
> reload). Compose dùng tầng `dev`; deploy dùng tầng `runtime`.

---

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [`docs/backlog.md`](docs/backlog.md) | 21 user story kèm acceptance criteria, chia theo 3 sprint |
| [`docs/permission-matrix.md`](docs/permission-matrix.md) | Ma trận phân quyền hai tầng + 8 business rule + mã lỗi chuẩn |
| [`docs/demo-script.md`](docs/demo-script.md) | Kịch bản demo 12 phút và bộ câu hỏi phản biện |
| [`docs/erd.png`](docs/erd.png) | Sơ đồ quan hệ thực thể |
| [`docs/openapi.yaml`](docs/openapi.yaml) | Hợp đồng API — nguồn sự thật giữa frontend và backend |
| [`docs/test-report.md`](docs/test-report.md) | Báo cáo kiểm thử |
| [`docs/scrum/`](docs/scrum/) | Biên bản daily, sprint review, retrospective |

---

## Quy trình làm việc nhóm

### Nhánh Git

```
main                    # chỉ chứa bản đã demo được
└── develop             # nhánh tích hợp, CI phải xanh
    ├── feature/tv1-docs-seed
    ├── feature/tv2-auth
    ├── feature/tv3-project
    ├── feature/tv4-sprint-task
    ├── feature/tv5-fe-foundation
    ├── feature/tv6-kanban-dashboard
    └── feature/tv7-ai-notify-devops
```

### Quy ước commit

```
<type>(<scope>): <mô tả ngắn>

feat(task): thêm API kéo thả Kanban
fix(auth): sửa lỗi refresh token hết hạn sớm
docs(backlog): bổ sung acceptance criteria cho US-13
test(project): thêm test phân quyền thành viên
```

Loại: `feat` · `fix` · `docs` · `test` · `refactor` · `chore`

### Quy tắc Pull Request

1. Nhánh feature xuất phát từ `develop`
2. PR phải mô tả: làm gì, ảnh hưởng module nào, cách test
3. **Bắt buộc 1 người review** — ưu tiên người có module liên quan
4. CI đỏ thì không merge
5. Merge xong xoá nhánh feature

### Thứ tự tích hợp module

```
M0 (nền chung) → TV2 (auth) → TV3 (project) → TV4 (sprint/task)
                            ↘ TV5 (FE nền) → TV6 (Kanban/Dashboard) → TV7 (AI, notify)
```

Mỗi thành viên có một thẻ `[EXPORT]` trên Trello liệt kê chính xác file phải bàn giao và checklist kiểm tra trước khi merge.

---

## Phân công

| TV | Module | Sản phẩm chính |
|:--:|---|---|
| 1 | Scrum Master + Requirement | Backlog, ma trận phân quyền, seed data, tài liệu, slide demo |
| 2 | Backend Authentication | JWT, refresh token, hash mật khẩu, role guard |
| 3 | Backend Project & Member | Project CRUD, quản lý thành viên, permission theo dự án |
| 4 | Backend Sprint & Task | Sprint/Task CRUD, API Kanban, comment, dashboard API |
| 5 | Frontend Foundation | Setup, API client, layout, auth, trang project |
| 6 | Frontend Task & Dashboard | Kanban DnD, task detail, biểu đồ, bộ lọc |
| 7 | Notification, AI, QA/DevOps | AI Sprint Summary, thông báo, CI, Docker, deploy |

Review chéo: TV2 ↔ frontend auth · TV3 ↔ migration · TV4 ↔ logic Kanban · TV5–TV6 ↔ test frontend.

---

## Kiểm thử

Chạy đúng những gì CI sẽ chạy, **trước khi mở PR**:

```bash
# Backend — lint
docker compose exec backend ruff check .
docker compose exec backend ruff check --fix .      # tự sửa phần sửa được

# Backend — test
docker compose exec backend pytest -v
docker compose exec backend pytest --cov=app --cov-report=term-missing

# Frontend
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

Mục tiêu: các service quan trọng (auth, project, task) có unit test; luồng chính có integration test. Xem [`docs/test-report.md`](docs/test-report.md).

### CI tự động

Mỗi Pull Request vào `develop` (và `main`) sẽ tự chạy 4 job:

| Job | Kiểm tra | Đỏ khi nào |
|---|---|---|
| **Lint backend (ruff)** | `ruff check` toàn repo | Có lỗi lint chưa sửa |
| **Test backend (pytest)** | pytest + coverage, có sẵn PostgreSQL để integration test | Có test hỏng |
| **Build frontend** | `npm ci` → `npm run lint` → `npm run build` | Lỗi TypeScript, lỗi ESLint hoặc build hỏng |
| **Kiểm tra cấu hình Docker** | `docker compose config` + build thử hai ảnh | File Docker hỏng, người khác clone về không chạy được |

Job thứ năm — **`CI passed`** — chờ cả 4 job trên rồi mới kết luận. **Đây là job
duy nhất cần đặt làm required status check** trong Branch protection; thêm job
mới về sau chỉ cần sửa `needs:` trong `ci.yml`, không phải vào lại Settings.

**CI đỏ thì không merge.** Việc chặn nút Merge phải bật một lần trên GitHub —
xem [`.github/BRANCH_PROTECTION.md`](.github/BRANCH_PROTECTION.md).

Hai điểm đã xử lý sẵn để CI không đỏ oan trong giai đoạn đầu:

- Nhánh chưa có test → `pytest` báo cảnh báo, không làm đỏ PR.
- Nhánh chưa có `frontend/` → job build tự bỏ qua kèm cảnh báo.

Cả hai tự hết tác dụng ngay khi test và frontend thật xuất hiện.

---

## Giấy phép

Sản phẩm phục vụ mục đích học tập.
