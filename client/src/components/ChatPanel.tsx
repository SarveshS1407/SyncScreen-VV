import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, MessageSquare } from 'lucide-react';
import { ChatMessage } from '@watch-party/shared';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}

const QUICK_EMOJIS = ['🔥', '❤️', '😂', '🍿', '😱', '👏', '🎉', '🤯'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  onSendReaction,
}) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-cinematic-900/90 border border-slate-800/80 rounded-2xl overflow-hidden glass-panel">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-primary" />
          <h3 className="font-semibold text-sm text-slate-200">Room Chat</h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">{messages.length} msgs</span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="text-center my-2">
                <span className="px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700/50 text-[11px] text-slate-400">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isMe = msg.senderId === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                <span
                  style={{ color: msg.avatarColor || '#6366f1' }}
                  className="font-medium"
                >
                  {msg.senderName}
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  {formatTime(msg.timestamp)}
                </span>
              </div>

              <div
                className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-sm break-words ${
                  isMe
                    ? 'bg-brand-primary text-white rounded-br-xs'
                    : 'bg-cinematic-800 text-slate-200 border border-slate-700/50 rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Reactions Quick Bar */}
      <div className="px-3 py-1.5 bg-cinematic-950/60 border-t border-slate-800/80 flex items-center justify-between gap-1 overflow-x-auto">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="hover:scale-130 active:scale-95 transition p-1 text-base rounded hover:bg-slate-800/50"
            title={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 bg-cinematic-950/80 border-t border-slate-800/80 flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something to the room..."
          maxLength={500}
          className="flex-1 bg-cinematic-900 border border-slate-700/80 focus:border-brand-primary focus:outline-none rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 transition"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl disabled:opacity-40 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
