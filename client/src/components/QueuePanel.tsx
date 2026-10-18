import React from 'react';
import { ListVideo, Play, Trash2, ArrowUp, ArrowDown, Plus, Film, Lock, Music } from 'lucide-react';
import { QueueItem, PlaybackState } from '@watch-party/shared';

interface QueuePanelProps {
  queue: QueueItem[];
  playback: PlaybackState;
  canManage: boolean;
  onPlayItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onReorder: (itemIds: string[]) => void;
  onOpenDiscovery: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  queue,
  playback,
  canManage,
  onPlayItem,
  onRemoveItem,
  onReorder,
  onOpenDiscovery,
}) => {
  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!canManage) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queue.length) return;

    const newQueue = [...queue];
    const [moved] = newQueue.splice(index, 1);
    newQueue.splice(targetIndex, 0, moved);
    onReorder(newQueue.map(item => item.id));
  };

  const formatDuration = (secs: number) => {
    if (!secs || isNaN(secs)) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  };

  return (
    <div className="bg-cinematic-900/90 border border-slate-800/80 rounded-3xl overflow-hidden glass-panel flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-cinematic-950/40">
        <div className="flex items-center gap-2">
          <ListVideo className="w-4 h-4 text-brand-primary" />
          <h3 className="font-bold text-sm text-slate-200">Shared Queue</h3>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              <Lock className="w-3 h-3 text-amber-400" /> Host only
            </div>
          )}
          <button
            onClick={onOpenDiscovery}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/40 text-brand-primary text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Movies</span>
          </button>
        </div>
      </div>

      {/* Currently Playing Card */}
      <div className="p-3.5 bg-cinematic-800/50 border-b border-slate-800/70">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold tracking-wider text-brand-primary uppercase flex items-center gap-1.5">
            <span className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-brand-primary rounded-full animate-soundwave-1" />
              <span className="w-0.5 bg-brand-primary rounded-full animate-soundwave-2" />
              <span className="w-0.5 bg-brand-primary rounded-full animate-soundwave-3" />
            </span>
            <span>Now Streaming</span>
          </span>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
            {playback.status}
          </span>
        </div>

        <div className="font-bold text-sm text-white truncate max-w-full">
          {playback.mediaTitle || 'Selected Media'}
        </div>
      </div>

      {/* Queue Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {queue.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <ListVideo className="w-10 h-10 mb-2 opacity-30 text-brand-primary" />
            <h4 className="font-semibold text-xs text-slate-300">Queue is empty</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Add upcoming movies from the catalog so the party continues automatically.
            </p>
            <button
              onClick={onOpenDiscovery}
              className="mt-3 px-3 py-1.5 rounded-xl bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary border border-brand-primary/40 text-xs font-semibold transition"
            >
              Browse Movie Catalog
            </button>
          </div>
        ) : (
          queue.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-cinematic-800/40 hover:bg-cinematic-800/90 transition border border-slate-800/70 group shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Thumbnail */}
                <div className="w-14 h-10 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0 relative border border-slate-700/60">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <Film className="w-5 h-5" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] font-mono font-bold text-slate-300 px-1 rounded">
                    #{index + 1}
                  </span>
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-200 truncate group-hover:text-white">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>{formatDuration(item.durationSeconds)}</span>
                    <span>•</span>
                    <span className="truncate">Added by {item.addedBy.name}</span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1">
                {canManage && (
                  <>
                    <button
                      onClick={() => onPlayItem(item.id)}
                      className="min-h-[36px] min-w-[36px] p-2 hover:bg-brand-primary/20 hover:text-brand-primary active:scale-95 rounded-xl text-slate-400 transition flex items-center justify-center"
                      title="Play Now"
                      aria-label={`Play ${item.title} now`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="min-h-[36px] min-w-[36px] p-2 hover:bg-slate-700 active:scale-95 rounded-xl text-slate-400 disabled:opacity-20 transition flex items-center justify-center"
                      title="Move Up"
                      aria-label="Move item up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === queue.length - 1}
                      className="min-h-[36px] min-w-[36px] p-2 hover:bg-slate-700 active:scale-95 rounded-xl text-slate-400 disabled:opacity-20 transition flex items-center justify-center"
                      title="Move Down"
                      aria-label="Move item down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="min-h-[36px] min-w-[36px] p-2 hover:bg-rose-500/20 hover:text-rose-400 active:scale-95 rounded-xl text-slate-400 transition flex items-center justify-center"
                      title="Remove from queue"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
