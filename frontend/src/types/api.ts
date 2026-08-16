export type UserRole = 'ADMIN' | 'PM' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  avatar?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AdminUserCreateRequest {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
}

export interface UserRoleUpdateRequest {
  role: UserRole;
}

export interface UserActiveUpdateRequest {
  is_active: boolean;
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
export type ProjectVisibility = 'PUBLIC' | 'PRIVATE';
export type ProjectRole = 'OWNER' | 'MANAGER' | 'MEMBER';

export interface ProjectMember {
  user_id: string;
  project_id?: string;
  project_role: ProjectRole;
  can_config?: boolean;
  joined_at?: string;
  user?: User;
}

export interface MemberOut {
  user_id: string;
  full_name: string;
  email: string;
  project_role: ProjectRole;
  can_config?: boolean;
  joined_at: string;
}

export interface MemberConfigUpdate {
  can_config: boolean;
}

export interface MemberRoleUpdate {
  project_role: ProjectRole;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  visibility?: ProjectVisibility;
  owner_id: string;
  owner?: User;
  members?: ProjectMember[];
  created_at: string;
  updated_at?: string;
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
}

export interface SprintUpdate {
  name?: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
  status?: SprintStatus;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assignee_id?: string;
  assignee?: User;
  sprint_id?: string;
  project_id: string;
  position?: number;
  is_overdue?: boolean;
  comments_count?: number;
  created_at: string;
  completed_at?: string;
}

export interface TaskAssign {
  assignee_id?: string | null;
}

export interface TaskMove {
  status: TaskStatus;
  position?: number;
  sprint_id?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  author_id?: string | null;
  user_id?: string;
  user?: User;
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

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMMENT'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  task_id?: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkAllReadResponse {
  marked: number;
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

