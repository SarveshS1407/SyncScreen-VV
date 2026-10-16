import React, { useState, useEffect } from 'react';
import { Film, Users, Play, Compass, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

interface LandingPageProps {
  initialRoomCode?: string;
  onJoin: (roomCode: string, userName: string) => void;
  onCreate: (userName: string, roomName?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  initialRoomCode = '',
  onJoin,
  onCreate,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
      setMode('join');
    }
  }, [initialRoomCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (mode === 'join') {
      if (!roomCode.trim()) {
        setError('Please enter a room code');
        return;
      }
      setIsLoading(true);
      onJoin(roomCode.trim().toUpperCase(), userName.trim());
    } else {
      setIsLoading(true);
      onCreate(userName.trim(), roomName.trim() || undefined);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Top Navbar */}
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center shadow-lg shadow-brand-primary/30">
            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white">WatchParty</h1>
            <p className="text-[10px] text-brand-primary font-mono font-semibold uppercase tracking-widest">
              Synchronized Cinema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Sub-500ms Sync
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto py-8">
        {/* Left Hero Description */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Next-Generation Real-Time Social Streaming</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Watch Together, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-cyan">
              Frame-Perfect.
            </span>
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
            Experience movies with friends in perfect sub-second synchronization.
            Featuring continuous drift correction, live group polls, secret Blind Pick voting, and room vibe matching.
          </p>

          {/* Value Props */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
            <div className="p-3.5 rounded-2xl bg-cinematic-900/60 border border-slate-800 glass-panel">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="font-bold text-sm text-white">Continuous Sync</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Automatic drift reconciliation below 500ms</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-cinematic-900/60 border border-slate-800 glass-panel">
              <EyeOff className="w-5 h-5 text-rose-400 mb-2" />
              <h4 className="font-bold text-sm text-white">Blind Pick</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Secret nominations & blind movie showdowns</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-cinematic-900/60 border border-slate-800 glass-panel col-span-2 sm:col-span-1">
              <Compass className="w-5 h-5 text-brand-cyan mb-2" />
              <h4 className="font-bold text-sm text-white">Vibe Matching</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Collective mood recommendations</p>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-5">
          <div className="p-6 sm:p-8 rounded-3xl bg-cinematic-900 border border-slate-800 shadow-2xl glass-panel-elevated">
            {/* Mode Switcher */}
            <div className="flex bg-cinematic-800 p-1.5 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setMode('create'); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition ${
                  mode === 'create'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Room
              </button>
              <button
                type="button"
                onClick={() => { setMode('join'); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition ${
                  mode === 'join'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Join Room
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex"
                  required
                  maxLength={25}
                  className="w-full px-4 py-3 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary transition"
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
                    placeholder="e.g. Friday Night Cinema Lounge"
                    maxLength={40}
                    className="w-full px-4 py-3 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary transition"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Room Code
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. VELVET-CINEMA-482"
                    required
                    className="w-full px-4 py-3 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary font-mono tracking-wider transition uppercase"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-95 text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-primary/25 transition flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                <span>{mode === 'create' ? 'Create Watch Room' : 'Join Watch Room'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <span>WatchParty v1.0 • Enterprise Real-Time Sync</span>
        <div className="flex items-center gap-4">
          <span>Latency: &lt; 250ms p95</span>
          <span>•</span>
          <span>Drift Target: &lt; 500ms</span>
        </div>
      </footer>
    </div>
  );
};
