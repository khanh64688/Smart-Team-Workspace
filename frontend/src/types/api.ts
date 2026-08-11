export type UserRole = 'ADMIN' | 'PM' | 'MEMBER';

// Toàn bộ khoá chính phía backend là UUID (chuỗi), không phải số tự tăng.
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
}

export type ProjectStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface ProjectMember {
  id?: string;
  user_id: string;
  project_id: string;
  role?: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id: string;
  owner?: User;
  members?: ProjectMember[];
  created_at: string;
  updated_at?: string;
}

/** GET /projects trả về bọc phân trang, không phải mảng trần. */
export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    size: number;
    total: number;
  };
}

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED';

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  project_id: string;
  created_at: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** Chỉ cần id và tên để hiển thị người phụ trách trên thẻ Kanban. */
export interface TaskAssignee {
  id: string;
  full_name: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  // Backend đặt tên là due_date, không phải deadline.
  due_date?: string | null;
  assignee_id?: string | null;
  assignee?: TaskAssignee | null;
  sprint_id?: string | null;
  project_id: string;
  position?: number;
  // Trường suy ra ở backend (due_date đã qua và chưa DONE), không phải cột DB.
  is_overdue?: boolean;
  comments_count?: number;
  created_at: string;
  completed_at?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  user: User;
  task_id: string;
  created_at: string;
}

export interface AISummary {
  overview: string;
  completed: string[];
  at_risk: string[];
  blockers: string[];
  overloaded_members: string[];
  next_priorities: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  task_id?: string;
}

export interface DashboardMetrics {
  total_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  by_assignee: Array<{ user_id: string; user_name: string; count: number }>;
}
