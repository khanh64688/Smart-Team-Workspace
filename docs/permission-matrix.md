# Business Rules & Permission Matrix

**Dự án:** Smart Team Workspace · **Chủ sở hữu tài liệu:** TV1
**Người tiêu thụ bắt buộc:** TV2 (`require_role`), TV3 (`require_project_member` / `require_project_manager`), TV4, TV7
**Cập nhật lần cuối:** 2026-07-29

> Đây là **nguồn sự thật duy nhất** về phân quyền. Mọi thay đổi phải báo cả nhóm và cập nhật file này trước khi sửa code.

---

## 1. Hai tầng quyền

Hệ thống dùng **hai tầng** quyền, kiểm tra theo thứ tự:

| Tầng | Lưu ở | Giá trị | Ý nghĩa |
|---|---|---|---|
| **Tầng 1 — Vai trò hệ thống** | `users.role` | `ADMIN`, `PM`, `MEMBER` | Người này là ai trong toàn hệ thống |
| **Tầng 2 — Vai trò trong dự án** | `project_members.project_role` | `OWNER`, `MANAGER`, `MEMBER` | Người này là gì trong dự án cụ thể |

**Thứ tự kiểm tra trong mọi endpoint có `project_id`:**

```
1. Có token hợp lệ?            không → 401
2. Đúng vai trò hệ thống?      không → 403
3. Là thành viên của dự án?    không → 403   (ADMIN được bỏ qua bước này)
4. Đủ vai trò trong dự án?     không → 403
5. Thoả business rule?         không → 400 / 409
```

**Quy tắc vàng:** không bao giờ trả `404` để che quyền. Người ngoài dự án luôn nhận `403` để thông điệp lỗi nhất quán.

---

## 2. Ma trận quyền — Vai trò hệ thống

Ký hiệu: ✅ được phép · 🟡 được phép có điều kiện (xem cột Ghi chú) · ❌ từ chối (`403`)

### 2.1 Tài khoản & xác thực

| Hành động | Endpoint | ADMIN | PM | MEMBER | Ghi chú |
|---|---|:--:|:--:|:--:|---|
| Đăng ký | `POST /auth/register` | — | — | — | Public |
| Đăng nhập | `POST /auth/login` | — | — | — | Public |
| Làm mới token | `POST /auth/refresh` | ✅ | ✅ | ✅ | |
| Đăng xuất | `POST /auth/logout` | ✅ | ✅ | ✅ | |
| Xem hồ sơ của mình | `GET /users/me` | ✅ | ✅ | ✅ | |
| Sửa hồ sơ của mình | `PUT /users/me` | ✅ | ✅ | ✅ | |
| Đổi mật khẩu | `PUT /auth/change-password` | ✅ | ✅ | ✅ | Phải nhập mật khẩu cũ |
| Tìm người dùng | `GET /users?q=` | ✅ | ✅ | 🟡 | MEMBER chỉ nhận `id`, `full_name`, `avatar` — **không** thấy email |
| Xem chi tiết người dùng khác | `GET /users/{id}` | ✅ | 🟡 | ❌ | PM chỉ xem được người trong dự án mình quản lý |
| Đổi vai trò hệ thống | `PATCH /users/{id}/role` | ✅ | ❌ | ❌ | Admin không tự hạ quyền chính mình |
| Khoá / mở tài khoản | `PATCH /users/{id}/active` | ✅ | ❌ | ❌ | Admin không tự khoá chính mình |

### 2.2 Dự án

| Hành động | Endpoint | ADMIN | PM | MEMBER | Ghi chú |
|---|---|:--:|:--:|:--:|---|
| Tạo dự án | `POST /projects` | ✅ | ✅ | ❌ | Người tạo tự thành `OWNER` |
| Xem danh sách dự án | `GET /projects` | ✅ | 🟡 | 🟡 | ADMIN thấy tất cả; còn lại chỉ thấy dự án mình là thành viên |
| Xem chi tiết dự án | `GET /projects/{id}` | ✅ | 🟡 | 🟡 | Phải là thành viên |
| Sửa dự án | `PUT /projects/{id}` | ✅ | 🟡 | ❌ | Phải là `OWNER`/`MANAGER` của dự án |
| Đóng dự án | `PATCH /projects/{id}/close` | ✅ | 🟡 | ❌ | Chỉ `OWNER` |
| Xoá dự án | `DELETE /projects/{id}` | ✅ | ❌ | ❌ | Soft delete; **chỉ ADMIN** |

### 2.3 Thành viên dự án

| Hành động | Endpoint | ADMIN | PM | MEMBER | Ghi chú |
|---|---|:--:|:--:|:--:|---|
| Xem danh sách thành viên | `GET /projects/{id}/members` | ✅ | 🟡 | 🟡 | Phải là thành viên |
| Thêm thành viên | `POST /projects/{id}/members` | ✅ | 🟡 | ❌ | `OWNER`/`MANAGER` |
| Đổi vai trò trong dự án | `PATCH /projects/{id}/members/{uid}` | ✅ | 🟡 | ❌ | Chỉ `OWNER` mới phong `MANAGER` |
| Xoá thành viên | `DELETE /projects/{id}/members/{uid}` | ✅ | 🟡 | ❌ | `OWNER`/`MANAGER`; không xoá `OWNER` cuối cùng |
| Tự rời dự án | `DELETE /projects/{id}/members/me` | ✅ | ✅ | ✅ | `OWNER` cuối cùng không được rời |

### 2.4 Sprint

| Hành động | Endpoint | ADMIN | PM | MEMBER | Ghi chú |
|---|---|:--:|:--:|:--:|---|
| Xem sprint | `GET /projects/{id}/sprints` | ✅ | 🟡 | 🟡 | Phải là thành viên |
| Tạo sprint | `POST /projects/{id}/sprints` | ✅ | 🟡 | ❌ | `OWNER`/`MANAGER` |
| Sửa sprint | `PUT /sprints/{id}` | ✅ | 🟡 | ❌ | `OWNER`/`MANAGER` |
| Đóng sprint | `PATCH /sprints/{id}/close` | ✅ | 🟡 | ❌ | `OWNER`/`MANAGER` |
| Xoá sprint | `DELETE /sprints/{id}` | ✅ | 🟡 | ❌ | Chỉ khi sprint chưa có task |

### 2.5 Task

| Hành động | Endpoint | ADMIN | PM | MEMBER | Ghi chú |
|---|---|:--:|:--:|:--:|---|
| Xem task | `GET /tasks`, `GET /tasks/{id}` | ✅ | 🟡 | 🟡 | Phải là thành viên dự án |
| Tạo task | `POST /tasks` | ✅ | 🟡 | 🟡 | MEMBER tạo được nhưng **chỉ tự gán cho mình** |
| Sửa nội dung task | `PUT /tasks/{id}` | ✅ | 🟡 | 🟡 | MEMBER chỉ sửa task mình phụ trách |
| Giao / đổi người phụ trách | `PATCH /tasks/{id}/assign` | ✅ | 🟡 | ❌ | `OWNER`/`MANAGER` |
| Đổi trạng thái, kéo thả | `PATCH /tasks/{id}/move` | ✅ | 🟡 | 🟡 | MEMBER chỉ với task mình phụ trách |
| Xoá task | `DELETE /tasks/{id}` | ✅ | 🟡 | ❌ | `OWNER`/`MANAGER` |

### 2.6 Comment

| Hành động | Endpoint | ADMIN | PM | MEMBER | Ghi chú |
|---|---|:--:|:--:|:--:|---|
| Xem comment | `GET /tasks/{id}/comments` | ✅ | 🟡 | 🟡 | Phải là thành viên dự án |
| Viết comment | `POST /tasks/{id}/comments` | ✅ | 🟡 | 🟡 | Phải là thành viên dự án |
| Sửa comment | `PUT /comments/{id}` | ✅ | 🟡 | 🟡 | **Chỉ tác giả**, trong vòng 15 phút |
| Xoá comment | `DELETE /comments/{id}` | ✅ | 🟡 | 🟡 | Tác giả, hoặc `OWNER`/`MANAGER` của dự án |

### 2.7 Dashboard, AI, Notification, Export

| Hành động | Endpoint | ADMIN | PM | MEMBER | Ghi chú |
|---|---|:--:|:--:|:--:|---|
| Xem dashboard dự án | `GET /projects/{id}/dashboard` | ✅ | 🟡 | 🟡 | Phải là thành viên |
| Tạo AI Sprint Report | `POST /sprints/{id}/ai-summary` | ✅ | 🟡 | ❌ | `OWNER`/`MANAGER` — tốn chi phí API nên giới hạn |
| Xem báo cáo AI đã tạo | `GET /sprints/{id}/ai-summary` | ✅ | 🟡 | 🟡 | Mọi thành viên xem được kết quả đã cache |
| Xem thông báo của mình | `GET /notifications` | ✅ | ✅ | ✅ | Chỉ thông báo của chính mình |
| Đánh dấu đã đọc | `PATCH /notifications/{id}/read` | ✅ | ✅ | ✅ | Chỉ thông báo của chính mình |
| Xuất CSV | `GET /tasks/export` | ✅ | 🟡 | ❌ | `OWNER`/`MANAGER` |

---

## 3. Ma trận quyền — Vai trò trong dự án

| Hành động trong dự án | OWNER | MANAGER | MEMBER |
|---|:--:|:--:|:--:|
| Xem mọi thứ trong dự án | ✅ | ✅ | ✅ |
| Sửa thông tin dự án | ✅ | ✅ | ❌ |
| Đóng / xoá dự án | ✅ | ❌ | ❌ |
| Thêm / xoá thành viên | ✅ | ✅ | ❌ |
| Phong người khác làm `MANAGER` | ✅ | ❌ | ❌ |
| Tạo / sửa / đóng sprint | ✅ | ✅ | ❌ |
| Tạo task cho người khác | ✅ | ✅ | ❌ |
| Tạo task cho chính mình | ✅ | ✅ | ✅ |
| Sửa / kéo task của người khác | ✅ | ✅ | ❌ |
| Sửa / kéo task của mình | ✅ | ✅ | ✅ |
| Bình luận | ✅ | ✅ | ✅ |
| Tạo báo cáo AI | ✅ | ✅ | ❌ |

---

## 4. Business Rules

### BR-01 · Vòng đời trạng thái task

```
TODO ⇄ IN_PROGRESS ⇄ REVIEW ⇄ DONE
```

- Chỉ được **tiến 1 bước** hoặc **lùi 1 bước**. Nhảy cóc (ví dụ `TODO` → `DONE`) trả `400`.
- Chuyển sang `DONE` sẽ ghi lại `completed_at = now()`.
- Kéo ra khỏi `DONE` sẽ xoá `completed_at`.

### BR-02 · Ràng buộc Sprint

- Mỗi dự án tối đa **1 sprint `ACTIVE`** tại một thời điểm.
- `end_date` phải sau `start_date`.
- Vòng đời: `PLANNED` → `ACTIVE` → `CLOSED`. Không quay lui.
- Sprint `CLOSED` không nhận task mới.

### BR-03 · Ràng buộc giao việc

- Người được giao **bắt buộc** đang là thành viên của dự án chứa task đó.
- Xoá một thành viên khỏi dự án → mọi task của người đó chuyển `assignee_id = NULL` (không xoá task).
- Một task chỉ có tối đa 1 người phụ trách (không làm multi-assignee ở MVP).

### BR-04 · Deadline & trạng thái quá hạn

- Task **quá hạn** khi `due_date < now()` **và** `status ≠ DONE`.
- Sinh thông báo nhắc khi task còn **≤ 24 giờ** đến hạn, mỗi task chỉ nhắc **1 lần**.
- Deadline của task không được vượt quá `end_date` của sprint → cảnh báo (không chặn cứng).

### BR-05 · Quyền sở hữu dự án

- Dự án luôn phải có **ít nhất 1 `OWNER`**.
- `OWNER` cuối cùng không thể bị xoá và không thể tự rời dự án. Phải chuyển quyền sở hữu trước.

### BR-06 · Toàn vẹn dữ liệu khi xoá

| Xoá | Ảnh hưởng |
|---|---|
| Dự án | Soft delete; sprint và task của dự án ẩn theo |
| Sprint | Chỉ xoá được khi không còn task; hoặc task chuyển về backlog |
| Task | Xoá kèm toàn bộ comment (`CASCADE`) |
| Người dùng | Không xoá cứng; chỉ đặt `is_active = false` để giữ lịch sử comment và task |

### BR-07 · Giới hạn gọi AI

- Tối đa **5 lần / sprint / giờ** để tránh đội chi phí API.
- Kết quả được cache; chỉ gọi lại LLM khi người dùng bấm "Làm mới" hoặc dữ liệu sprint đã đổi.
- LLM lỗi hoặc timeout (> 30 giây) → trả `503` kèm thông điệp thân thiện, frontend **không được sập**.

### BR-08 · Bảo mật

- Mật khẩu: tối thiểu 8 ký tự, có cả chữ và số; lưu bằng bcrypt (cost ≥ 12) hoặc argon2.
- Access token ~15 phút · Refresh token ~7 ngày, thu hồi được.
- `AI_API_KEY`, `SECRET_KEY`, thông tin database **chỉ** nằm trong `.env` phía backend. Không đưa ra frontend, không commit lên Git.
- Thông báo lỗi đăng nhập không được tiết lộ email có tồn tại hay không.

---

## 5. Mã lỗi HTTP thống nhất

| Mã | Khi nào dùng | Ví dụ |
|---|---|---|
| `400` | Dữ liệu sai hoặc vi phạm business rule | Nhảy cóc trạng thái, `end_date` < `start_date` |
| `401` | Chưa đăng nhập hoặc token hết hạn | Thiếu header `Authorization` |
| `403` | Đã đăng nhập nhưng không đủ quyền | MEMBER gọi API tạo dự án |
| `404` | Tài nguyên không tồn tại | Task id không có trong DB |
| `409` | Xung đột trạng thái | Email đã tồn tại, thêm thành viên trùng |
| `422` | Sai schema (Pydantic tự trả) | Thiếu field bắt buộc |
| `503` | Dịch vụ ngoài lỗi | LLM timeout |

**Format lỗi chuẩn (thống nhất toàn hệ thống):**

```json
{
  "error": {
    "code": "TASK_INVALID_TRANSITION",
    "message": "Không thể chuyển task từ TODO sang DONE.",
    "details": { "from": "TODO", "to": "DONE" }
  }
}
```

---

## 6. Bộ test phân quyền bắt buộc

TV2 và TV3 phải có unit test phủ tối thiểu các trường hợp sau:

- [ ] Không token → `401` trên mọi endpoint cần đăng nhập
- [ ] MEMBER tạo dự án → `403`
- [ ] Người ngoài dự án gọi `GET /projects/{id}` → `403` (không phải `404`)
- [ ] MEMBER kéo task của người khác → `403`
- [ ] MEMBER kéo task của chính mình → `200`
- [ ] Xoá `OWNER` cuối cùng → `400`
- [ ] Giao task cho người ngoài dự án → `400`
- [ ] Chuyển `TODO` → `DONE` → `400`
- [ ] Tạo sprint `ACTIVE` thứ hai trong cùng dự án → `409`
- [ ] MEMBER gọi `POST /sprints/{id}/ai-summary` → `403`
