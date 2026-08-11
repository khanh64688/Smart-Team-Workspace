import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, X, ArrowRight, MessageSquare } from 'lucide-react';
import type { Project, Task } from '../../types/api';
import type { ChatMessage, ChatResponse, ChatSuggestion } from '../../types/chat';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { buildSuggestions, getGreetingPrefix, getShortName } from '../../lib/chatSuggestions';
import { getMockReply } from '../../lib/chatMock';
import { ChatGreeting } from './ChatGreeting';
import { ChatBubble } from './ChatBubble';
import { SuggestionChip } from './SuggestionChip';

interface ChatWidgetProps {
  project: Project | null;
  /** Task của board hiện tại — dùng để sinh chip gợi ý theo ngữ cảnh. */
  tasks: Task[];
}

const STORAGE_KEY = 'chat_messages';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Vì sao phải rơi về dữ liệu mẫu.
 *
 * Trước đây nhãn luôn ghi "API /chat chưa được triển khai", nên hết quota
 * hay gửi sai id đều bị quy cho endpoint chưa tồn tại — đúng kiểu thông
 * báo lỗi làm người sửa đi nhầm hướng cả buổi.
 */
const describeFailure = (
  err: unknown,
  status?: number,
  code?: string
): string => {
  const local = err instanceof Error ? err.message : '';

  if (local === 'NO_PROJECT') return 'chưa chọn dự án nào';
  if (local === 'DEMO_PROJECT') {
    return 'app đang dùng dự án mẫu, chưa tải được dự án thật (đăng nhập lại?)';
  }

  if (!status) return 'không kết nối được tới backend';
  if (status === 401) return 'phiên đăng nhập đã hết hạn';
  if (status === 404) return 'backend chưa có endpoint /chat';
  if (status === 422) return 'dữ liệu gửi lên không hợp lệ';

  return `backend trả ${status}${code ? ` (${code})` : ''}`;
};

export const ChatWidget: React.FC<ChatWidgetProps> = ({ project, tasks }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as ChatMessage[]) : [];
  });
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shortName = getShortName(user?.full_name);
  const suggestions = useMemo(
    () => buildSuggestions(user, project, tasks),
    [user, project, tasks]
  );

  // Hội thoại chỉ sống trong phiên làm việc — chưa cần bảng DB ở giai đoạn này.
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || isSending) return;

    setMessages((prev) => [
      ...prev,
      { id: newId(), role: 'user', content, created_at: new Date().toISOString() },
    ]);
    setInput('');
    setIsSending(true);

    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

    let reply: ChatMessage;
    try {
      if (!project) {
        // Backend bắt buộc project_id để kiểm tra quyền, gửi thiếu chỉ tổ
        // nhận 422. Chưa chọn dự án thì trả lời bằng dữ liệu mẫu luôn.
        throw new Error('NO_PROJECT');
      }

      if (!UUID_PATTERN.test(project.id)) {
        // Dự án đang hiển thị là dữ liệu mẫu trong App.tsx (id kiểu
        // 'demo-alpha'), tức là /projects chưa tải được. Gửi id này lên
        // chỉ nhận 422, và nhãn lỗi sẽ đổ oan cho endpoint /chat.
        throw new Error('DEMO_PROJECT');
      }

      const res = await api.post<ChatResponse>('/chat', {
        message: content,
        project_id: project.id,
        history,
      });
      reply = {
        id: newId(),
        role: 'assistant',
        content: res.data.reply,
        summary: res.data.summary,
        suggestions: res.data.suggestions,
        created_at: new Date().toISOString(),
      };
    } catch (err) {
      const response = (err as {
        response?: { status?: number; data?: { error?: { code?: string } } };
      }).response;

      // Phải đọc theo MÃ LỖI, không phải theo status: backend trả 503 cho
      // cả bốn tình huống khác hẳn nhau (thiếu key, mất mạng, provider lỗi,
      // bị bộ lọc chặn). Gộp theo status thì mất mạng cũng báo là thiếu key.
      const explained: Record<string, string> = {
        AI_NOT_CONFIGURED:
          'Tính năng AI chưa được cấu hình. Cần điền AI_API_KEY vào file .env rồi khởi động lại backend.',
        AI_PROVIDER_UNSUPPORTED:
          'Nhà cung cấp AI đang cấu hình không được hỗ trợ. Đặt AI_PROVIDER=gemini trong .env.',
        AI_UNREACHABLE:
          'Không kết nối được tới nhà cung cấp AI. Kiểm tra lại mạng giúp mình nhé.',
        AI_PROVIDER_ERROR:
          'Nhà cung cấp AI đang gặp sự cố. Bạn thử lại sau ít phút nhé.',
        AI_EMPTY_RESPONSE:
          'Câu hỏi này bị bộ lọc an toàn của nhà cung cấp AI chặn. Bạn thử diễn đạt cách khác xem sao.',
        AI_RATE_LIMITED:
          'Đã hết lượt gọi AI cho phép lúc này. Bạn thử lại sau ít phút nhé.',
        AI_RATE_LIMIT_EXCEEDED:
          'Bạn đã hỏi mình khá nhiều trong một giờ qua. Nghỉ một chút rồi quay lại nhé.',
        AI_TIMEOUT:
          'Nhà cung cấp AI phản hồi quá chậm. Bạn thử lại giúp mình nhé.',
        PROJECT_MEMBERSHIP_REQUIRED:
          'Bạn không phải thành viên của dự án này nên mình không xem được dữ liệu.',
        PROJECT_NOT_FOUND: 'Không tìm thấy dự án này.',
      };

      const message = explained[response?.data?.error?.code ?? ''];

      if (message) {
        reply = {
          id: newId(),
          role: 'assistant',
          content: message,
          created_at: new Date().toISOString(),
        };
      } else {
        const mock = getMockReply(content, tasks, user);
        reply = {
          id: newId(),
          role: 'assistant',
          content: mock.reply,
          summary: mock.summary,
          suggestions: mock.suggestions,
          is_mock: true,
          mock_reason: describeFailure(err, response?.status, response?.data?.error?.code),
          created_at: new Date().toISOString(),
        };
      }
    }

    setMessages((prev) => [...prev, reply]);
    setIsSending(false);
    inputRef.current?.focus();
  };

  const lastMessage = messages[messages.length - 1];
  const followUps =
    !isSending && lastMessage?.role === 'assistant' ? lastMessage.suggestions ?? [] : [];

  return (
    <>
      {/* Nút nổi — ẩn đi khi panel đang mở để không che nội dung */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Mở trợ lý AI"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-600/40 transition-all hover:scale-105"
        >
          <MessageSquare className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-gray-900" />
          </span>
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-label="Trợ lý AI"
          className="fixed bottom-6 right-6 z-40 w-[calc(100vw-3rem)] sm:w-[400px] h-[540px] max-h-[calc(100vh-6rem)] glass-panel rounded-3xl border border-indigo-500/30 shadow-2xl glow-purple flex flex-col overflow-hidden"
        >
          {/* Thanh tiêu đề */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Trợ lý AI</h3>
              {project && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-medium max-w-[120px] truncate">
                  {project.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-[11px] text-gray-400 hover:text-indigo-300 px-2 py-1 rounded-lg transition-colors"
                >
                  Trò chuyện mới
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Đóng trợ lý AI"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Khu hội thoại */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 ? (
              <ChatGreeting
                greeting={getGreetingPrefix()}
                name={shortName}
                suggestions={suggestions}
                onPick={(item: ChatSuggestion) => send(item.prompt)}
              />
            ) : (
              messages.map((message) => <ChatBubble key={message.id} message={message} />)
            )}

            {isSending && (
              <div className="flex items-center gap-2.5 self-start">
                <div className="w-7 h-7 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-gray-800/70 border border-gray-700/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {followUps.length > 0 && (
              <div className="flex flex-col items-end gap-2 pt-1">
                {followUps.map((prompt, i) => (
                  <SuggestionChip key={i} label={prompt} onClick={() => send(prompt)} />
                ))}
              </div>
            )}
          </div>

          {/* Ô nhập */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t border-gray-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi bất cứ điều gì về dự án..."
              className="flex-1 bg-gray-900/80 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Gửi"
              className="w-9 h-9 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white flex items-center justify-center transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
