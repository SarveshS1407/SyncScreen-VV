import React, { useState } from 'react';
import { Crown, Users, ArrowRightLeft, Check, Shield } from 'lucide-react';
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
  const [confirmTransferId, setConfirmTransferId] = useState<string | null>(null);

  const onlineCount = participants.filter((p) => p.isOnline).length;

  const handleTransfer = (targetId: string) => {
    onTransferHost(targetId);
    setConfirmTransferId(null);
  };

  return (
    <div className="bg-cinematic-900/90 border border-slate-800/80 rounded-3xl overflow-hidden glass-panel flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-cinematic-950/40">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-primary" />
          <h3 className="font-bold text-sm text-slate-200">Party Members</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{onlineCount} active</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          const isConfirming = confirmTransferId === p.id;

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2.5 rounded-2xl transition border ${
                p.isHost
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-cinematic-800/50 hover:bg-cinematic-800 border-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar with Status Dot */}
                <div className="relative flex-shrink-0">
                  <div
                    style={{ backgroundColor: p.avatarColor || '#6366f1' }}
                    className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs text-white shadow-md ring-1 ring-white/10"
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-cinematic-900 ${
                      p.isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-500'
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-100 truncate">
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] text-brand-primary bg-brand-primary/20 border border-brand-primary/30 px-1.5 py-0.2 rounded-md font-bold">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    {p.isHost ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Crown className="w-3 h-3 fill-current" /> Room Host
                      </span>
                    ) : p.isOnline ? (
                      'Watching'
                    ) : (
                      'Disconnected'
                    )}
                  </span>
                </div>
              </div>

              {/* Badges / Transfer Host */}
              <div className="flex items-center gap-1">
                {p.isHost ? (
                  <div className="p-1 text-amber-400" title="Room Host">
                    <Crown className="w-4 h-4 fill-current drop-shadow-md" />
                  </div>
                ) : isHost && p.isOnline ? (
                  isConfirming ? (
                    <div className="flex items-center gap-1 animate-in fade-in">
                      <button
                        onClick={() => handleTransfer(p.id)}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-cinematic-950 rounded-lg text-[10px] font-bold transition shadow"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmTransferId(null)}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmTransferId(p.id)}
                      className="p-1.5 hover:bg-slate-700/80 rounded-xl text-slate-400 hover:text-amber-300 transition text-xs flex items-center gap-1"
                      title={`Transfer host to ${p.name}`}
                      aria-label={`Transfer host to ${p.name}`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  )
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
