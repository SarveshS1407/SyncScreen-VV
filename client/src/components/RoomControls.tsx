import React, { useState } from 'react';
import { Copy, Check, Settings, Share2, Compass, EyeOff, BarChart3, Film, ShieldCheck } from 'lucide-react';
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
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-cinematic-900/90 border border-slate-800/80 rounded-2xl glass-panel shadow-md">
      {/* Room Name & Code */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {room.name}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400 font-mono">Code:</span>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700/80 rounded-md text-xs font-mono font-bold text-brand-primary tracking-wider transition"
              title="Click to copy room code"
            >
              {room.code}
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={copyLink}
          className="px-3 py-1.5 rounded-xl bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copiedLink ? 'Link Copied!' : 'Invite Link'}</span>
        </button>

        <button
          onClick={onOpenDiscovery}
          className="px-3 py-1.5 rounded-xl bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/40 text-brand-primary text-xs font-medium flex items-center gap-1.5 transition"
        >
          <Film className="w-3.5 h-3.5" /> Movies
        </button>

        <button
          onClick={onOpenPolls}
          className="px-3 py-1.5 rounded-xl bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition"
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" /> Polls
        </button>

        <button
          onClick={onOpenVibe}
          className="px-3 py-1.5 rounded-xl bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition"
        >
          <Compass className="w-3.5 h-3.5 text-brand-cyan" /> Vibe
        </button>

        <button
          onClick={onOpenBlindPick}
          className="px-3 py-1.5 rounded-xl bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition"
        >
          <EyeOff className="w-3.5 h-3.5 text-rose-400" /> Blind Pick
        </button>

        {isHost && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-xl bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700 text-slate-400 hover:text-white transition"
            title="Room Settings & Permissions"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Host Settings Modal */}
      {showSettings && isHost && (
        <div className="w-full pt-3 mt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-cinematic-800/60 border border-slate-800">
            <span className="text-slate-300">Playback Controls</span>
            <select
              value={room.permissions.controlPlayback}
              onChange={(e) => onUpdatePermissions({ controlPlayback: e.target.value as any })}
              className="bg-cinematic-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
            >
              <option value="everyone">Everyone</option>
              <option value="host_only">Host Only</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-cinematic-800/60 border border-slate-800">
            <span className="text-slate-300">Queue Management</span>
            <select
              value={room.permissions.manageQueue}
              onChange={(e) => onUpdatePermissions({ manageQueue: e.target.value as any })}
              className="bg-cinematic-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
            >
              <option value="everyone">Everyone</option>
              <option value="host_only">Host Only</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-cinematic-800/60 border border-slate-800">
            <span className="text-slate-300">Poll Creation</span>
            <select
              value={room.permissions.createPolls}
              onChange={(e) => onUpdatePermissions({ createPolls: e.target.value as any })}
              className="bg-cinematic-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
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
