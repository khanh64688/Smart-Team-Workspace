# Product Backlog — Smart Team Workspace

**Dự án:** Smart Team Workspace — A Project and Task Management System for Student Teams with AI-powered Sprint Summarization
**Nhóm:** 7 thành viên · **Thời gian:** 3 tuần · **Chủ sở hữu tài liệu:** TV1 (Scrum Master)
**Cập nhật lần cuối:** 2026-07-29

---

## 1. Quy ước

- **Định dạng story:** `Là <role>, tôi muốn <hành động>, để <giá trị>`
- **Ước lượng:** Story Point theo Fibonacci (1, 2, 3, 5, 8)
- **Mức ưu tiên:** `P0` = bắt buộc có để demo · `P1` = nên có · `P2` = làm khi còn thời gian
- **Definition of Done (áp dụng cho MỌI story):**
  1. Code đã merge vào `develop`, CI xanh
  2. Có ít nhất 1 người review PR
  3. Acceptance Criteria được tick đủ
  4. API có trong `docs/openapi.yaml`
  5. Chạy được bằng `docker compose up` từ máy trắng

### Vai trò hệ thống

| Ký hiệu | Tên | Mô tả |
|---|---|---|
| `ADMIN` | Administrator | Quản trị toàn hệ thống, quản lý tài khoản |
| `PM` | Project Manager | Tạo và điều hành dự án, giao việc |
| `MEMBER` | Team Member | Thực hiện task được giao |

---

## 2. Epic 1 — Authentication & Account *(TV2)*

### US-01 · Đăng ký tài khoản — `P0` — 3 SP

> Là **khách**, tôi muốn đăng ký tài khoản bằng email và mật khẩu, để có thể tham gia hệ thống.

**Acceptance Criteria**

- [ ] Form yêu cầu: email, họ tên, mật khẩu, xác nhận mật khẩu
- [ ] Email sai định dạng → hiện lỗi tại field, không gọi API
- [ ] Email đã tồn tại → API trả `409`, giao diện hiện "Email đã được sử dụng"
- [ ] Mật khẩu < 8 ký tự hoặc không có chữ + số → từ chối
- [ ] Đăng ký thành công → mật khẩu được lưu dưới dạng hash (bcrypt/argon2), **không bao giờ lưu plaintext**
- [ ] Tài khoản mới mặc định role = `MEMBER`

### US-02 · Đăng nhập — `P0` — 3 SP

> Là **người dùng đã đăng ký**, tôi muốn đăng nhập, để truy cập dự án của mình.

**Acceptance Criteria**

- [ ] Đăng nhập đúng → trả `access_token` (~15 phút), `refresh_token` (~7 ngày) và thông tin user
- [ ] Sai email hoặc mật khẩu → `401` với thông báo chung "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không)
- [ ] Tài khoản `is_active = false` → `403`
- [ ] Payload JWT chứa `sub` (user_id) và `role`

### US-03 · Duy trì phiên đăng nhập — `P0` — 3 SP

> Là **người dùng**, tôi muốn phiên làm việc tự gia hạn, để không bị đăng xuất giữa chừng.

**Acceptance Criteria**

- [ ] `POST /auth/refresh` với refresh token hợp lệ → cấp access token mới
- [ ] Refresh token hết hạn hoặc đã thu hồi → `401`, frontend tự đăng xuất
- [ ] Frontend tự động gọi refresh khi gặp `401`, thử lại request gốc đúng **1 lần**
- [ ] `POST /auth/logout` thu hồi refresh token

### US-04 · Đổi mật khẩu — `P0` — 2 SP

> Là **người dùng**, tôi muốn đổi mật khẩu, để bảo vệ tài khoản.

**Acceptance Criteria**

- [ ] Bắt buộc nhập mật khẩu cũ; sai → `400`
- [ ] Mật khẩu mới phải khác mật khẩu cũ
- [ ] Đổi thành công → thu hồi toàn bộ refresh token đang có

### US-05 · Phân quyền theo vai trò — `P0` — 3 SP

> Là **hệ thống**, tôi muốn chặn truy cập không đúng vai trò, để dữ liệu không bị lộ.

**Acceptance Criteria**

- [ ] Gọi API không có token → `401`
- [ ] Có token nhưng sai vai trò → `403`
- [ ] Dependency `get_current_user` và `require_role(*roles)` được export ở `backend/app/core/deps.py`
- [ ] Chi tiết quyền tuân theo `docs/permission-matrix.md`

---

## 3. Epic 2 — Project & Member *(TV3)*

### US-06 · Tạo dự án — `P0` — 3 SP

> Là **PM**, tôi muốn tạo dự án mới, để bắt đầu quản lý công việc nhóm.

**Acceptance Criteria**

- [ ] Trường bắt buộc: tên dự án (3–100 ký tự); mô tả tuỳ chọn
- [ ] Người tạo tự động trở thành `owner` và là thành viên của dự án
- [ ] `MEMBER` gọi API tạo dự án → `403`, giao diện ẩn nút "Tạo dự án"
- [ ] Trạng thái mặc định `ACTIVE`

### US-07 · Xem danh sách dự án — `P0` — 3 SP

> Là **người dùng**, tôi muốn xem các dự án mình tham gia, để chọn dự án cần làm việc.

**Acceptance Criteria**

- [ ] Chỉ trả về dự án mà người dùng là thành viên (trừ `ADMIN` xem được tất cả)
- [ ] Hỗ trợ `?q=` tìm theo tên, `?status=` lọc, `?page=&size=` phân trang, `?sort=`
- [ ] Response đúng format `{ data: [...], meta: { page, size, total } }`
- [ ] Không có dự án nào → hiện màn hình trống kèm hướng dẫn

### US-08 · Quản lý thành viên dự án — `P0` — 5 SP

> Là **PM**, tôi muốn thêm/xoá thành viên, để đúng người tham gia đúng dự án.

**Acceptance Criteria**

- [ ] Tìm người dùng theo tên/email rồi thêm vào dự án
- [ ] Thêm trùng người → `409`
- [ ] Xoá thành viên có xác nhận; task của người đó chuyển về trạng thái chưa gán
- [ ] **Không cho phép xoá owner cuối cùng** của dự án
- [ ] Chỉ `PM` / `owner` thao tác được

### US-09 · Đóng / lưu trữ dự án — `P1` — 2 SP

> Là **PM**, tôi muốn đóng dự án đã kết thúc, để danh sách gọn gàng.

**Acceptance Criteria**

- [ ] `PATCH /projects/{id}` đổi status sang `CLOSED`
- [ ] Dự án đã đóng chuyển sang chế độ chỉ đọc (không tạo/sửa task)
- [ ] Mặc định danh sách ẩn dự án đã đóng, có bộ lọc để xem lại

---

## 4. Epic 3 — Sprint *(TV4)*

### US-10 · Tạo sprint — `P0` — 3 SP

> Là **PM**, tôi muốn chia dự án thành các sprint, để quản lý theo chu kỳ.

**Acceptance Criteria**

- [ ] Trường: tên, mục tiêu (goal), ngày bắt đầu, ngày kết thúc
- [ ] `end_date` phải sau `start_date` → nếu sai trả `400`
- [ ] **Mỗi dự án chỉ có tối đa 1 sprint ở trạng thái `ACTIVE`**
- [ ] Sprint mới tạo có trạng thái `PLANNED`

### US-11 · Đóng sprint — `P0` — 2 SP

> Là **PM**, tôi muốn đóng sprint, để chốt kết quả chu kỳ.

**Acceptance Criteria**

- [ ] Đóng sprint → status = `CLOSED`
- [ ] Task chưa `DONE` được hỏi: chuyển sang sprint kế tiếp hay đưa về backlog
- [ ] Sprint đã đóng không thêm task mới được

---

## 5. Epic 4 — Task & Kanban *(TV4 backend · TV6 frontend)*

### US-12 · Tạo và giao task — `P0` — 5 SP

> Là **PM**, tôi muốn tạo task và giao cho thành viên, để phân chia công việc rõ ràng.

**Acceptance Criteria**

- [ ] Trường: tiêu đề (bắt buộc), mô tả, sprint, người phụ trách, priority, deadline
- [ ] **Chỉ giao được cho người đã là thành viên của dự án** → sai thì `400`
- [ ] `priority` ∈ {`LOW`, `MEDIUM`, `HIGH`, `URGENT`}, mặc định `MEDIUM`
- [ ] Trạng thái khởi tạo `TODO`
- [ ] Tạo xong sinh thông báo cho người được giao

### US-13 · Kéo thả Kanban — `P0` — 8 SP

> Là **Team Member**, tôi muốn kéo thả task giữa các cột, để cập nhật tiến độ nhanh.

**Acceptance Criteria**

- [ ] Board có đúng 4 cột: `Todo` · `In Progress` · `Review` · `Done`
- [ ] Kéo thả gọi `PATCH /tasks/{id}/move` với body `{ status, position }`
- [ ] Luồng hợp lệ: tiến 1 bước hoặc lùi 1 bước; nhảy cóc → `400`
- [ ] Optimistic update: UI đổi ngay, **rollback về vị trí cũ nếu API lỗi** kèm toast
- [ ] Thứ tự thẻ trong cột được lưu lại, tải lại trang vẫn đúng
- [ ] Member chỉ kéo được task của chính mình; PM kéo được mọi task

### US-14 · Xem chi tiết & sửa task — `P0` — 3 SP

> Là **Team Member**, tôi muốn mở chi tiết task, để biết mình cần làm gì.

**Acceptance Criteria**

- [ ] Modal hiển thị: tiêu đề, mô tả, người phụ trách, priority, deadline, sprint, trạng thái, comment
- [ ] Task quá hạn hiển thị nhãn đỏ "Quá hạn"
- [ ] Đổi trạng thái nhanh ngay trong modal
- [ ] Người không có quyền sửa → các field ở chế độ chỉ đọc

### US-15 · Bình luận trong task — `P0` — 3 SP

> Là **Team Member**, tôi muốn bình luận trong task, để trao đổi mà không cần họp.

**Acceptance Criteria**

- [ ] Comment sắp xếp theo thời gian tăng dần, hiển thị tên + avatar + thời điểm
- [ ] Nội dung rỗng → không gửi
- [ ] Chỉ tác giả xoá được comment của mình
- [ ] Tạo comment sinh thông báo cho người phụ trách task

---

## 6. Epic 5 — Dashboard & Search *(TV4 backend · TV6 frontend)*

### US-16 · Dashboard dự án — `P0` — 5 SP

> Là **PM**, tôi muốn xem tổng quan bằng biểu đồ, để nắm tiến độ trong 5 giây.

**Acceptance Criteria**

- [ ] Thẻ số liệu: tổng task · đang làm · hoàn thành · **quá hạn**
- [ ] Biểu đồ tròn theo trạng thái, biểu đồ cột theo priority, biểu đồ cột theo người phụ trách
- [ ] Dữ liệu lấy từ **một** endpoint `GET /projects/{id}/dashboard`
- [ ] Dự án chưa có task → hiện màn hình trống, không hiện biểu đồ rỗng
- [ ] Kéo thả task xong, quay lại dashboard thấy số liệu đã đổi

### US-17 · Tìm kiếm và lọc task — `P0` — 3 SP

> Là **người dùng**, tôi muốn lọc task, để tìm nhanh việc cần quan tâm.

**Acceptance Criteria**

- [ ] Lọc theo: trạng thái, priority, người phụ trách, sprint, cờ quá hạn
- [ ] Ô tìm kiếm theo tiêu đề, có debounce 300ms
- [ ] Bộ lọc đồng bộ vào query string trên URL → copy link chia sẻ được
- [ ] Không có kết quả → hiện "Không tìm thấy task phù hợp"

---

## 7. Epic 6 — Notification *(TV7)*

### US-18 · Thông báo trong ứng dụng — `P1` — 5 SP

> Là **Team Member**, tôi muốn nhận thông báo, để không bỏ lỡ việc được giao.

**Acceptance Criteria**

- [ ] Sinh thông báo khi: được giao task mới · có comment mới trên task của mình · task còn ≤ 24h đến hạn
- [ ] Chuông ở header hiển thị số thông báo chưa đọc
- [ ] Bấm vào thông báo → mở đúng task và đánh dấu đã đọc
- [ ] Cập nhật bằng **polling 30 giây** (không dùng WebSocket)
- [ ] Có nút "Đánh dấu tất cả đã đọc"

---

## 8. Epic 7 — AI Sprint Summary *(TV7) — ĐIỂM NHẤN*

### US-19 · Báo cáo tiến độ sprint bằng AI — `P0` — 8 SP

> Là **PM**, tôi muốn bấm một nút để AI tóm tắt tiến độ sprint, để viết báo cáo nhanh và phát hiện rủi ro sớm.

**Acceptance Criteria**

- [ ] Nút "Generate Sprint Report" trên trang sprint/dashboard
- [ ] Backend gom: danh sách task, trạng thái, người phụ trách, deadline, comment gần đây → gửi LLM
- [ ] Kết quả trả về **đúng JSON schema**:
      `{ overview, completed[], at_risk[], blockers[], overloaded_members[], next_priorities[] }`
- [ ] Có loading state; thời gian phản hồi mục tiêu < 15 giây
- [ ] LLM lỗi/timeout → hiện thông báo thân thiện, **không làm sập trang**
- [ ] Kết quả được cache theo sprint, chỉ gọi lại khi người dùng bấm "Làm mới"
- [ ] `AI_API_KEY` chỉ nằm ở backend `.env`, không lộ ra frontend, không commit lên Git

---

## 9. Epic 8 — Administration & Export

### US-20 · Quản trị người dùng — `P1` — 3 SP *(TV2)*

> Là **Administrator**, tôi muốn xem và khoá tài khoản, để quản lý hệ thống.

**Acceptance Criteria**

- [ ] Danh sách người dùng có tìm kiếm và phân trang
- [ ] Bật/tắt `is_active`; tài khoản bị khoá không đăng nhập được
- [ ] Admin không tự khoá chính mình

### US-21 · Xuất danh sách task ra CSV — `P2` — 2 SP *(TV7)*

> Là **PM**, tôi muốn xuất task ra CSV, để báo cáo ngoài hệ thống.

**Acceptance Criteria**

- [ ] `GET /tasks/export` tôn trọng bộ lọc đang áp dụng
- [ ] File CSV mã hoá UTF-8 có BOM (mở bằng Excel không lỗi tiếng Việt)
- [ ] Cột: mã task, tiêu đề, trạng thái, priority, người phụ trách, deadline, sprint

---

## 10. Sprint Plan

### Sprint 0 — Tuần 1: Thiết kế & dựng nền

| Mục tiêu | Story |
|---|---|
| Chốt yêu cầu, ERD, API contract | — (công việc M0) |
| Auth chạy được | US-01, US-02, US-03, US-05 |
| Khung frontend + login | (phần frontend của US-01, US-02) |
| Docker Compose, CI | — (công việc M0, TV7) |

**Cam kết cuối tuần 1:** đăng ký / đăng nhập chạy thật qua Docker.

### Sprint 1 — Tuần 2: Hoàn thiện chức năng chính

| Mục tiêu | Story |
|---|---|
| Project & Member | US-06, US-07, US-08, US-09 |
| Sprint & Task | US-10, US-11, US-12 |
| Kanban & chi tiết task | US-13, US-14, US-15 |
| Dashboard & tìm kiếm | US-16, US-17 |
| Đổi mật khẩu | US-04 |

**Cam kết cuối tuần 2:** demo trọn luồng tạo dự án → giao task → kéo Kanban → xem dashboard.

### Sprint 2 — Tuần 3: Điểm nhấn, kiểm thử, bàn giao

| Mục tiêu | Story |
|---|---|
| AI Sprint Summary | US-19 |
| Thông báo | US-18 |
| Quản trị người dùng | US-20 |
| CSV export (nếu kịp) | US-21 |
| Integration test, seed data, tài liệu, slide | — |

**Cam kết cuối tuần 3:** sản phẩm deploy được, tài liệu đầy đủ, demo trơn tru.

---

## 11. Ngoài phạm vi (Out of scope) — thống nhất KHÔNG làm

WebSocket realtime · chat giữa thành viên · Gantt chart · Elasticsearch · Celery/RabbitMQ · OCR · tích hợp Google Calendar · gửi email quên mật khẩu thật · kiến trúc microservices · train hoặc fine-tune mô hình AI · hệ thống permission tuỳ biến chi tiết.

> Chỉ cân nhắc bổ sung sau khi toàn bộ story `P0` đã chạy ổn định.

---

## 12. Tổng hợp Story Point

| Epic | P0 | P1 | P2 | Tổng |
|---|---:|---:|---:|---:|
| 1 · Authentication | 14 | 0 | 0 | 14 |
| 2 · Project & Member | 11 | 2 | 0 | 13 |
| 3 · Sprint | 5 | 0 | 0 | 5 |
| 4 · Task & Kanban | 19 | 0 | 0 | 19 |
| 5 · Dashboard & Search | 8 | 0 | 0 | 8 |
| 6 · Notification | 0 | 5 | 0 | 5 |
| 7 · AI Summary | 8 | 0 | 0 | 8 |
| 8 · Admin & Export | 0 | 3 | 2 | 5 |
| **Tổng** | **65** | **10** | **2** | **77** |
