# Báo cáo kiểm thử — Smart Team Workspace

**Ngày chạy:** 17/08/2026 · **Nhánh:** `backend-development` · **Commit nền:** `0565db4`

| Hạng mục | Kết quả |
|---|---|
| Tổng số test | **117** |
| Đạt | **117** (100%) |
| Hỏng | 0 |
| Thời gian chạy | 62 giây |
| Độ phủ toàn bộ `app/` | **71.6%** |
| Độ phủ code chạy thật (trừ script dev) | **83.1%** |
| Lint backend (ruff) | ❌ **103 lỗi tồn đọng** — xem [Defect log](#7-defect-log) |
| Lint + build frontend | Chưa chạy trong đợt này |

---

## Mục lục

1. [Môi trường kiểm thử](#1-môi-trường-kiểm-thử)
2. [Phạm vi và chiến lược](#2-phạm-vi-và-chiến-lược)
3. [Kết quả chạy theo file](#3-kết-quả-chạy-theo-file)
4. [Integration test toàn luồng](#4-integration-test-toàn-luồng)
5. [Độ phủ mã nguồn](#5-độ-phủ-mã-nguồn)
6. [Kiểm chứng chất lượng bộ test](#6-kiểm-chứng-chất-lượng-bộ-test)
7. [Defect log](#7-defect-log)
8. [Hướng dẫn chạy lại](#8-hướng-dẫn-chạy-lại)
9. [Phần chưa kiểm thử và khuyến nghị](#9-phần-chưa-kiểm-thử-và-khuyến-nghị)

---

## 1. Môi trường kiểm thử

| Thành phần | Giá trị |
|---|---|
| Hệ điều hành | Windows 11 (26200) |
| Python | 3.12.1 |
| Database | PostgreSQL 16-alpine, chạy qua `docker compose up -d db` |
| Database test | `smart_team_workspace_test` (tách hoàn toàn khỏi DB phát triển) |
| Test runner | pytest 9.1.1 · pytest-cov 7.1.0 |
| Client | `fastapi.testclient.TestClient` — gọi thẳng ASGI app, không cần dựng server |

### Cách cô lập dữ liệu

`conftest.py` áp dụng ba lớp bảo vệ, đợt kiểm thử này xác nhận cả ba đều hoạt động:

1. **Chặn nhầm database.** Pytest từ chối khởi động nếu tên database không kết thúc bằng `_test`. Mỗi phiên chạy đều `DROP SCHEMA public CASCADE` nên nếu trỏ nhầm vào DB phát triển thì mất sạch dữ liệu.
2. **Rollback theo từng test.** Mỗi test chạy trong một transaction lồng (`join_transaction_mode="create_savepoint"`) và được rollback khi kết thúc. Service gọi `commit()` bên trong vẫn không rò rỉ dữ liệu sang test kế tiếp — đây là điều kiện bắt buộc để integration test dùng lại email cố định như `pm.flow@twl.dev` mà không đụng nhau.
3. **Ghi đè `get_db`.** Toàn bộ request trong test đi qua đúng session đó.

> **Lưu ý khi chạy trên máy khác:** máy chạy đợt kiểm thử này có volume `postgres_data` được khởi tạo từ trước với bộ credentials khác mặc định của `docker-compose.yml`, nên phải tạo một role riêng cho test. Xem [mục 8](#8-hướng-dẫn-chạy-lại).

---

## 2. Phạm vi và chiến lược

Bộ test chia làm hai lớp, bổ sung cho nhau:

| Lớp | File | Câu hỏi trả lời |
|---|---|---|
| **Test theo module** | `test_auth`, `test_projects`, `test_sprint`, `test_task`, `test_comment`, `test_notification`, `test_users`, `test_role_permissions` | Từng endpoint có đúng hợp đồng API không? |
| **Integration toàn luồng** | `test_integration_flow` *(mới)* | Ghép các module lại thì nghiệp vụ có chạy thông không? |

Lớp thứ hai là phần bổ sung của đợt này. Trước đó mỗi file test tự dựng user và project riêng rồi kiểm tra một endpoint — không có test nào đi từ đăng ký đến khi task xong việc. Những lỗi chỉ lộ ra khi ghép module (kiểu dữ liệu lệch giữa các tầng, thiếu `commit`, phân quyền không nhất quán giữa `ProjectService` và `TaskService`) sẽ lọt lưới.

**Ngoài phạm vi đợt này** (thống nhất trước khi bắt đầu): E2E trên trình duyệt cho frontend, và luồng AI Sprint Summary (US-19) vì cần API key thật.

---

## 3. Kết quả chạy theo file

| File test | Số test | Kết quả |
|---|--:|:--:|
| `test_integration_flow.py` *(mới)* | 21 | ✅ |
| `test_task.py` | 20 | ✅ |
| `test_sprint.py` | 13 | ✅ |
| `test_notification.py` | 13 | ✅ |
| `test_projects.py` | 13 | ✅ |
| `test_comment.py` | 12 | ✅ |
| `test_auth.py` | 11 | ✅ |
| `test_users.py` | 7 | ✅ |
| `test_role_permissions.py` | 7 | ✅ |
| **Tổng** | **117** | **117 đạt / 0 hỏng** |

---

## 4. Integration test toàn luồng

File `backend/tests/test_integration_flow.py` — 21 test, 5 nhóm.

Fixture `workspace` dựng sẵn bối cảnh một nhóm làm đồ án: một PM (OWNER dự án), hai MEMBER, một người **ngoài** dự án, một ADMIN hệ thống, và một dự án đã đủ thành viên. Các test sau đó tự tạo sprint/task của mình nên không ràng buộc chéo lẫn nhau.

### 4.1 Luồng hạnh phúc đầy đủ

`TestFullTeamWorkflow::test_project_to_kanban_done` đi hết 11 bước trong một transaction, mỗi bước dùng dữ liệu do bước trước sinh ra:

| # | Bước | Điều đã kiểm chứng | US |
|--:|---|---|---|
| 1 | PM và MEMBER liệt kê dự án | Cả hai đều thấy dự án vừa tạo | US-07 |
| 2 | Xem thành viên | Đúng 3 người, PM là `OWNER`, hai người còn lại là `MEMBER` | US-08 |
| 3 | PM tạo Sprint | Gắn đúng `project_id`, trạng thái `ACTIVE` | US-10 |
| 4 | PM giao Task cho An | Đúng assignee, sprint, priority `HIGH`, `status=TODO`, `completed_at=null` | US-12 |
| 5 | An nhận thông báo | Đúng 1 thông báo `TASK_ASSIGNED`, chưa đọc, message chứa tên người giao | US-18 |
| 6 | An kéo thẻ Kanban | `TODO → IN_PROGRESS → REVIEW → DONE`, mỗi bước trả 200 | US-13 |
| 7 | Task sang `DONE` | `completed_at` được đóng dấu thời gian | US-13 |
| 8 | PM bình luận | An nhận thêm thông báo `TASK_COMMENT`, tồn tại song song với `TASK_ASSIGNED` | US-15, US-18 |
| 9 | An đọc hết thông báo | `read-all` trả số đã đánh dấu, badge `unread_count` về 0 | US-18 |
| 10 | An trả lời comment | PM đọc được cả 2 comment trong thread | US-15 |
| 11 | PM đóng Sprint rồi đóng dự án | Sprint `CLOSED`; dự án `CLOSED` và chuyển sang chỉ đọc — sửa tiếp trả `409 PROJECT_CLOSED` | US-11, US-09 |

### 4.2 Ranh giới phân quyền

Đối chiếu `docs/permission-matrix.md`. Mỗi test khẳng định **cả mã HTTP lẫn mã lỗi nghiệp vụ**, nên đổi thông điệp lỗi mà quên đổi mã sẽ bị bắt.

| Test | Tình huống | Kết quả mong đợi | Quy tắc |
|---|---|---|---|
| `test_outsider_bi_chan_o_moi_tang` | Người ngoài đọc dự án / thành viên / sprint / task / comment | 5 endpoint đều `403 PROJECT_MEMBERSHIP_REQUIRED` | US-05 |
| `test_member_khong_sua_duoc_task_nguoi_khac` | Bình sửa và kéo task của An | `403 TASK_UPDATE_FORBIDDEN`, `403 TASK_MOVE_FORBIDDEN` | US-05, US-14 |
| `test_member_chi_duoc_tu_gan_task` | MEMBER tạo task giao người khác / không ghi assignee | `403 TASK_SELF_ASSIGN_ONLY`; trường hợp sau tự gán cho chính mình | BR-03 |
| `test_member_khong_duoc_giao_viec_va_tao_sprint` | MEMBER gọi `assign` và tạo Sprint | `403 PROJECT_MANAGER_REQUIRED`, `403` | US-05, US-10 |
| `test_khong_the_nhay_cot_kanban` | Kéo thẳng `TODO → DONE` | `400 TASK_INVALID_TRANSITION` | BR-01 |
| `test_khong_giao_task_cho_nguoi_ngoai_du_an` | PM giao task cho người ngoài dự án | `400 TASK_ASSIGNEE_NOT_PROJECT_MEMBER` | BR-03 |
| `test_admin_di_xuyen_moi_tang` | ADMIN không phải thành viên dự án | Vẫn đọc và kéo được task | US-05 |
| `test_khong_co_token_thi_bi_tu_choi` | Gọi API không kèm token | `401` | BR-08 |

### 4.3 Vòng đời thông báo (US-18)

| Test | Điều đã kiểm chứng |
|---|---|
| `test_deadline_sinh_thong_bao_va_khong_bi_lap` | Task hạn trong 6 giờ sinh `TASK_DUE_SOON`, task quá hạn 2 ngày sinh `TASK_OVERDUE`. **Gọi lại lần hai không nhân bản** — điểm mấu chốt vì hệ thống không có scheduler, thông báo deadline sinh ngay trong request đọc danh sách và frontend polling 30 giây một lần |
| `test_khong_tu_bao_cho_chinh_minh` | Tự nhận việc và tự bình luận trên task của mình thì không sinh thông báo nào |
| `test_thong_bao_cua_nguoi_khac_tra_ve_404` | Đọc trộm thông báo người khác trả `404` chứ không phải `403` — không để lộ sự tồn tại của thông báo. Chính chủ thì đánh dấu đã đọc bình thường |

### 4.4 Dữ liệu nền Dashboard và bộ lọc (US-16, US-17)

Hệ thống không có endpoint `/dashboard` riêng; Dashboard và bộ lọc Kanban đều dựng từ `GET /api/v1/tasks`, nên nhóm test này kiểm tra trực tiếp endpoint đó trên một bảng đã gieo 4 task đủ trạng thái, priority, người phụ trách và tình trạng deadline.

| Test | Điều đã kiểm chứng |
|---|---|
| `test_thong_ke_theo_trang_thai_va_priority` | Phân bố trạng thái đúng `{TODO: 3, IN_PROGRESS: 1}`; lọc theo `status` và `priority` trả đúng tập con |
| `test_loc_theo_nguoi_phu_trach_va_sprint` | Lọc theo `assignee` và `sprint` trả đúng số lượng và đúng quan hệ |
| `test_loc_qua_han_va_tim_kiem` | `overdue=true` chỉ trả task đã qua deadline; tìm theo từ khoá khớp tiêu đề; từ khoá không tồn tại trả mảng rỗng |
| `test_member_thay_cung_bang_du_lieu_voi_pm` | MEMBER thấy **toàn bộ** task của dự án chứ không riêng task của mình — bảng Kanban là của chung nhóm |
| `test_phan_trang_khong_lam_mat_du_lieu` | Trang 1 (size 3) + trang 2 hợp lại đúng 4 task, không trùng, không sót |

### 4.5 Phiên đăng nhập và rời dự án

| Test | Điều đã kiểm chứng | US |
|---|---|---|
| `test_refresh_va_doi_mat_khau_thu_hoi_phien` | Refresh cấp access token mới dùng được ngay; đổi mật khẩu thu hồi **toàn bộ** refresh token (`401`); mật khẩu cũ hết hiệu lực, mật khẩu mới đăng nhập được | US-03, US-04 |
| `test_logout_thu_hoi_dung_mot_phien` | Refresh token đã logout không tái sử dụng được | US-03 |
| `test_xoa_thanh_vien_go_task_ve_chua_giao` | Xoá thành viên thì task của họ **vẫn còn** nhưng `assignee_id` về `null`; người bị xoá mất quyền truy cập dự án | BR-06 |
| `test_owner_cuoi_cung_khong_the_roi_du_an` | OWNER duy nhất rời dự án bị chặn `400 LAST_OWNER_REQUIRED` | BR-05 |

---

## 5. Độ phủ mã nguồn

### Theo tầng kiến trúc

| Tầng | Statements | Đã phủ | % |
|---|--:|--:|--:|
| `models` | 191 | 191 | **100%** |
| `api` (router + v1) | 270 | 259 | **96%** |
| `schemas` | 395 | 365 | **92%** |
| `core` (config, deps, security) | 241 | 219 | **91%** |
| `repositories` | 354 | 305 | **86%** |
| `services` | 966 | 670 | **69%** |
| `scripts` (chỉ dùng khi dev) | 392 | 0 | 0% |
| **Tổng** | **2842** | **2036** | **71.6%** |
| **Trừ `scripts`** | **2450** | **2036** | **83.1%** |

Con số **83.1%** phản ánh đúng hơn: `app/scripts/` chứa `seed_data.py` và ba script kiểm tra thủ công, không chạy trong ứng dụng thật và không nằm trong ảnh Docker runtime.

### Module đáng chú ý

| Module | % | Ghi chú |
|---|--:|---|
| `services/notification.py` | 98% | Gần như phủ kín sau khi thêm integration test |
| `api/v1/task.py`, `sprint.py`, `comment.py`, `auth.py` | 100% | Mọi endpoint đều có test đi qua |
| `repositories/task.py`, `sprint.py`, `comment.py` | 100% | |
| `services/task.py` | 85% | Phần thiếu chủ yếu là nhánh `except → rollback` |
| `services/project.py` | 68% | Thiếu `require_config_permission`, chuyển giao OWNER |
| `services/sprint.py` | 67% | Thiếu phần lớn nhánh `update` (đổi trạng thái sprint) |
| `repositories/task_insights.py` | **43%** | Repository phục vụ AI, hầu như chưa có test |
| `services/chat/service.py` | **36%** | US-19, ngoài phạm vi đợt này |
| `services/llm_client.py` | **34%** | US-19, ngoài phạm vi đợt này |

---

## 6. Kiểm chứng chất lượng bộ test

Bộ test mới đạt 21/21 ngay lần chạy đầu tiên. Để loại trừ khả năng các assertion "pass rỗng", chúng tôi cố tình gài lỗi vào mã nguồn rồi chạy lại (mutation testing thủ công), sau đó hoàn nguyên:

| Lỗi gài vào | Test bắt được | Kết quả |
|---|---|---|
| Nới điều kiện chuyển cột Kanban `difference > 1` → `> 99` (cho phép nhảy cột tuỳ ý) | `test_khong_the_nhay_cot_kanban` | ✅ Fail đúng test |
| Bỏ điều kiện "không tự báo cho chính mình" trong `notify_task_assigned` | `test_khong_tu_bao_cho_chinh_minh` | ✅ Fail đúng test |

Cả hai lần, **đúng test tương ứng fail và 19 test còn lại vẫn xanh** — bộ test khoanh vùng lỗi chính xác, không báo động dây chuyền. Mã nguồn đã được hoàn nguyên nguyên trạng (`git status` sạch).

---

## 7. Defect log

Không có lỗi chức năng nào được phát hiện trong đợt này — 117/117 test đạt. Các vấn đề dưới đây thuộc về hạ tầng kiểm thử và chất lượng mã.

| # | Mức độ | Vấn đề | Hiện trạng |
|--:|---|---|---|
| D-01 | **Cao** | `ruff check .` báo **103 lỗi** trên mã nguồn có sẵn → job *Backend - lint & test* trong CI sẽ đỏ, kéo theo quy tắc "CI đỏ thì không merge" bị vô hiệu trên thực tế. Phân bố: `I001` unsorted-imports 36 · `UP017` datetime-timezone-utc 24 · `E702` 15 · `E701` 11 · `UP037` 6 · `UP042` 5 · còn lại 6. **71 lỗi tự sửa được** bằng `ruff check --fix .` | ⚠️ Chưa xử lý — nằm ngoài phạm vi đợt này, cần một PR riêng |
| D-02 | Trung bình | Thiếu `backend/.env.test` nên không chạy được pytest sau khi clone. File mẫu `.env.test.example` lại ghi credentials (`postgresql:postgresql`) **không khớp** `docker-compose.yml` (`twl:twlpass`) | ✅ Đã sửa `.env.test.example` cho khớp compose và bổ sung hướng dẫn tạo database test |
| D-03 | Trung bình | `docs/test-report.md` được README trỏ tới nhưng không tồn tại | ✅ Chính là tài liệu này |
| D-04 | Thấp | Hai file test trùng chức năng: `test_task.py` (17 test) và `test_tasks.py` (6 test) cùng kiểm thử module Task, đều tự định nghĩa helper `make_user` riêng | ✅ Đã gộp vào `test_task.py` (20 test): dùng chung một bộ helper, bỏ 3 test trùng, giữ lại các assert mã lỗi của `test_tasks.py` |
| D-05 | Thấp | Không có test nào dùng lại fixture `register_user` / `login_user` / `auth_headers` sẵn có trong `conftest.py`; mỗi file tự viết helper riêng | ⚠️ Ghi nhận để dọn sau |
| D-06 | Thông tin | Cảnh báo `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead` xuất hiện mỗi lần chạy | Chưa ảnh hưởng; theo dõi khi nâng Starlette |

---

## 8. Hướng dẫn chạy lại

### Bước 1 — Dựng database test

```bash
docker compose up -d db

docker compose exec db psql -U twl -d postgres \
    -c "CREATE DATABASE smart_team_workspace_test"
```

> Nếu lệnh trên báo `role "twl" does not exist`, volume `postgres_data` trên máy bạn đã được khởi tạo từ trước với credentials khác. Kiểm tra bằng `docker compose exec db psql -U <user> -d postgres -c "\l"` rồi dùng đúng user đó. Trên máy chạy đợt kiểm thử này, database test được cấp cho một role riêng để không đụng vào dữ liệu phát triển:
>
> ```sql
> CREATE ROLE stw_test LOGIN PASSWORD '<password>' CREATEDB;
> ALTER DATABASE smart_team_workspace_test OWNER TO stw_test;
> ALTER SCHEMA public OWNER TO stw_test;   -- chạy trong database test
> ```

### Bước 2 — Cấu hình biến môi trường

```bash
cp backend/.env.test.example backend/.env.test
# Mở file và sửa TEST_DATABASE_URL cho khớp bước 1
```

`.env.test` nằm trong `.gitignore`, không commit.

### Bước 3 — Cài dependencies

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt   # Windows
# source .venv/bin/activate && pip install -r requirements-dev.txt   # macOS/Linux
```

### Bước 4 — Chạy test

```bash
# Toàn bộ
python -m pytest -v

# Chỉ integration toàn luồng
python -m pytest tests/test_integration_flow.py -v

# Kèm độ phủ
python -m pytest --cov=app --cov-report=term-missing
```

### Chạy trong Docker

Ảnh backend chỉ cài `requirements.txt` (có `pytest` nhưng **không** có `pytest-cov`), nên muốn đo độ phủ trong container phải cài thêm:

```bash
docker compose exec backend pip install pytest-cov
docker compose exec backend pytest --cov=app --cov-report=term-missing
```

---

## 9. Phần chưa kiểm thử và khuyến nghị

| Hạng mục | Tình trạng | Đề xuất |
|---|---|---|
| **US-19 · AI Sprint Summary** | Chưa có test (`chat/service.py` 36%, `llm_client.py` 34%) | Viết test với `llm_client` được mock để kiểm thử prompt và xử lý lỗi mà không cần API key thật. Bổ sung test cho `repositories/task_insights.py` (43%) — phần này thuần truy vấn DB, mock được hoàn toàn |
| **US-21 · Xuất CSV** | Chưa có endpoint | Chưa cần test |
| **Frontend** | CI mới dừng ở lint + build | Nếu còn thời gian, thêm vài E2E Playwright cho luồng đăng nhập → Kanban |
| **`services/sprint.py` nhánh `update`** | 67% | Bổ sung test cho chuyển trạng thái `PLANNED → ACTIVE → CLOSED` và ràng buộc một sprint `ACTIVE` mỗi dự án |
| **Lint CI (D-01)** | Đang đỏ | Chạy `ruff check --fix .` xử lý 71 lỗi tự động, 32 lỗi còn lại sửa tay trong một PR `chore(lint)` riêng |

### Đánh giá chung

Mục tiêu đặt ra trong README — *"các service quan trọng (auth, project, task) có unit test; luồng chính có integration test"* — đã đạt:

- Tầng API đạt **96%**, các service nghiệp vụ chính (`task` 85%, `notification` 98%, `auth` 78%) đều có test.
- Luồng chính hiện có integration test đi trọn vẹn từ đăng ký đến khi đóng dự án, kèm 8 kịch bản từ chối quyền được đối chiếu với ma trận phân quyền.
- Bộ test đã được kiểm chứng bằng mutation testing, không phải chỉ "xanh cho có".

Việc cần ưu tiên tiếp theo là **xử lý D-01** để CI thực sự chặn được merge như quy trình đã đề ra, sau đó là phủ test cho US-19.
