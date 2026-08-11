import type { AISummary } from './api';

export type ChatRole = 'user' | 'assistant';

/** Một bong bóng hội thoại hiển thị trong panel. */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Bot trả về thẻ tóm tắt thay vì text thô (dùng lại đúng shape của AI Sprint Summary). */
  summary?: AISummary;
  /** Gợi ý hỏi tiếp, backend trả kèm trong cùng một response. */
  suggestions?: string[];
  /** Câu trả lời sinh từ dữ liệu mẫu — luôn hiển thị nhãn cho người dùng biết. */
  is_mock?: boolean;
  /** Vì sao phải dùng dữ liệu mẫu. Hiện kèm nhãn để còn biết đường sửa. */
  mock_reason?: string;
  created_at: string;
}

/** Chip gợi ý đặt phía user ở màn hình chào. */
export interface ChatSuggestion {
  id: string;
  label: string;
  /** Câu thực sự được gửi đi khi bấm chip (có thể dài hơn label). */
  prompt: string;
  tone: 'default' | 'alert';
}

/** Hợp đồng API cho POST /api/v1/chat — backend chưa triển khai. */
export interface ChatRequest {
  message: string;
  // Bắt buộc: backend kiểm tra quyền thành viên dựa trên chính id này.
  project_id: string;
  history: { role: ChatRole; content: string }[];
}

export interface ChatResponse {
  reply: string;
  summary?: AISummary;
  suggestions?: string[];
}
