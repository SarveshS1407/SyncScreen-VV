import React, { useState, useEffect } from 'react';
import { Film, Users, Play, Compass, EyeOff, ShieldCheck, ArrowRight, Sparkles, Tv, Zap, Check } from 'lucide-react';

interface LandingPageProps {
  initialRoomCode?: string;
  onJoin: (roomCode: string, userName: string) => void;
  onCreate: (userName: string, roomName?: string) => Promise<void> | void;
  isCreating?: boolean;
  createError?: string | null;
}

function parseRoomCodeInput(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('room=')) {
    try {
      const match = trimmed.match(/[?&]room=([^&#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim().toUpperCase();
      }
    } catch {
      // fallback
    }
  }
  if (trimmed.includes('/') || trimmed.includes(':')) {
    const segments = trimmed.split('/');
    const last = segments[segments.length - 1];
    if (last) {
      return last.split('?')[0].trim().toUpperCase();
    }
  }
  return trimmed.toUpperCase();
}

export const LandingPage: React.FC<LandingPageProps> = ({
  initialRoomCode = '',
  onJoin,
  onCreate,
  isCreating = false,
  createError = null,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(parseRoomCodeInput(initialRoomCode));
      setMode('join');
    }
  }, [initialRoomCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userName.trim()) {
      setError('Please enter your display name to continue.');
      return;
    }

    if (mode === 'join') {
      const cleanedCode = parseRoomCodeInput(roomCode);
      if (!cleanedCode) {
        setError('Please enter a valid room code or invitation URL.');
        return;
      }
      setIsLoading(true);
      onJoin(cleanedCode, userName.trim());
    } else {
      setIsLoading(true);
      try {
        await onCreate(userName.trim(), roomName.trim() || undefined);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleQuickDemo = async () => {
    const demoNames = ['Nova', 'Orion', 'Stella', 'Phoenix', 'Lyra', 'Atlas'];
    const randomName = demoNames[Math.floor(Math.random() * demoNames.length)];
    setIsLoading(true);
    try {
      await onCreate(randomName, `${randomName}'s Cinema Lounge`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 max-w-7xl mx-auto selection:bg-brand-primary selection:text-white">
      {/* Top Navbar */}
      <header className="flex items-center justify-between py-4 border-b border-slate-800/60 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-primary via-brand-accent to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-primary/25 ring-1 ring-white/20">
            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">SyncScreen</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider">
              Server-Authoritative Real-Time Watch Party
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Target &lt; 500ms Drift Verified</span>
          </span>

          <button
            onClick={handleQuickDemo}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm hover:shadow"
            title="Launch an instant room with sample media"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span className="hidden sm:inline">Instant</span> Demo
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center my-auto py-10">
        {/* Left Hero Description */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/70 text-xs text-slate-300 shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-medium">Sub-Second Frame Sync • Zero Install</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]">
            Watch Together in <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-cyan">
              Perfect Harmony.
            </span>
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
            Synchronize movies, anime, and video streams across multiple participants.
            Features continuous drift detection, live sanitized chat, floating emoji bursts, group polls, and collective mood-matching.
          </p>

          {/* Value Props Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-cinematic-900/70 border border-slate-800/80 glass-panel hover:border-slate-700 transition">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Sub-500ms Drift</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Continuous rate micro-adjustment &amp; anti-looping reconciliation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-cinematic-900/70 border border-slate-800/80 glass-panel hover:border-slate-700 transition">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                <EyeOff className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Blind Pick Mode</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Secret movie submissions &amp; blind group voting showdowns.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-cinematic-900/70 border border-slate-800/80 glass-panel hover:border-slate-700 transition">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-brand-cyan mb-3">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Vibe Matching</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Real-time room mood consensus with smart genre suggestions.
              </p>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-5">
          <div className="p-6 sm:p-8 rounded-3xl bg-cinematic-900/95 border border-slate-800/90 shadow-2xl glass-panel-elevated relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Mode Switcher */}
            <div className="flex bg-cinematic-800/80 p-1.5 rounded-2xl mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => { setMode('create'); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  mode === 'create'
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Create Room</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('join'); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  mode === 'join'
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Join Room</span>
              </button>
            </div>

            {(error || createError) && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                <span className="leading-relaxed">{error || createError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Display Name <span className="text-brand-primary">*</span>
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex"
                  required
                  maxLength={30}
                  autoFocus
                  className="w-full px-4 py-3 bg-cinematic-800/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
                />
              </div>

              {mode === 'create' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Room Name <span className="text-slate-500 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g. Saturday Night Sci-Fi Lounge"
                    maxLength={50}
                    className="w-full px-4 py-3 bg-cinematic-800/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Room Code <span className="text-brand-primary">*</span>
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      const extracted = parseRoomCodeInput(pasted);
                      if (extracted) {
                        e.preventDefault();
                        setRoomCode(extracted);
                      }
                    }}
                    placeholder="e.g. COSMIC-CINEMA-703"
                    required
                    maxLength={50}
                    className="w-full px-4 py-3 bg-cinematic-800/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-mono tracking-wider transition uppercase"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Paste an invitation code or URL shared by the host.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || isCreating}
                className="w-full py-3.5 bg-gradient-to-r from-brand-primary via-brand-accent to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-primary/30 transition flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                <span>{(isLoading || isCreating) ? 'Connecting to Room...' : mode === 'create' ? 'Create Watch Room' : 'Join Watch Room'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">SyncScreen-VV</span>
          <span>•</span>
          <span>Open-Source Multi-User Synchronized Streaming</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span>Latency: p95 &le; 250ms</span>
          <span>•</span>
          <span>Drift: &le; 500ms</span>
        </div>
      </footer>
    </div>
  );
};
