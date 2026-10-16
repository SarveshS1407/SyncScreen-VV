import React from 'react';
import { Flame, Activity, Users, ShieldCheck } from 'lucide-react';
import { WatchPartyPulse as PulseType } from '@watch-party/shared';

interface WatchPartyPulseProps {
  pulse: PulseType;
  onOpenHealth: () => void;
}

export const WatchPartyPulse: React.FC<WatchPartyPulseProps> = ({
  pulse,
  onOpenHealth,
}) => {
  // Energy color interpolation
  const getEnergyColor = (energy: number) => {
    if (energy > 75) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (energy > 45) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (energy > 20) return 'text-brand-primary bg-brand-primary/10 border-brand-primary/30';
    return 'text-slate-400 bg-slate-800/80 border-slate-700/50';
  };

  const getSyncColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-cinematic-900/90 border border-slate-800/80 glass-panel shadow-sm text-xs">
      {/* Active Watchers */}
      <div className="flex items-center gap-1.5 text-slate-300 font-medium px-2 py-0.5 rounded-lg bg-slate-800/50">
        <Users className="w-3.5 h-3.5 text-brand-primary" />
        <span>{pulse.activeWatchers}</span>
      </div>

      {/* Party Pulse Energy Meter */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-medium transition-colors ${getEnergyColor(
          pulse.reactionEnergy
        )}`}
        title={`Room Reaction Energy: ${pulse.reactionEnergy}%`}
      >
        <Flame className={`w-3.5 h-3.5 ${pulse.reactionEnergy > 50 ? 'animate-bounce' : ''}`} />
        <span>Pulse {pulse.reactionEnergy}%</span>
      </div>

      {/* Sync Health Score */}
      <button
        onClick={onOpenHealth}
        className="flex items-center gap-1.5 text-slate-300 hover:text-white px-2 py-0.5 rounded-lg hover:bg-slate-800/60 transition"
        title="Open Room Health Diagnostics"
      >
        <ShieldCheck className={`w-3.5 h-3.5 ${getSyncColor(pulse.syncHealthScore)}`} />
        <span className="font-mono text-[11px]">{pulse.syncHealthScore}%</span>
      </button>
    </div>
  );
};
