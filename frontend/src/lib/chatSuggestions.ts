import type { Project, Task, User } from '../types/api';
import type { ChatSuggestion } from '../types/chat';

/**
 * "Vũ Tiến Dũng" -> "Dũng". Gọi đủ họ tên nghe như thông báo hệ thống,
 * gọi tên riêng nghe như trợ lý.
 */
export const getShortName = (fullName?: string): string => {
  if (!fullName) return 'bạn';
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
};

export const getGreetingPrefix = (hour: number = new Date().getHours()): string => {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

/**
 * Sinh chip gợi ý từ dữ liệu đã có sẵn ở client — không tốn một lượt gọi LLM nào
 * cho thứ vốn tĩnh. Ưu tiên: cảnh báo quá hạn > theo vai trò > theo dự án.
 */
export const buildSuggestions = (
  user: User | null,
  project: Project | null,
  tasks: Task[]
): ChatSuggestion[] => {
  const suggestions: ChatSuggestion[] = [];

  // Member thì chỉ quan tâm task của chính mình; PM/Admin nhìn toàn dự án.
  const isMember = user?.role === 'MEMBER';
  const hasOwnTasks = !!user && tasks.some((t) => t.assignee_id === user.id);
  const scoped = isMember && hasOwnTasks ? tasks.filter((t) => t.assignee_id === user.id) : tasks;
  const scopeLabel = isMember && hasOwnTasks ? ' của tôi' : '';

  const overdue = scoped.filter((t) => t.is_overdue);
  if (overdue.length > 0) {
    suggestions.push({
      id: 'overdue',
      label: `${overdue.length} task${scopeLabel} đã quá hạn — xem chi tiết`,
      prompt: `Liệt kê các task${scopeLabel} đang quá hạn và mức độ nghiêm trọng của từng cái.`,
      tone: 'alert',
    });
  }

  if (isMember) {
    suggestions.push({
      id: 'my-week',
      label: 'Tuần này tôi cần làm gì?',
      prompt: 'Tóm tắt các task được giao cho tôi trong tuần này, sắp xếp theo deadline.',
      tone: 'default',
    });
    suggestions.push({
      id: 'next-up',
      label: 'Tôi nên ưu tiên task nào trước?',
      prompt: 'Trong các task của tôi, task nào nên làm trước? Giải thích lý do.',
      tone: 'default',
    });
  } else {
    suggestions.push({
      id: 'sprint-summary',
      label: 'Tóm tắt tiến độ sprint hiện tại',
      prompt: 'Tóm tắt tiến độ sprint hiện tại: việc đã xong, việc rủi ro, blocker.',
      tone: 'default',
    });
    suggestions.push({
      id: 'workload',
      label: 'Ai đang quá tải?',
      prompt: 'Thành viên nào đang nhận nhiều task chưa hoàn thành nhất?',
      tone: 'default',
    });
  }

  if (project) {
    const remaining = tasks.filter((t) => t.status !== 'DONE').length;
    suggestions.push({
      id: 'remaining',
      label: remaining > 0
        ? `"${project.name}" còn ${remaining} task chưa xong`
        : `Tình hình dự án "${project.name}"`,
      prompt: `Dự án "${project.name}" còn những task nào chưa hoàn thành?`,
      tone: 'default',
    });
  }

  return suggestions.slice(0, 4);
};
