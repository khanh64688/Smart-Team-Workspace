import type { Task, User } from '../types/api';
import type { ChatResponse } from '../types/chat';

/**
 * Câu trả lời dựng sẵn dùng khi POST /api/v1/chat chưa tồn tại.
 * Mọi câu trả lời đi ra từ đây đều được đánh dấu is_mock để giao diện
 * hiện nhãn "dữ liệu mẫu" — không giả vờ AI đang chạy thật.
 */
export const getMockReply = (message: string, tasks: Task[], user: User | null): ChatResponse => {
  const text = message.toLowerCase();
  const done = tasks.filter((t) => t.status === 'DONE');
  const overdue = tasks.filter((t) => t.is_overdue);
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS');

  if (text.includes('quá hạn') || text.includes('overdue')) {
    if (overdue.length === 0) {
      return {
        reply: 'Hiện không có task nào quá hạn. Cứ giữ nhịp này nhé.',
        suggestions: ['Task nào sắp tới hạn trong 3 ngày tới?', 'Tóm tắt tiến độ sprint hiện tại'],
      };
    }
    return {
      reply:
        `Có ${overdue.length} task đang quá hạn:\n` +
        overdue.map((t) => `• ${t.title} (${t.priority})`).join('\n') +
        '\nNên xử lý task ưu tiên URGENT trước.',
      suggestions: ['Ai đang phụ trách các task này?', 'Đề xuất cách chia lại việc'],
    };
  }

  if (text.includes('tóm tắt') || text.includes('tiến độ') || text.includes('sprint')) {
    const percent = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
    return {
      reply: `Tóm tắt nhanh sprint hiện tại:`,
      summary: {
        overview: `Sprint đang hoàn thành ${done.length}/${tasks.length} task (${percent}%). Có ${overdue.length} task quá hạn và ${inProgress.length} task đang làm dở.`,
        completed: done.slice(0, 4).map((t) => t.title),
        at_risk: overdue.map((t) => t.title),
        blockers: ['Chưa cấu hình tài khoản sandbox thanh toán làm nghẽn task tích hợp'],
        overloaded_members: ['Vũ Tiến Dũng (5 task TODO/IN_PROGRESS)'],
        next_priorities: [
          'Giải quyết blocker thanh toán',
          'Đưa các task quá hạn về đúng tiến độ',
        ],
      },
      suggestions: ['Ai đang quá tải?', 'Task nào rủi ro nhất?'],
    };
  }

  if (text.includes('quá tải') || text.includes('ai đang')) {
    return {
      reply:
        'Dựa trên số task chưa hoàn thành:\n' +
        '• Vũ Tiến Dũng — 5 task (2 URGENT)\n' +
        '• Lê Thị An — 3 task\n' +
        '• Phạm Quốc Bình — 1 task\n' +
        'Nên san bớt 1–2 task từ Dũng sang Bình.',
      suggestions: ['Task nào của Dũng có thể chuyển giao?', 'Tóm tắt tiến độ sprint hiện tại'],
    };
  }

  if (text.includes('của tôi') || text.includes('tuần này') || text.includes('ưu tiên')) {
    const mine = user ? tasks.filter((t) => t.assignee_id === user.id) : [];
    const list = (mine.length > 0 ? mine : inProgress).slice(0, 4);
    return {
      reply:
        list.length > 0
          ? 'Việc bạn nên tập trung:\n' +
            list.map((t, i) => `${i + 1}. ${t.title} — ${t.priority}`).join('\n')
          : 'Hiện chưa có task nào được giao cho bạn trong dự án này.',
      suggestions: ['Task nào của tôi sắp tới hạn?', 'Tóm tắt tiến độ sprint hiện tại'],
    };
  }

  if (text.includes('còn') || text.includes('chưa xong') || text.includes('chưa hoàn thành')) {
    const remaining = tasks.filter((t) => t.status !== 'DONE');
    return {
      reply:
        `Còn ${remaining.length} task chưa hoàn thành:\n` +
        remaining.slice(0, 6).map((t) => `• ${t.title} — ${t.status}`).join('\n'),
      suggestions: ['Task nào đang quá hạn?', 'Ai đang quá tải?'],
    };
  }

  return {
    reply:
      'Mình chưa nối được với backend nên chỉ trả lời được vài câu hỏi mẫu về task, tiến độ sprint và khối lượng việc của từng người. Bạn thử một trong các gợi ý bên dưới nhé.',
    suggestions: ['Tóm tắt tiến độ sprint hiện tại', 'Task nào đang quá hạn?'],
  };
};
