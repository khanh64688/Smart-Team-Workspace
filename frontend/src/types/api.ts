export type UserRole = 'ADMIN' | 'PM' | 'MEMBER';

export interface User {
  id: number;
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
  id?: number;
  user_id: number;
  project_id: number;
  role?: string;
  user: User;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id: number;
  owner?: User;
  members?: ProjectMember[];
  created_at: string;
  updated_at?: string;
}

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED';

export interface Sprint {
  id: number;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  project_id: number;
  created_at: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  assignee_id?: number;
  assignee?: User;
  sprint_id?: number;
  project_id: number;
  position?: number;
  is_overdue?: boolean;
  comments_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Comment {
  id: number;
  content: string;
  user_id: number;
  user: User;
  task_id: number;
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
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  task_id?: number;
}

export interface DashboardMetrics {
  total_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  by_assignee: Array<{ user_id: number; user_name: string; count: number }>;
}
