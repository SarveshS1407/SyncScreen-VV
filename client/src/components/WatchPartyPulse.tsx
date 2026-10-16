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
    if (energy > 75) return 'text-rose-400 bg-rose-500/15 border-rose-500/35 shadow-sm shadow-rose-500/20';
    if (energy > 45) return 'text-amber-400 bg-amber-500/15 border-amber-500/35';
    if (energy > 20) return 'text-brand-primary bg-brand-primary/15 border-brand-primary/35';
    return 'text-slate-400 bg-slate-800/80 border-slate-700/60';
  };

  const getSyncColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    if (score >= 70) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-cinematic-900/95 border border-slate-800/90 glass-panel shadow-sm text-xs">
      {/* Active Watchers */}
      <div className="flex items-center gap-1.5 text-slate-300 font-bold px-2.5 py-1 rounded-xl bg-slate-800/60 border border-slate-700/50">
        <Users className="w-3.5 h-3.5 text-brand-primary" />
        <span>{pulse.activeWatchers}</span>
      </div>

      {/* Party Pulse Energy Meter */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border font-bold transition-colors ${getEnergyColor(
          pulse.reactionEnergy
        )}`}
        title={`Room Reaction Energy: ${pulse.reactionEnergy}%`}
      >
        <Flame className={`w-3.5 h-3.5 ${pulse.reactionEnergy > 45 ? 'animate-bounce' : ''}`} />
        <span>Pulse {pulse.reactionEnergy}%</span>
      </div>

      {/* Sync Health Score */}
      <button
        onClick={onOpenHealth}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-mono font-bold transition hover:scale-105 active:scale-95 ${getSyncColor(
          pulse.syncHealthScore
        )}`}
        title="Click to inspect real-time sync latency & drift diagnostics"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>{pulse.syncHealthScore}%</span>
      </button>
    </div>
  );
};
