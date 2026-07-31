# Kịch bản Demo & Phản biện

**Dự án:** Smart Team Workspace
**Thời lượng:** 12 phút demo + 8 phút hỏi đáp
**Chuẩn bị bởi:** TV1

---

## 1. Chuẩn bị trước khi demo

**Làm trước buổi demo 30 phút:**

- [ ] `docker compose down -v && docker compose up --build` — chạy lại từ đầu để chắc chắn không lỗi
- [ ] `alembic upgrade head` rồi `python -m app.scripts.seed_data --reset`
- [ ] Đăng nhập sẵn `pm@twl.dev` trên tab 1, `an@twl.dev` trên tab 2 (cửa sổ ẩn danh)
- [ ] Mở sẵn Swagger UI ở tab 3, kho GitHub ở tab 4
- [ ] Kiểm tra `AI_API_KEY` còn hạn mức — **gọi thử AI summary 1 lần trước khi vào phòng**
- [ ] Chuẩn bị ảnh chụp kết quả AI để dự phòng nếu mạng hỏng
- [ ] Phóng to trình duyệt lên 110–125% cho dễ nhìn
- [ ] Tắt thông báo hệ thống, tắt các tab không liên quan

**Phân vai khi demo**

| Người | Vai trò trong demo |
|---|---|
| TV1 | Dẫn dắt, giới thiệu bối cảnh và kiến trúc |
| TV5 hoặc TV6 | Thao tác trên giao diện |
| TV2 hoặc TV4 | Trả lời câu hỏi backend |
| TV7 | Trình bày phần AI, CI/CD, deploy |

---

## 2. Kịch bản 12 phút

### Phút 0:00 – 1:00 · Mở đầu

> "Chào thầy/cô và cả lớp. Nhóm em xin trình bày **Smart Team Workspace** — hệ thống quản lý dự án dành cho nhóm sinh viên.
>
> Bài toán bọn em gặp: khi làm bài tập lớn 7 người, nhóm thường quản lý việc bằng chat và file Excel, dẫn tới không ai biết ai đang làm gì và việc trễ hạn chỉ phát hiện khi đã muộn.
>
> Sản phẩm giải quyết đúng vấn đề đó, và có thêm một điểm nhấn: **AI tự tổng hợp tiến độ sprint và chỉ ra rủi ro** — thay vì trưởng nhóm phải ngồi đọc từng task."

Chiếu 1 slide kiến trúc: React ⇄ FastAPI ⇄ PostgreSQL, cạnh bên là LLM API.

### Phút 1:00 – 2:30 · Đăng nhập và phân quyền

1. Mở trang đăng nhập, đăng nhập `pm@twl.dev`
2. Chỉ vào sidebar: "Đây là tài khoản Project Manager, có nút Tạo dự án"
3. Chuyển sang tab ẩn danh đã đăng nhập `an@twl.dev`
4. Chỉ ra: **nút Tạo dự án không hiển thị**

> "Phân quyền được kiểm tra ở cả hai phía. Giao diện ẩn nút, nhưng quan trọng hơn là backend chặn thật."

5. Mở Swagger, gọi `POST /projects` bằng token của member → **hiện `403`**

> "Đây là điểm bọn em chú ý: ẩn nút chỉ là trải nghiệm, chặn thật nằm ở server."

### Phút 2:30 – 4:00 · Dự án và thành viên

1. Về tab PM, mở dự án **"Website Thương mại điện tử"**
2. Vào tab Thành viên — cho thấy 5 người với vai trò khác nhau
3. Bấm Thêm thành viên, gõ `em` → gợi ý hiện ra → thêm vào
4. Thử xoá owner cuối cùng → **hiện thông báo chặn**

> "Ràng buộc nghiệp vụ này nằm ở tầng service, không phải chỉ validate ở giao diện."

### Phút 4:00 – 6:30 · Sprint, Task và Kanban *(phần quan trọng nhất)*

1. Mở tab Sprint: cho thấy Sprint 0 đã đóng, Sprint 1 đang chạy
2. Bấm **Tạo task**: tiêu đề "Viết tài liệu hướng dẫn sử dụng", giao cho `an@twl.dev`, priority `HIGH`, deadline ngày mai
3. Mở màn hình Kanban — thẻ mới nằm ở cột **Todo**
4. **Kéo thẻ từ Todo sang In Progress** → dừng lại một nhịp

> "Thao tác này gọi `PATCH /tasks/{id}/move`. Giao diện cập nhật ngay theo cơ chế optimistic update; nếu API lỗi thì thẻ tự quay về vị trí cũ."

5. Mở chi tiết task, viết một bình luận
6. **Chuyển sang tab tài khoản `an@twl.dev`** → tải lại → **chuông thông báo có badge đỏ**
7. Bấm chuông → mở đúng task vừa được giao

> "Thông báo dùng polling 30 giây. Bọn em cân nhắc WebSocket nhưng thấy chưa cần thiết cho quy mô này, và ưu tiên hoàn thiện luồng chính trước."

8. Chỉ vào một task có nhãn đỏ **Quá hạn**

### Phút 6:30 – 8:00 · Dashboard

1. Mở tab Dashboard của dự án
2. Chỉ 4 thẻ số liệu: tổng task · đang làm · hoàn thành · **quá hạn**
3. Chỉ 3 biểu đồ: tròn theo trạng thái · cột theo priority · cột theo người phụ trách
4. Chỉ vào cột cao bất thường của `binh@twl.dev`

> "Nhìn biểu đồ này thấy ngay bạn Bình đang ôm quá nhiều việc — đây chính là thông tin mà trưởng nhóm cần."

5. Dùng bộ lọc: chọn "Chỉ hiện task quá hạn" → chỉ vào URL đã đổi

> "Bộ lọc được đồng bộ vào URL nên có thể copy link gửi cho nhau."

### Phút 8:00 – 10:30 · AI Sprint Summary *(điểm nhấn)*

1. Quay lại trang Sprint 1, bấm **Generate Sprint Report**
2. Trong lúc chờ, giải thích:

> "Backend gom danh sách task, trạng thái, người phụ trách, deadline và các bình luận gần đây, đưa vào một prompt có ràng buộc JSON schema, rồi gọi LLM.
>
> Bọn em cố ý **không** làm chatbot RAG. Với 3 tuần, một endpoint làm thật tốt có giá trị hơn một chatbot làm dở."

3. Kết quả hiện ra — đọc to 3 phần:
   - **Tổng quan tiến độ**
   - **Rủi ro và blocker** — chỉ ra AI đã nhặt đúng các task quá hạn
   - **Thành viên đang quá tải** — trùng với biểu đồ dashboard vừa xem

> "Điều đáng nói là AI nhận ra bạn Bình quá tải từ dữ liệu thật, khớp với biểu đồ ở dashboard. Đây không phải văn bản chung chung."

4. Nhắc phần xử lý lỗi:

> "Nếu API lỗi hoặc quá 30 giây, hệ thống trả thông báo thân thiện và trang vẫn hoạt động bình thường. Kết quả được cache theo sprint để tránh gọi lại tốn chi phí."

### Phút 10:30 – 12:00 · Chất lượng kỹ thuật

Chuyển sang tab GitHub và terminal:

1. **Cấu trúc mã nguồn** — mở `backend/app/`, chỉ 4 tầng: api → services → repositories → models
2. **Test** — chạy `docker compose exec backend pytest -v`, cho thấy các test xanh
3. **CI** — mở tab Actions trên GitHub, chỉ các lần chạy xanh
4. **Docker** — "Toàn bộ hệ thống khởi động bằng một lệnh `docker compose up`"
5. **Tài liệu** — mở nhanh `docs/backlog.md` và `docs/permission-matrix.md`

> "Nhóm em xác định từ đầu là làm 8 module thật chắc thay vì 20 module nửa vời. Những phần bọn em chủ động không làm — realtime, Gantt, Elasticsearch — đều được ghi rõ trong tài liệu kèm lý do."

---

## 3. Kế hoạch dự phòng

| Sự cố | Xử lý |
|---|---|
| Mất mạng | Chạy bản local, dùng ảnh chụp kết quả AI đã chuẩn bị |
| AI API hết hạn mức | Chỉ vào kết quả đã cache trong DB, giải thích cơ chế cache |
| Docker không lên | Dùng link deploy trên Render/Railway |
| Kéo thả bị lag | Chuyển trạng thái bằng dropdown trong modal chi tiết task |
| Dữ liệu bị hỏng | `python -m app.scripts.seed_data --reset` (mất khoảng 5 giây) |

---

## 4. Câu hỏi phản biện thường gặp

> Trainer có thể hỏi **bất kỳ ai** trong nhóm. Mỗi người phải nắm được phần mình phụ trách.

### Về kiến trúc

**Vì sao dùng Repository Pattern mà không gọi thẳng SQLAlchemy trong router?**
Tách tầng giúp service không phụ thuộc cách truy vấn dữ liệu, và khi viết unit test có thể thay repository bằng bản giả mà không cần database thật. Với 7 người làm song song, ranh giới rõ ràng giúp giảm xung đột merge.

**Vì sao chọn FastAPI thay vì Django?**
Cần API thuần, không cần admin site hay template engine. FastAPI có validate bằng Pydantic và tự sinh OpenAPI — mà OpenAPI chính là hợp đồng để frontend và backend làm song song.

**Vì sao PostgreSQL mà không phải MongoDB?**
Dữ liệu có quan hệ rõ ràng (user – project – sprint – task – comment) và cần ràng buộc toàn vẹn cùng transaction. Đây là bài toán quan hệ điển hình.

### Về phân quyền

**Phân quyền kiểm tra ở đâu?**
Hai tầng. Tầng một là vai trò hệ thống qua dependency `require_role`. Tầng hai là vai trò trong từng dự án qua `require_project_member` / `require_project_manager`. Toàn bộ quy tắc nằm trong `docs/permission-matrix.md`.

**Vì sao người ngoài dự án nhận `403` chứ không phải `404`?**
Nhóm em chọn thông điệp nhất quán để dễ xử lý ở frontend. Có thể tranh luận rằng `404` an toàn hơn vì không tiết lộ tài nguyên tồn tại; đây là đánh đổi bọn em đã cân nhắc và ghi lại trong tài liệu.

### Về Kanban

**Xử lý thế nào nếu hai người cùng kéo một task?**
Backend nhận cả hai request, người sau ghi đè. Với quy mô nhóm sinh viên, xác suất xảy ra rất thấp. Nếu mở rộng, bọn em sẽ thêm khoá lạc quan bằng trường `version`.

**Vì sao lưu `position` thay vì chỉ lưu số thứ tự?**
Dùng số thực cách xa nhau (bước 65536) nên khi chèn một thẻ vào giữa chỉ cần cập nhật đúng thẻ đó, không phải đánh số lại cả cột.

### Về AI

**AI có thực sự hữu ích hay chỉ để trang trí?**
Nó đọc dữ liệu thật của sprint và chỉ ra ba thứ mà trưởng nhóm quan tâm: việc trễ hạn, blocker được nêu trong bình luận, và người đang quá tải. Như vừa demo, kết quả khớp với biểu đồ dashboard.

**Vì sao không làm chatbot RAG?**
Trong 3 tuần, bọn em ưu tiên một tính năng hoàn chỉnh, có xử lý lỗi và cache, hơn là một chatbot chạy chập chờn. Đây là quyết định về phạm vi, đã ghi trong backlog.

**Bảo mật khoá API thế nào?**
Khoá chỉ nằm trong `.env` phía backend, không xuất hiện trong bundle frontend, không commit lên Git. Frontend chỉ gọi endpoint nội bộ của hệ thống.

**Nếu LLM trả về JSON sai định dạng?**
Prompt ràng buộc schema, backend parse có xử lý ngoại lệ. Parse lỗi thì trả `503` kèm thông báo thân thiện, giao diện không sập.

### Về quy trình

**Nhóm 7 người chia việc thế nào để không giẫm chân nhau?**
Tuần đầu chốt ERD và OpenAPI làm hợp đồng chung, sau đó mỗi người sở hữu một tập file riêng. Trên bảng Trello có các thẻ đánh dấu `[CONTRACT]` và `[INTERFACE]` cho các điểm tiếp giáp, và mỗi module có một thẻ `[EXPORT]` liệt kê chính xác file bàn giao.

**Có dùng AI hỗ trợ viết code không?**
Có, và bọn em ghi nhận điều đó. Nhưng mỗi người đều phải giải thích được phần mình phụ trách — thầy/cô có thể hỏi bất kỳ ai trong nhóm.

**Nếu có thêm một tuần nữa, nhóm sẽ làm gì?**
Theo thứ tự ưu tiên: tăng độ phủ test, thêm burndown chart cho sprint, rồi mới đến CSV export và tuỳ chỉnh thông báo. Không thêm module mới.

---

## 5. Danh sách kiểm tra cuối

- [ ] Mọi người tập nói trước ít nhất một lượt, bấm giờ
- [ ] Không ai đọc nguyên văn slide
- [ ] Mỗi thành viên nói được ít nhất 1 phút về phần của mình
- [ ] Trả lời trung thực khi không biết: "Phần đó bạn X phụ trách, để bạn ấy trả lời" — tốt hơn là đoán
- [ ] Nhấn mạnh: **sản phẩm nhỏ nhưng hoàn thiện** là lựa chọn có chủ đích, không phải làm không kịp
