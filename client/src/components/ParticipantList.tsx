import React from 'react';
import { Crown, Users, ArrowRightLeft } from 'lucide-react';
import { Participant } from '@watch-party/shared';

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  onTransferHost: (targetId: string) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  isHost,
  onTransferHost,
}) => {
  const onlineCount = participants.filter((p) => p.isOnline).length;

  return (
    <div className="bg-cinematic-900/90 border border-slate-800/80 rounded-2xl overflow-hidden glass-panel flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-primary" />
          <h3 className="font-semibold text-sm text-slate-200">Party Members</h3>
        </div>
        <span className="text-xs text-emerald-400 font-medium">
          {onlineCount} online
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((p) => {
          const isMe = p.id === currentUserId;

          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-2 rounded-xl bg-cinematic-800/50 hover:bg-cinematic-800 transition border border-slate-800/60"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Avatar with Status Dot */}
                <div className="relative">
                  <div
                    style={{ backgroundColor: p.avatarColor || '#6366f1' }}
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm"
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-cinematic-900 ${
                      p.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] text-slate-400 bg-slate-700/60 px-1.5 py-0.2 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {p.isHost ? 'Party Host' : p.isOnline ? 'Watching' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Badges / Transfer Host */}
              <div className="flex items-center gap-1">
                {p.isHost ? (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-medium">
                    <Crown className="w-3 h-3 fill-current" /> Host
                  </div>
                ) : isHost && p.isOnline ? (
                  <button
                    onClick={() => onTransferHost(p.id)}
                    className="p-1.5 hover:bg-slate-700/80 rounded-lg text-slate-400 hover:text-amber-300 transition text-xs"
                    title={`Make ${p.name} host`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
