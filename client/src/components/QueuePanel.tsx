import React from 'react';
import { ListVideo, Play, Trash2, ArrowUp, ArrowDown, Plus, Film, Lock } from 'lucide-react';
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
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  };

  return (
    <div className="bg-cinematic-900/90 border border-slate-800/80 rounded-2xl overflow-hidden glass-panel flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListVideo className="w-4 h-4 text-brand-primary" />
          <h3 className="font-semibold text-sm text-slate-200">Watch Queue</h3>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Host only
            </div>
          )}
          <button
            onClick={onOpenDiscovery}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/40 text-brand-primary text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" /> Browse Catalog
          </button>
        </div>
      </div>

      {/* Currently Playing Card */}
      <div className="p-3 bg-cinematic-800/40 border-b border-slate-800/60">
        <div className="text-[10px] font-semibold tracking-wider text-brand-primary uppercase mb-1.5 flex items-center gap-1">
          <Film className="w-3 h-3" /> Now Playing
        </div>
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm text-white truncate max-w-[80%]">
            {playback.mediaTitle || 'Selected Media'}
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
            {playback.status}
          </span>
        </div>
      </div>

      {/* Queue Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {queue.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <ListVideo className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">Queue is empty</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Click &quot;Browse Catalog&quot; to queue up movies
            </p>
          </div>
        ) : (
          queue.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-cinematic-800/40 hover:bg-cinematic-800 transition border border-slate-800/60 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Thumbnail */}
                <div className="w-12 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 relative">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <Film className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-white">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
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
                      className="p-1.5 hover:bg-brand-primary/20 hover:text-brand-primary rounded-lg text-slate-400 transition"
                      title="Play Now"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 disabled:opacity-20 transition"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === queue.length - 1}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 disabled:opacity-20 transition"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-slate-400 transition"
                      title="Remove from queue"
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
