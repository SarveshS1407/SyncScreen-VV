import React, { useState } from 'react';
import { Bookmark, X } from 'lucide-react';

interface MomentMarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlaybackSeconds: number;
  onAddMarker: (title: string, timestampSeconds: number) => void;
}

export const MomentMarkerModal: React.FC<MomentMarkerModalProps> = ({
  isOpen,
  onClose,
  currentPlaybackSeconds,
  onAddMarker,
}) => {
  const [title, setTitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddMarker(title.trim(), currentPlaybackSeconds);
    setTitle('');
    onClose();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-cinematic-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl glass-panel-elevated">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Bookmark Moment</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
            <span>Timestamp:</span>
            <span className="font-mono font-bold text-white">{formatTime(currentPlaybackSeconds)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Moment Title / Note
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Best action sequence, plot twist!"
              required
              maxLength={80}
              autoFocus
              className="w-full px-3.5 py-2 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-xl text-xs transition"
            >
              Pin to Room Timeline
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
