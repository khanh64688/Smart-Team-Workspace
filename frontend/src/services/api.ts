// Mock API service for Smart Team Workspace Frontend
// Persists state in localStorage to simulate real FastAPI endpoints.

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "ADMIN" | "PM" | "MEMBER";
  is_active: boolean;
  avatar: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "CLOSED";
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  project_role: "OWNER" | "MANAGER" | "MEMBER";
  joined_at: string;
}

export interface MemberOut {
  user_id: string;
  full_name: string;
  email: string;
  project_role: "OWNER" | "MANAGER" | "MEMBER";
  joined_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: "ACTIVE" | "CLOSED";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project_id: string;
  sprint_id: string | null;
  assignee_id: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  position: number;
  deadline: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  task_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_tasks: number;
  in_progress: number;
  completed: number;
  overdue: number;
  status_distribution: { name: string; value: number }[];
  priority_distribution: { name: string; value: number }[];
  assignee_workload: { name: string; todo: number; in_progress: number; review: number; done: number }[];
}

// Help utility for delay simulation
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

// --- In-Memory Seed Data ---
const DEFAULT_USERS: User[] = [
  { id: "u-admin", email: "admin@twl.dev", full_name: "Nguyễn Quản Trị", role: "ADMIN", is_active: true, avatar: null, created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
  { id: "u-pm", email: "pm@twl.dev", full_name: "Trần Minh Quản", role: "PM", is_active: true, avatar: null, created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
  { id: "u-lap", email: "lap@twl.dev", full_name: "Hoàng Văn Lập", role: "PM", is_active: true, avatar: null, created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
  { id: "u-an", email: "an@twl.dev", full_name: "Lê Thị An", role: "MEMBER", is_active: true, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=An", created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
  { id: "u-binh", email: "binh@twl.dev", full_name: "Phạm Quốc Bình", role: "MEMBER", is_active: true, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Binh", created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
  { id: "u-chi", email: "chi@twl.dev", full_name: "Đỗ Ngọc Chi", role: "MEMBER", is_active: true, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chi", created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
  { id: "u-dung", email: "dung@twl.dev", full_name: "Vũ Tiến Dũng", role: "MEMBER", is_active: true, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dung", created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
  { id: "u-em", email: "em@twl.dev", full_name: "Bùi Hà Em", role: "MEMBER", is_active: true, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Em", created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
];

const DEFAULT_PROJECTS: Project[] = [
  { id: "p-alpha", name: "Website Thương mại điện tử", description: "Đồ án môn Phát triển ứng dụng Web — xây dựng sàn TMĐT thu nhỏ.", status: "ACTIVE", owner_id: "u-pm", created_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString() },
  { id: "p-beta", name: "Ứng dụng Quản lý Chi tiêu", description: "Bài tập lớn môn Lập trình di động — app ghi chép thu chi cá nhân.", status: "ACTIVE", owner_id: "u-lap", created_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString() },
];

const DEFAULT_MEMBERS: ProjectMember[] = [
  // Alpha
  { project_id: "p-alpha", user_id: "u-pm", project_role: "OWNER", joined_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString() },
  { project_id: "p-alpha", user_id: "u-an", project_role: "MEMBER", joined_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString() },
  { project_id: "p-alpha", user_id: "u-binh", project_role: "MEMBER", joined_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString() },
  { project_id: "p-alpha", user_id: "u-chi", project_role: "MEMBER", joined_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString() },
  { project_id: "p-alpha", user_id: "u-dung", project_role: "MEMBER", joined_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString() },
  // Beta
  { project_id: "p-beta", user_id: "u-lap", project_role: "OWNER", joined_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString() },
  { project_id: "p-beta", user_id: "u-chi", project_role: "MEMBER", joined_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString() },
  { project_id: "p-beta", user_id: "u-em", project_role: "MEMBER", joined_at: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString() },
];

const DEFAULT_SPRINTS: Sprint[] = [
  { id: "s-alpha-0", project_id: "p-alpha", name: "Sprint 0 — Khởi tạo", goal: "Dựng nền tảng dự án và hoàn thiện xác thực.", status: "CLOSED", start_date: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString(), end_date: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString() },
  { id: "s-alpha-1", project_id: "p-alpha", name: "Sprint 1 — Chức năng cốt lõi", goal: "Hoàn thành quản lý sản phẩm, giỏ hàng và thanh toán.", status: "ACTIVE", start_date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), end_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() },
  { id: "s-beta-1", project_id: "p-beta", name: "Sprint 1 — MVP", goal: "Ghi chép giao dịch và hiển thị biểu đồ cơ bản.", status: "ACTIVE", start_date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), end_date: new Date(Date.now() + 9 * 24 * 3600 * 1000).toISOString() },
];

const DEFAULT_TASKS: Task[] = [
  // Alpha Sprint 1
  { id: "t-a1-1", title: "Thiết kế ERD cho toàn hệ thống", description: "Vẽ sơ đồ cơ sở dữ liệu thực thể mối quan hệ cho các bảng.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-an", priority: "HIGH", status: "DONE", position: 1, deadline: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString() },
  { id: "t-a1-2", title: "Dựng skeleton FastAPI + Docker Compose", description: "Thiết lập cấu trúc thư mục backend và file compose.yml.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-binh", priority: "HIGH", status: "DONE", position: 1, deadline: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString() },
  { id: "t-a1-3", title: "API đăng ký / đăng nhập với JWT", description: "Viết logic đăng ký, mã hóa mật khẩu, sinh JWT và Middleware guard.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-an", priority: "URGENT", status: "DONE", position: 2, deadline: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-a1-4", title: "Màn hình đăng nhập bằng React", description: "Thiết kế form login, register với react-hook-form.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-chi", priority: "MEDIUM", status: "DONE", position: 2, deadline: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString() },
  { id: "t-a1-5", title: "Database migration với Alembic", description: "Khởi tạo alembic, sinh file migration và chạy test local db.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-binh", priority: "LOW", status: "DONE", position: 3, deadline: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString() },
  
  { id: "t-a1-6", title: "Thiết lập CI/CD với GitHub Actions", description: "Tự động chạy ruff check và pytest khi mở PR vào develop.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-binh", priority: "HIGH", status: "IN_PROGRESS", position: 1, deadline: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
  { id: "t-a1-7", title: "API quản lý dự án & thành viên", description: "CRUD dự án, thêm bớt thành viên, phân quyền OWNER/MANAGER/MEMBER.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-an", priority: "HIGH", status: "IN_PROGRESS", position: 2, deadline: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
  
  { id: "t-a1-8", title: "UI danh sách dự án & quản lý team", description: "Thiết kế dashboard dự án, trang danh sách dự án và nút mời thành viên.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-chi", priority: "MEDIUM", status: "REVIEW", position: 1, deadline: new Date(Date.now()).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now()).toISOString() },
  
  { id: "t-a1-9", title: "API quản lý Sprint & CRUD Task", description: "Viết endpoints quản lý vòng lặp sprint và các chức năng CRUD Task.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-an", priority: "HIGH", status: "TODO", position: 1, deadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-a1-10", title: "Viết test case cho Authentication", description: "Đảm bảo coverage cho Auth service và các route bảo vệ đạt 80%.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-dung", priority: "MEDIUM", status: "TODO", position: 2, deadline: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-a1-11", title: "Viết test case cho Project module", description: "Mock DB để viết integration test cho CRUD project và role guard.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-dung", priority: "LOW", status: "TODO", position: 3, deadline: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-a1-12", title: "Cấu hình logger & xử lý lỗi tập trung", description: "Thiết lập exception handler và middleware ghi log API request.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-binh", priority: "LOW", status: "TODO", position: 4, deadline: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  
  { id: "t-a1-13", title: "Task bị trễ hạn số 1", description: "Task demo phục vụ việc test hiển thị nhãn quá hạn.", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-an", priority: "HIGH", status: "TODO", position: 5, deadline: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-a1-14", title: "Task bị trễ hạn số 2", description: "Task demo phục vụ việc test hiển thị nhãn quá hạn (đang làm).", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-an", priority: "URGENT", status: "IN_PROGRESS", position: 3, deadline: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-a1-15", title: "Task bị trễ hạn số 3", description: "Task demo phục vụ việc test hiển thị nhãn quá hạn (đang review).", project_id: "p-alpha", sprint_id: "s-alpha-1", assignee_id: "u-binh", priority: "HIGH", status: "REVIEW", position: 2, deadline: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },

  // Alpha Backlog (sprint_id = null)
  { id: "t-ab-1", title: "API kéo thả Kanban & vị trí thẻ", description: "Endpoint cập nhật status và vị trí tương đối của thẻ.", project_id: "p-alpha", sprint_id: null, assignee_id: "u-an", priority: "HIGH", status: "TODO", position: 1, deadline: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-ab-2", title: "UI bảng Kanban với DnD Kit", description: "Thư viện dnd-kit kéo thả, optimistic updates và rollback.", project_id: "p-alpha", sprint_id: null, assignee_id: "u-chi", priority: "HIGH", status: "TODO", position: 2, deadline: new Date(Date.now() + 11 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-ab-3", title: "Task detail modal & bình luận", description: "Mở rộng modal hiển thị chi tiết task và danh sách comment feed.", project_id: "p-alpha", sprint_id: null, assignee_id: "u-chi", priority: "MEDIUM", status: "TODO", position: 3, deadline: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-ab-4", title: "Dashboard thống kê biểu đồ Recharts", description: "Trang dashboard hiển thị chart tròn và chart cột.", project_id: "p-alpha", sprint_id: null, assignee_id: "u-dung", priority: "MEDIUM", status: "TODO", position: 4, deadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-ab-5", title: "Tính năng AI tóm tắt tiến độ", description: "Mô hình Gemini tóm tắt sprint và chỉ ra blocker chính.", project_id: "p-alpha", sprint_id: null, assignee_id: "u-an", priority: "HIGH", status: "TODO", position: 5, deadline: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },

  // Beta Sprint 1
  { id: "t-b1-1", title: "Thiết kế giao diện Figma di động", description: "Các màn hình chính: Home, Thêm giao dịch, Báo cáo.", project_id: "p-beta", sprint_id: "s-beta-1", assignee_id: "u-chi", priority: "HIGH", status: "DONE", position: 1, deadline: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString() },
  { id: "t-b1-2", title: "Khởi tạo repo React Native + Expo", description: "Base project, cài các gói navigation cơ bản.", project_id: "p-beta", sprint_id: "s-beta-1", assignee_id: "u-em", priority: "HIGH", status: "DONE", position: 2, deadline: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-b1-3", title: "Thiết kế db SQLite cục bộ", description: "Schema lưu trữ Transaction, Category và Settings.", project_id: "p-beta", sprint_id: "s-beta-1", assignee_id: "u-em", priority: "MEDIUM", status: "DONE", position: 3, deadline: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() },
  { id: "t-b1-4", title: "API CRUD danh mục chi tiêu", description: "Endpoints quản lý nhóm chi tiêu (ăn uống, đi lại, v.v.).", project_id: "p-beta", sprint_id: "s-beta-1", assignee_id: "u-chi", priority: "MEDIUM", status: "IN_PROGRESS", position: 1, deadline: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-b1-5", title: "API CRUD giao dịch thu chi", description: "Lưu trữ số tiền, ngày tháng, danh mục và ghi chú.", project_id: "p-beta", sprint_id: "s-beta-1", assignee_id: "u-em", priority: "HIGH", status: "TODO", position: 1, deadline: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "t-b1-6", title: "UI biểu đồ báo cáo thu chi", description: "Vẽ chart tròn phân bố chi tiêu theo danh mục.", project_id: "p-beta", sprint_id: "s-beta-1", assignee_id: "u-chi", priority: "MEDIUM", status: "TODO", position: 2, deadline: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(), created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
];

const DEFAULT_COMMENTS: Comment[] = [
  // t-a1-6
  { id: "c-1", task_id: "t-a1-6", author_id: "u-an", content: "Có thể lùi deadline task này sang sprint sau được không ạ?", created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() },
  { id: "c-2", task_id: "t-a1-6", author_id: "u-binh", content: "Task này to hơn dự kiến, mình đề xuất tách làm hai.", created_at: new Date(Date.now() - 2.8 * 24 * 3600 * 1000).toISOString() },
  { id: "c-3", task_id: "t-a1-6", author_id: "u-pm", content: "Cần hỗ trợ cấu hình runner không Bình?", created_at: new Date(Date.now() - 2.5 * 24 * 3600 * 1000).toISOString() },
  { id: "c-4", task_id: "t-a1-6", author_id: "u-chi", content: "Mình thấy cần bổ sung cả bước chạy test tự động.", created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
  // t-a1-7
  { id: "c-5", task_id: "t-a1-7", author_id: "u-pm", content: "Mọi người tập trung làm cho xong phần này nhé.", created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
  { id: "c-6", task_id: "t-a1-7", author_id: "u-an", content: "Tôi đã gửi pull request nhờ mọi người review.", created_at: new Date(Date.now() - 0.8 * 24 * 3600 * 1000).toISOString() },
  // t-a1-8
  { id: "c-7", task_id: "t-a1-8", author_id: "u-chi", content: "Giao diện đã responsive tốt trên điện thoại.", created_at: new Date(Date.now() - 0.5 * 24 * 3600 * 1000).toISOString() },
  { id: "c-8", task_id: "t-a1-8", author_id: "u-an", content: "Có bug hiển thị danh sách thành viên trùng lặp.", created_at: new Date(Date.now() - 0.2 * 24 * 3600 * 1000).toISOString() },
  // t-a1-14
  { id: "c-9", task_id: "t-a1-14", author_id: "u-an", content: "Task này bị block do API chưa hoàn thiện.", created_at: new Date(Date.now() - 1.2 * 24 * 3600 * 1000).toISOString() },
  { id: "c-10", task_id: "t-a1-14", author_id: "u-pm", content: "Đã giao cho Bình hỗ trợ An phần API.", created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
];

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  { id: "n-1", user_id: "u-an", task_id: "t-a1-9", content: "Bạn được giao task mới: API quản lý Sprint & CRUD Task", is_read: false, created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
  { id: "n-2", user_id: "u-binh", task_id: "t-a1-6", content: "Lê Thị An bình luận trong task Thiết lập CI/CD", is_read: false, created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() },
];

// --- Storage Key Management ---
const KEYS = {
  USERS: "stw_users",
  PROJECTS: "stw_projects",
  MEMBERS: "stw_members",
  SPRINTS: "stw_sprints",
  TASKS: "stw_tasks",
  COMMENTS: "stw_comments",
  NOTIFS: "stw_notifications",
  CURRENT_USER: "stw_current_user",
  TOKEN: "stw_token",
};

// --- Storage Read/Write ---
const read = <T>(key: string, def: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(def));
    return def;
  }
  try {
    return JSON.parse(data) as T;
  } catch {
    return def;
  }
};

const write = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialize store
export const initializeMockDB = (reset = false) => {
  if (reset || !localStorage.getItem(KEYS.USERS)) {
    write(KEYS.USERS, DEFAULT_USERS);
    write(KEYS.PROJECTS, DEFAULT_PROJECTS);
    write(KEYS.MEMBERS, DEFAULT_MEMBERS);
    write(KEYS.SPRINTS, DEFAULT_SPRINTS);
    write(KEYS.TASKS, DEFAULT_TASKS);
    write(KEYS.COMMENTS, DEFAULT_COMMENTS);
    write(KEYS.NOTIFS, DEFAULT_NOTIFICATIONS);
    write(KEYS.CURRENT_USER, null);
    write(KEYS.TOKEN, null);
  }
};

// Execute initialization
initializeMockDB();

// --- API Service Implementation ---
export const api = {
  auth: {
    login: async (email: string, password_hash: string) => {
      await delay(300);
      const users = read<User[]>(KEYS.USERS, DEFAULT_USERS);
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error("Email hoặc mật khẩu không đúng.");
      }
      // Simplistic mock check
      if (password_hash && password_hash.length < 3) {
        throw new Error("Mật khẩu không hợp lệ.");
      }
      write(KEYS.CURRENT_USER, user);
      write(KEYS.TOKEN, "mock-jwt-token-xyz");
      return { token: "mock-jwt-token-xyz", user };
    },

    register: async (email: string, full_name: string, password_hash: string) => {
      await delay(300);
      const users = read<User[]>(KEYS.USERS, DEFAULT_USERS);
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("Email đã được sử dụng.");
      }
      const newUser: User = {
        id: "u-" + Math.random().toString(36).substr(2, 9),
        email,
        full_name,
        role: "MEMBER",
        is_active: true,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(full_name)}`,
        created_at: new Date().toISOString(),
      };
      users.push(newUser);
      write(KEYS.USERS, users);
      return newUser;
    },

    logout: async () => {
      await delay(100);
      write(KEYS.CURRENT_USER, null);
      write(KEYS.TOKEN, null);
    },

    getMe: async () => {
      await delay(50);
      return read<User | null>(KEYS.CURRENT_USER, null);
    },

    updateMe: async (full_name?: string, avatar?: string) => {
      await delay(200);
      const currentUser = read<User | null>(KEYS.CURRENT_USER, null);
      if (!currentUser) throw new Error("Chưa đăng nhập");
      
      const users = read<User[]>(KEYS.USERS, DEFAULT_USERS);
      const index = users.findIndex((u) => u.id === currentUser.id);
      if (index !== -1) {
        if (full_name) users[index].full_name = full_name;
        if (avatar !== undefined) users[index].avatar = avatar;
        write(KEYS.USERS, users);
        write(KEYS.CURRENT_USER, users[index]);
        return users[index];
      }
      throw new Error("Không tìm thấy user");
    },
  },

  projects: {
    list: async () => {
      await delay(200);
      const currentUser = read<User | null>(KEYS.CURRENT_USER, null);
      if (!currentUser) throw new Error("Chưa đăng nhập");

      const projects = read<Project[]>(KEYS.PROJECTS, DEFAULT_PROJECTS);
      const memberships = read<ProjectMember[]>(KEYS.MEMBERS, DEFAULT_MEMBERS);
      
      // If admin, show all projects. Otherwise only projects user is a member of.
      if (currentUser.role === "ADMIN") {
        return projects;
      }
      
      const myProjectIds = memberships
        .filter((m) => m.user_id === currentUser.id)
        .map((m) => m.project_id);
        
      return projects.filter((p) => myProjectIds.includes(p.id));
    },

    get: async (id: string) => {
      await delay(100);
      const projects = read<Project[]>(KEYS.PROJECTS, DEFAULT_PROJECTS);
      const project = projects.find((p) => p.id === id);
      if (!project) throw new Error("Không tìm thấy dự án.");
      return project;
    },

    create: async (name: string, description: string) => {
      await delay(300);
      const currentUser = read<User | null>(KEYS.CURRENT_USER, null);
      if (!currentUser || currentUser.role === "MEMBER") {
        throw new Error("Bạn không có quyền tạo dự án.");
      }
      const projects = read<Project[]>(KEYS.PROJECTS, DEFAULT_PROJECTS);
      const newProj: Project = {
        id: "p-" + Math.random().toString(36).substr(2, 9),
        name,
        description,
        status: "ACTIVE",
        owner_id: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      projects.push(newProj);
      write(KEYS.PROJECTS, projects);

      // Auto add owner as OWNER member
      const memberships = read<ProjectMember[]>(KEYS.MEMBERS, DEFAULT_MEMBERS);
      memberships.push({
        project_id: newProj.id,
        user_id: currentUser.id,
        project_role: "OWNER",
        joined_at: new Date().toISOString(),
      });
      write(KEYS.MEMBERS, memberships);

      return newProj;
    },

    update: async (id: string, name: string, description: string) => {
      await delay(200);
      const projects = read<Project[]>(KEYS.PROJECTS, DEFAULT_PROJECTS);
      const index = projects.findIndex((p) => p.id === id);
      if (index === -1) throw new Error("Không tìm thấy dự án");
      
      projects[index].name = name;
      projects[index].description = description;
      projects[index].updated_at = new Date().toISOString();
      write(KEYS.PROJECTS, projects);
      return projects[index];
    },

    close: async (id: string) => {
      await delay(200);
      const projects = read<Project[]>(KEYS.PROJECTS, DEFAULT_PROJECTS);
      const index = projects.findIndex((p) => p.id === id);
      if (index === -1) throw new Error("Không tìm thấy dự án");
      
      projects[index].status = "CLOSED";
      projects[index].updated_at = new Date().toISOString();
      write(KEYS.PROJECTS, projects);
      return projects[index];
    },

    delete: async (id: string) => {
      await delay(200);
      const projects = read<Project[]>(KEYS.PROJECTS, DEFAULT_PROJECTS);
      const filtered = projects.filter((p) => p.id !== id);
      write(KEYS.PROJECTS, filtered);
    },

    listMembers: async (projectId: string): Promise<MemberOut[]> => {
      await delay(150);
      const memberships = read<ProjectMember[]>(KEYS.MEMBERS, DEFAULT_MEMBERS);
      const users = read<User[]>(KEYS.USERS, DEFAULT_USERS);
      
      const projectMembers = memberships.filter((m) => m.project_id === projectId);
      return projectMembers.map((m) => {
        const u = users.find((user) => user.id === m.user_id)!;
        return {
          user_id: m.user_id,
          full_name: u?.full_name ?? "User",
          email: u?.email ?? "",
          project_role: m.project_role,
          joined_at: m.joined_at,
        };
      });
    },

    addMember: async (projectId: string, email: string, role: "MANAGER" | "MEMBER") => {
      await delay(200);
      const users = read<User[]>(KEYS.USERS, DEFAULT_USERS);
      const targetUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!targetUser) throw new Error("Không tìm thấy người dùng với email này.");

      const memberships = read<ProjectMember[]>(KEYS.MEMBERS, DEFAULT_MEMBERS);
      if (memberships.some((m) => m.project_id === projectId && m.user_id === targetUser.id)) {
        throw new Error("Người dùng đã là thành viên của dự án.");
      }

      const newMember: ProjectMember = {
        project_id: projectId,
        user_id: targetUser.id,
        project_role: role,
        joined_at: new Date().toISOString(),
      };
      memberships.push(newMember);
      write(KEYS.MEMBERS, memberships);
      return {
        user_id: targetUser.id,
        full_name: targetUser.full_name,
        email: targetUser.email,
        project_role: role,
        joined_at: newMember.joined_at,
      };
    },

    changeMemberRole: async (projectId: string, userId: string, role: "MANAGER" | "MEMBER" | "OWNER") => {
      await delay(200);
      const memberships = read<ProjectMember[]>(KEYS.MEMBERS, DEFAULT_MEMBERS);
      const index = memberships.findIndex((m) => m.project_id === projectId && m.user_id === userId);
      if (index === -1) throw new Error("Không tìm thấy thành viên");
      
      memberships[index].project_role = role;
      write(KEYS.MEMBERS, memberships);
      return memberships[index];
    },

    removeMember: async (projectId: string, userId: string) => {
      await delay(200);
      const memberships = read<ProjectMember[]>(KEYS.MEMBERS, DEFAULT_MEMBERS);
      
      // Safety check: Cannot remove the last OWNER
      const projectMembers = memberships.filter((m) => m.project_id === projectId);
      const leavingMember = projectMembers.find((m) => m.user_id === userId);
      if (leavingMember?.project_role === "OWNER") {
        const owners = projectMembers.filter((m) => m.project_role === "OWNER");
        if (owners.length <= 1) {
          throw new Error("Không thể xóa chủ sở hữu duy nhất của dự án.");
        }
      }

      const filtered = memberships.filter((m) => !(m.project_id === projectId && m.user_id === userId));
      write(KEYS.MEMBERS, filtered);
    },
  },

  sprints: {
    list: async (projectId: string) => {
      await delay(150);
      const sprints = read<Sprint[]>(KEYS.SPRINTS, DEFAULT_SPRINTS);
      return sprints.filter((s) => s.project_id === projectId);
    },

    create: async (projectId: string, name: string, goal: string, start_date: string, end_date: string) => {
      await delay(250);
      const sprints = read<Sprint[]>(KEYS.SPRINTS, DEFAULT_SPRINTS);
      
      // Deactivate other active sprints if this is active? 
      // For simplicity, we just add it as ACTIVE
      const newSprint: Sprint = {
        id: "s-" + Math.random().toString(36).substr(2, 9),
        project_id: projectId,
        name,
        goal,
        status: "ACTIVE",
        start_date,
        end_date,
      };
      sprints.push(newSprint);
      write(KEYS.SPRINTS, sprints);
      return newSprint;
    },

    update: async (sprintId: string, status: "ACTIVE" | "CLOSED", name?: string, goal?: string) => {
      await delay(200);
      const sprints = read<Sprint[]>(KEYS.SPRINTS, DEFAULT_SPRINTS);
      const index = sprints.findIndex((s) => s.id === sprintId);
      if (index === -1) throw new Error("Không tìm thấy sprint");
      
      sprints[index].status = status;
      if (name) sprints[index].name = name;
      if (goal) sprints[index].goal = goal;
      write(KEYS.SPRINTS, sprints);
      return sprints[index];
    },
  },

  tasks: {
    list: async (projectId: string, filters: { sprint_id?: string | null; assignee_id?: string; priority?: string; status?: string; overdue?: boolean; q?: string } = {}) => {
      await delay(200);
      let tasks = read<Task[]>(KEYS.TASKS, DEFAULT_TASKS).filter((t) => t.project_id === projectId);
      
      if (filters.sprint_id !== undefined) {
        tasks = tasks.filter((t) => t.sprint_id === filters.sprint_id);
      }
      if (filters.assignee_id) {
        tasks = tasks.filter((t) => t.assignee_id === filters.assignee_id);
      }
      if (filters.priority) {
        tasks = tasks.filter((t) => t.priority === filters.priority);
      }
      if (filters.status) {
        tasks = tasks.filter((t) => t.status === filters.status);
      }
      if (filters.overdue) {
        const now = new Date();
        tasks = tasks.filter((t) => t.status !== "DONE" && new Date(t.deadline) < now);
      }
      if (filters.q) {
        const query = filters.q.toLowerCase();
        tasks = tasks.filter((t) => t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
      }
      
      // Sort by position
      return tasks.sort((a, b) => a.position - b.position);
    },

    get: async (id: string) => {
      await delay(100);
      const tasks = read<Task[]>(KEYS.TASKS, DEFAULT_TASKS);
      const task = tasks.find((t) => t.id === id);
      if (!task) throw new Error("Không tìm thấy task.");
      return task;
    },

    create: async (taskData: Omit<Task, "id" | "position" | "created_at" | "updated_at">) => {
      await delay(300);
      const tasks = read<Task[]>(KEYS.TASKS, DEFAULT_TASKS);
      
      // Find position
      const sameCol = tasks.filter((t) => t.project_id === taskData.project_id && t.status === taskData.status);
      const nextPos = sameCol.length > 0 ? Math.max(...sameCol.map((t) => t.position)) + 1 : 1;

      const newTask: Task = {
        ...taskData,
        id: "t-" + Math.random().toString(36).substr(2, 9),
        position: nextPos,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      tasks.push(newTask);
      write(KEYS.TASKS, tasks);

      // Create notification for assignee
      if (newTask.assignee_id) {
        const users = read<User[]>(KEYS.USERS, DEFAULT_USERS);
        const assignee = users.find((u) => u.id === newTask.assignee_id);
        if (assignee) {
          const notifications = read<AppNotification[]>(KEYS.NOTIFS, DEFAULT_NOTIFICATIONS);
          notifications.push({
            id: "n-" + Math.random().toString(36).substr(2, 9),
            user_id: newTask.assignee_id,
            task_id: newTask.id,
            content: `Bạn đã được giao công việc mới: ${newTask.title}`,
            is_read: false,
            created_at: new Date().toISOString(),
          });
          write(KEYS.NOTIFS, notifications);
        }
      }

      return newTask;
    },

    update: async (id: string, updates: Partial<Omit<Task, "id" | "project_id">>) => {
      await delay(200);
      const tasks = read<Task[]>(KEYS.TASKS, DEFAULT_TASKS);
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) throw new Error("Không tìm thấy task");

      const oldAssignee = tasks[index].assignee_id;
      const updated = {
        ...tasks[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      tasks[index] = updated;
      write(KEYS.TASKS, tasks);

      // Create notification if assignee changed
      if (updates.assignee_id && updates.assignee_id !== oldAssignee) {
        const notifications = read<AppNotification[]>(KEYS.NOTIFS, DEFAULT_NOTIFICATIONS);
        notifications.push({
          id: "n-" + Math.random().toString(36).substr(2, 9),
          user_id: updates.assignee_id,
          task_id: id,
          content: `Bạn đã được giao công việc mới: ${updated.title}`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
        write(KEYS.NOTIFS, notifications);
      }

      return updated;
    },

    delete: async (id: string) => {
      await delay(150);
      const tasks = read<Task[]>(KEYS.TASKS, DEFAULT_TASKS);
      const filtered = tasks.filter((t) => t.id !== id);
      write(KEYS.TASKS, filtered);
    },

    move: async (id: string, status: Task["status"], position: number) => {
      await delay(200);
      const tasks = read<Task[]>(KEYS.TASKS, DEFAULT_TASKS);
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) throw new Error("Không tìm thấy task");

      const oldStatus = tasks[index].status;
      
      // Transition validation rules (1 step forward/backward permitted only)
      // TODO <-> IN_PROGRESS <-> REVIEW <-> DONE
      const states: Task["status"][] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
      const oldIdx = states.indexOf(oldStatus);
      const newIdx = states.indexOf(status);
      
      if (Math.abs(oldIdx - newIdx) > 1) {
        throw new Error("Chỉ được di chuyển task tiến hoặc lùi 1 bước (ví dụ: Todo ↔ In Progress, Review ↔ Done).");
      }

      // Check current user role permission (Members can only drag their own tasks, PM/Owner can drag any)
      const currentUser = read<User | null>(KEYS.CURRENT_USER, null);
      if (!currentUser) throw new Error("Chưa đăng nhập");

      const memberships = read<ProjectMember[]>(KEYS.MEMBERS, DEFAULT_MEMBERS);
      const projectMember = memberships.find((m) => m.project_id === tasks[index].project_id && m.user_id === currentUser.id);
      
      const isOwnerOrManager = projectMember?.project_role === "OWNER" || projectMember?.project_role === "MANAGER" || currentUser.role === "ADMIN";
      const isAssignee = tasks[index].assignee_id === currentUser.id;

      if (!isOwnerOrManager && !isAssignee) {
        throw new Error("Bạn chỉ có quyền kéo thả công việc được giao cho chính bạn.");
      }

      // Perform position adjustments for sorting order within column
      const colTasks = tasks
        .filter((t) => t.project_id === tasks[index].project_id && t.status === status && t.id !== id)
        .sort((a, b) => a.position - b.position);

      colTasks.splice(position - 1, 0, tasks[index]);

      colTasks.forEach((t, i) => {
        t.position = i + 1;
      });

      tasks[index].status = status;
      tasks[index].updated_at = new Date().toISOString();

      write(KEYS.TASKS, tasks);
      return tasks[index];
    },

    listComments: async (taskId: string) => {
      await delay(100);
      const comments = read<Comment[]>(KEYS.COMMENTS, DEFAULT_COMMENTS);
      const users = read<User[]>(KEYS.USERS, DEFAULT_USERS);
      
      return comments
        .filter((c) => c.task_id === taskId)
        .map((c) => {
          const author = users.find((u) => u.id === c.author_id)!;
          return {
            ...c,
            author_name: author?.full_name ?? "Unknown",
            author_avatar: author?.avatar ?? null,
          };
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },

    createComment: async (taskId: string, content: string) => {
      await delay(150);
      if (!content || content.trim().length === 0) throw new Error("Bình luận không được để trống");
      
      const currentUser = read<User | null>(KEYS.CURRENT_USER, null);
      if (!currentUser) throw new Error("Chưa đăng nhập");

      const comments = read<Comment[]>(KEYS.COMMENTS, DEFAULT_COMMENTS);
      const newComment: Comment = {
        id: "c-" + Math.random().toString(36).substr(2, 9),
        task_id: taskId,
        author_id: currentUser.id,
        content,
        created_at: new Date().toISOString(),
      };
      comments.push(newComment);
      write(KEYS.COMMENTS, comments);

      // Create notification for task assignee if commenter is not assignee
      const tasks = read<Task[]>(KEYS.TASKS, DEFAULT_TASKS);
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.assignee_id && task.assignee_id !== currentUser.id) {
        const notifications = read<AppNotification[]>(KEYS.NOTIFS, DEFAULT_NOTIFICATIONS);
        notifications.push({
          id: "n-" + Math.random().toString(36).substr(2, 9),
          user_id: task.assignee_id,
          task_id: taskId,
          content: `${currentUser.full_name} đã bình luận trong task: ${task.title}`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
        write(KEYS.NOTIFS, notifications);
      }

      return {
        ...newComment,
        author_name: currentUser.full_name,
        author_avatar: currentUser.avatar,
      };
    },

    deleteComment: async (commentId: string) => {
      await delay(150);
      const comments = read<Comment[]>(KEYS.COMMENTS, DEFAULT_COMMENTS);
      const index = comments.findIndex((c) => c.id === commentId);
      if (index === -1) throw new Error("Không tìm thấy bình luận");

      const currentUser = read<User | null>(KEYS.CURRENT_USER, null);
      if (!currentUser) throw new Error("Chưa đăng nhập");

      if (comments[index].author_id !== currentUser.id && currentUser.role !== "ADMIN") {
        throw new Error("Bạn chỉ có quyền xóa bình luận của chính mình.");
      }

      const filtered = comments.filter((c) => c.id !== commentId);
      write(KEYS.COMMENTS, filtered);
    },
  },

  dashboard: {
    getStats: async (projectId: string): Promise<DashboardStats> => {
      await delay(250);
      const tasks = read<Task[]>(KEYS.TASKS, DEFAULT_TASKS).filter((t) => t.project_id === projectId);
      const users = read<User[]>(KEYS.USERS, DEFAULT_USERS);
      const now = new Date();

      const total_tasks = tasks.length;
      const in_progress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
      const completed = tasks.filter((t) => t.status === "DONE").length;
      const overdue = tasks.filter((t) => t.status !== "DONE" && new Date(t.deadline) < now).length;

      // Status distribution
      const statusMap = { TODO: "Cần làm", IN_PROGRESS: "Đang làm", REVIEW: "Đánh giá", DONE: "Hoàn thành" };
      const statusCounts = tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const status_distribution = Object.entries(statusMap).map(([status, label]) => ({
        name: label,
        value: statusCounts[status] || 0,
      })).filter((item) => item.value > 0);

      // Priority distribution
      const priorityMap = { LOW: "Thấp", MEDIUM: "Trung bình", HIGH: "Cao", URGENT: "Khẩn cấp" };
      const priorityCounts = tasks.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priority_distribution = Object.entries(priorityMap).map(([priority, label]) => ({
        name: label,
        value: priorityCounts[priority] || 0,
      })).filter((item) => item.value > 0);

      // Workload distribution
      const assigneeTasks = tasks.reduce((acc, t) => {
        const uId = t.assignee_id || "unassigned";
        if (!acc[uId]) {
          acc[uId] = { todo: 0, in_progress: 0, review: 0, done: 0 };
        }
        if (t.status === "TODO") acc[uId].todo++;
        else if (t.status === "IN_PROGRESS") acc[uId].in_progress++;
        else if (t.status === "REVIEW") acc[uId].review++;
        else if (t.status === "DONE") acc[uId].done++;
        return acc;
      }, {} as Record<string, { todo: number; in_progress: number; review: number; done: number }>);

      const assignee_workload = Object.entries(assigneeTasks).map(([uId, counts]) => {
        const u = users.find((user) => user.id === uId);
        return {
          name: u ? u.full_name : "Chưa giao",
          ...counts,
        };
      });

      return {
        total_tasks,
        in_progress,
        completed,
        overdue,
        status_distribution,
        priority_distribution,
        assignee_workload,
      };
    },
  },

  notifications: {
    list: async () => {
      await delay(100);
      const currentUser = read<User | null>(KEYS.CURRENT_USER, null);
      if (!currentUser) return [];

      const notifications = read<AppNotification[]>(KEYS.NOTIFS, DEFAULT_NOTIFICATIONS);
      return notifications
        .filter((n) => n.user_id === currentUser.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    markAllRead: async () => {
      await delay(100);
      const currentUser = read<User | null>(KEYS.CURRENT_USER, null);
      if (!currentUser) return;

      const notifications = read<AppNotification[]>(KEYS.NOTIFS, DEFAULT_NOTIFICATIONS);
      notifications.forEach((n) => {
        if (n.user_id === currentUser.id) {
          n.is_read = true;
        }
      });
      write(KEYS.NOTIFS, notifications);
    },

    markRead: async (id: string) => {
      await delay(50);
      const notifications = read<AppNotification[]>(KEYS.NOTIFS, DEFAULT_NOTIFICATIONS);
      const index = notifications.findIndex((n) => n.id === id);
      if (index !== -1) {
        notifications[index].is_read = true;
        write(KEYS.NOTIFS, notifications);
      }
    },
  },
};
