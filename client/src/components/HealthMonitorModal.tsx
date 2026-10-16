import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Activity, Server, Clock, RefreshCw } from 'lucide-react';
import { RoomHealthReport } from '@watch-party/shared';
import { socketService } from '../services/socket.js';

interface HealthMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const HealthMonitorModal: React.FC<HealthMonitorModalProps> = ({
  isOpen,
  onClose,
  roomCode,
}) => {
  const [report, setReport] = useState<RoomHealthReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = () => {
    setLoading(true);
    fetch(`/api/rooms/${roomCode}/health`)
      .then((res) => res.json())
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
      const interval = setInterval(fetchReport, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, roomCode]);

  if (!isOpen) return null;

  const currentRtt = socketService.getLastRtt();
  const clockOffset = socketService.getClockOffset();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-cinematic-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col glass-panel-elevated">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg text-white">Watch Party Health Monitor</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReport}
              className={`p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ${
                loading ? 'animate-spin' : ''
              }`}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-cinematic-800/60 border border-slate-800 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium block mb-1">
                Local RTT Latency
              </span>
              <span className="text-xl font-bold font-mono text-brand-cyan">
                {currentRtt} ms
              </span>
            </div>

            <div className="p-3.5 bg-cinematic-800/60 border border-slate-800 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium block mb-1">
                Clock Offset (NTP)
              </span>
              <span className="text-xl font-bold font-mono text-slate-200">
                {Math.round(clockOffset)} ms
              </span>
            </div>

            <div className="p-3.5 bg-cinematic-800/60 border border-slate-800 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium block mb-1">
                Max Measured Drift
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {report ? `${report.maxDriftMs} ms` : '0 ms'}
              </span>
            </div>

            <div className="p-3.5 bg-cinematic-800/60 border border-slate-800 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium block mb-1">
                Corrections Applied
              </span>
              <span className="text-xl font-bold font-mono text-amber-400">
                {report?.recentCorrectionsCount ?? 0}
              </span>
            </div>

            <div className="p-3.5 bg-cinematic-800/60 border border-slate-800 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium block mb-1">
                Reconnect Events
              </span>
              <span className="text-xl font-bold font-mono text-slate-300">
                {report?.reconnectEventsCount ?? 0}
              </span>
            </div>

            <div className="p-3.5 bg-cinematic-800/60 border border-slate-800 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium block mb-1">
                Playback Revision
              </span>
              <span className="text-xl font-bold font-mono text-brand-primary">
                rev #{report?.playbackRevision ?? 1}
              </span>
            </div>
          </div>

          {/* Sync Target Compliance Spec Note */}
          <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 flex items-start gap-3">
            <Activity className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h5 className="font-semibold text-white">Synchronization Target Compliance</h5>
              <p className="text-slate-300 leading-relaxed">
                Acceptance target: Maximum playback drift ≤ 500 ms; control propagation latency ≤ 250 ms at p95 under local network conditions.
              </p>
            </div>
          </div>

          {/* Technical Diagnostics */}
          <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" /> Room Code
              </span>
              <span className="font-mono text-slate-200">{roomCode}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Server Uptime
              </span>
              <span className="font-mono text-slate-200">
                {report ? `${Math.floor(report.serverUptimeSeconds / 60)}m ${report.serverUptimeSeconds % 60}s` : '0s'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>Active Participants</span>
              <span className="font-mono text-slate-200">
                {report ? `${report.onlineParticipants} / ${report.totalParticipants}` : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
