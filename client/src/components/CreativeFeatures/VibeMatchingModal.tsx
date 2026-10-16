import React from 'react';
import { Compass, Sparkles, X, Check } from 'lucide-react';
import { VibeState, VibeType } from '@watch-party/shared';

interface VibeMatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vibeState: VibeState;
  currentUserId: string;
  onSelectVibe: (vibe: VibeType) => void;
  onFilterCatalogByVibe: (vibe: VibeType) => void;
}

const VIBES: { id: VibeType; label: string; emoji: string; desc: string; color: string }[] = [
  { id: 'suspenseful', label: 'Suspenseful', emoji: '⚡', desc: 'Edge of your seat thrills, unexpected twists', color: 'from-amber-500/20 to-rose-500/20 border-amber-500/40' },
  { id: 'funny', label: 'Laugh Out Loud', emoji: '😂', desc: 'Lighthearted, comedy, pure entertainment', color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/40' },
  { id: 'relaxing', label: 'Cozy & Chill', emoji: '☕', desc: 'Calming visuals, ambient soundscapes, low stakes', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40' },
  { id: 'nostalgic', label: 'Nostalgic Classics', emoji: '📼', desc: 'Timeless favorites, vintage aesthetics, retro vibes', color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/40' },
  { id: 'mind_bending', label: 'Mind-Bending', emoji: '🌀', desc: 'Deep sci-fi, philosophical puzzles, surreal worlds', color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40' },
  { id: 'epic', label: 'Epic Adventures', emoji: '⚔️', desc: 'Grand scale battles, heroic quests, high energy', color: 'from-rose-500/20 to-red-500/20 border-rose-500/40' },
];

export const VibeMatchingModal: React.FC<VibeMatchingModalProps> = ({
  isOpen,
  onClose,
  vibeState,
  currentUserId,
  onSelectVibe,
  onFilterCatalogByVibe,
}) => {
  if (!isOpen) return null;

  const myVibe = vibeState.vibeVotes[currentUserId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-cinematic-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col glass-panel-elevated">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-primary" />
            <h3 className="font-bold text-lg text-white">Party Vibe Matching</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Active Dominant Vibe Banner */}
          {vibeState.activeVibe && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-primary/20 via-brand-accent/20 to-brand-cyan/20 border border-brand-primary/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                  Room Consensus Mood
                </span>
                <h4 className="text-base font-bold text-white capitalize mt-0.5">
                  {vibeState.activeVibe.replace('_', ' ')}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Recommended: {vibeState.recommendedGenres.join(', ')}
                </p>
              </div>

              <button
                onClick={() => {
                  onFilterCatalogByVibe(vibeState.activeVibe!);
                  onClose();
                }}
                className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium text-xs rounded-xl shadow transition"
              >
                Browse Matching Movies
              </button>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-1">
              What kind of mood are you in?
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Cast your vote. The room dynamically aggregates everyone’s choice to recommend matching films.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VIBES.map((v) => {
                const isSelected = myVibe === v.id;
                // Count how many voters chose this vibe
                const voterCount = Object.values(vibeState.vibeVotes).filter(val => val === v.id).length;

                return (
                  <button
                    key={v.id}
                    onClick={() => onSelectVibe(v.id)}
                    className={`p-4 rounded-2xl border text-left transition relative overflow-hidden group flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/10 shadow-lg'
                        : 'border-slate-800 hover:border-slate-700 bg-cinematic-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{v.emoji}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        )}
                      </div>

                      <h5 className="font-bold text-white text-sm group-hover:text-brand-primary transition">
                        {v.label}
                      </h5>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {v.desc}
                      </p>
                    </div>

                    {voterCount > 0 && (
                      <div className="mt-3 text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{voterCount} member{voterCount > 1 ? 's' : ''} voted</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
