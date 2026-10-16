import React, { useState } from 'react';
import { Copy, Check, Settings, Share2, Compass, EyeOff, BarChart3, Film, LogOut, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { RoomState } from '@watch-party/shared';

interface RoomControlsProps {
  room: RoomState;
  isHost: boolean;
  onOpenDiscovery: () => void;
  onOpenPolls: () => void;
  onOpenVibe: () => void;
  onOpenBlindPick: () => void;
  onOpenHealth: () => void;
  onUpdatePermissions: (perms: Partial<RoomState['permissions']>) => void;
  onLeaveRoom?: () => void;
}

export const RoomControls: React.FC<RoomControlsProps> = ({
  room,
  isHost,
  onOpenDiscovery,
  onOpenPolls,
  onOpenVibe,
  onOpenBlindPick,
  onOpenHealth,
  onUpdatePermissions,
  onLeaveRoom,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="p-4 sm:p-5 bg-cinematic-900/90 border border-slate-800/80 rounded-3xl glass-panel shadow-md space-y-3">
      {/* Upper Row: Title, Room Code, and Main CTAs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
              {room.name}
            </h1>
            {isHost && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                You are Host
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400 font-mono">Room Code:</span>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700/80 rounded-lg text-xs font-mono font-bold text-brand-primary tracking-wider transition"
              title="Click to copy room code"
            >
              <span>{room.code}</span>
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Share and Leave Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-sm"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-brand-primary" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Invite'}</span>
          </button>

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-500/20 border border-slate-700/60 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition"
              title="Leave Room"
              aria-label="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lower Row: Creative Feature Quick Navigation Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenDiscovery}
            className="px-3 py-1.5 rounded-xl bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/40 text-brand-primary text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Browse Movies</span>
          </button>

          <button
            onClick={onOpenPolls}
            className="px-3 py-1.5 rounded-xl bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Polls</span>
          </button>

          <button
            onClick={onOpenVibe}
            className="px-3 py-1.5 rounded-xl bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
          >
            <Compass className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Vibe</span>
          </button>

          <button
            onClick={onOpenBlindPick}
            className="px-3 py-1.5 rounded-xl bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
          >
            <EyeOff className="w-3.5 h-3.5 text-rose-400" />
            <span>Blind Pick</span>
          </button>
        </div>

        {isHost && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition ml-auto"
            title="Room Settings &amp; Permissions"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Host Settings</span>
            {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Host Settings Accordion Panel */}
      {showSettings && isHost && (
        <div className="pt-3 mt-1 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-cinematic-800/70 border border-slate-800">
            <div>
              <span className="font-semibold text-white block">Playback Control</span>
              <span className="text-[11px] text-slate-400">Who can play/pause</span>
            </div>
            <select
              value={room.permissions.controlPlayback}
              onChange={(e) => onUpdatePermissions({ controlPlayback: e.target.value as any })}
              className="bg-cinematic-900 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="host_only">Host Only</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-cinematic-800/70 border border-slate-800">
            <div>
              <span className="font-semibold text-white block">Queue Management</span>
              <span className="text-[11px] text-slate-400">Who can add/reorder</span>
            </div>
            <select
              value={room.permissions.manageQueue}
              onChange={(e) => onUpdatePermissions({ manageQueue: e.target.value as any })}
              className="bg-cinematic-900 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="host_only">Host Only</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-cinematic-800/70 border border-slate-800">
            <div>
              <span className="font-semibold text-white block">Poll Creation</span>
              <span className="text-[11px] text-slate-400">Who can launch polls</span>
            </div>
            <select
              value={room.permissions.createPolls}
              onChange={(e) => onUpdatePermissions({ createPolls: e.target.value as any })}
              className="bg-cinematic-900 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="host_only">Host Only</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
