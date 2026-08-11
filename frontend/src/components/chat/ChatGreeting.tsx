import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ChatSuggestion } from '../../types/chat';
import { SuggestionChip } from './SuggestionChip';

interface ChatGreetingProps {
  greeting: string;
  name: string;
  suggestions: ChatSuggestion[];
  onPick: (suggestion: ChatSuggestion) => void;
}

/** Màn hình rỗng của panel chat: lời chào + chip gợi ý theo ngữ cảnh. */
export const ChatGreeting: React.FC<ChatGreetingProps> = ({
  greeting,
  name,
  suggestions,
  onPick,
}) => (
  <div className="flex flex-col gap-4 py-2">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 shrink-0 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="pt-0.5">
        <p className="text-sm font-semibold text-white">
          {greeting}, {name}
        </p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Mình giúp gì được cho bạn? Hỏi về task, tiến độ sprint hay khối lượng việc của nhóm đều được.
        </p>
      </div>
    </div>

    {suggestions.length > 0 && (
      <div className="flex flex-col items-end gap-2">
        {suggestions.map((item) => (
          <SuggestionChip
            key={item.id}
            label={item.label}
            tone={item.tone}
            onClick={() => onPick(item)}
          />
        ))}
      </div>
    )}
  </div>
);
