import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, MessageSquare, Sparkles } from 'lucide-react';
import { ChatMessage } from '@watch-party/shared';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  chatError?: string | null;
}

const QUICK_EMOJIS = ['🔥', '❤️', '😂', '🍿', '😱', '👏', '🎉', '🤯', '💀', '💯'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  onSendReaction,
  chatError,
}) => {
  const [text, setText] = useState('');
  const [recentEmojiBurst, setRecentEmojiBurst] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  const handleEmojiClick = (emoji: string) => {
    onSendReaction(emoji);
    setRecentEmojiBurst(emoji);
    setTimeout(() => setRecentEmojiBurst(null), 500);
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-cinematic-900/90 border border-slate-800/80 rounded-3xl overflow-hidden glass-panel shadow-lg">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-cinematic-950/40">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-primary" />
          <h3 className="font-bold text-sm text-slate-200">Party Chat</h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono font-medium">
          {messages.length} messages
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-brand-primary" />
            <h4 className="font-semibold text-xs text-slate-300">No chat messages yet</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Say hello or react with an emoji below!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center my-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-[11px] text-slate-400 font-medium">
                    <Sparkles className="w-3 h-3 text-brand-primary flex-shrink-0" />
                    <span>{msg.text}</span>
                  </span>
                </div>
              );
            }

            const isMe = msg.senderId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                  <span
                    style={{ color: msg.avatarColor || '#6366f1' }}
                    className="font-bold"
                  >
                    {msg.senderName}
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                <div
                  className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-xs sm:text-sm break-words leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-gradient-to-r from-brand-primary to-indigo-600 text-white rounded-br-xs'
                      : 'bg-cinematic-800 text-slate-200 border border-slate-700/60 rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Rate Limit / Submission Warning */}
      {chatError && (
        <div className="px-3.5 py-1.5 bg-rose-500/15 border-t border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5 font-medium animate-in fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse flex-shrink-0" />
          <span>{chatError}</span>
        </div>
      )}

      {/* Emoji Reactions Quick Bar */}
      <div className="px-3 py-2 bg-cinematic-950/70 border-t border-slate-800/80 flex items-center justify-between gap-1 overflow-x-auto">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className="hover:scale-135 active:scale-90 transition transform p-1 text-base sm:text-lg rounded-lg hover:bg-slate-800/60 flex-shrink-0"
            title={`React with ${emoji}`}
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 bg-cinematic-950/90 border-t border-slate-800/80 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            className="w-full bg-cinematic-900 border border-slate-700/80 focus:border-brand-primary focus:outline-none rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 transition pr-12"
          />
          {text.length > 350 && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
              {500 - text.length}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl disabled:opacity-40 transition shadow-md shadow-brand-primary/20 active:scale-95"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
