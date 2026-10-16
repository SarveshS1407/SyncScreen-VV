import React, { useState } from 'react';
import { EyeOff, Trophy, Plus, Check, Play, Lock, X } from 'lucide-react';
import { BlindPickSession, MediaType } from '@watch-party/shared';

interface BlindPickModalProps {
  isOpen: boolean;
  onClose: () => void;
  blindPick?: BlindPickSession;
  isHost: boolean;
  currentUserId: string;
  onStartBlindPick: (title: string) => void;
  onNominate: (title: string, url: string) => void;
  onAdvancePhase: (phase: 'voting' | 'revealed') => void;
  onVote: (nominationId: string) => void;
  onPlayWinner: (movie: { title: string; url: string; type: MediaType; durationSeconds: number }) => void;
}

export const BlindPickModal: React.FC<BlindPickModalProps> = ({
  isOpen,
  onClose,
  blindPick,
  isHost,
  currentUserId,
  onStartBlindPick,
  onNominate,
  onAdvancePhase,
  onVote,
  onPlayWinner,
}) => {
  const [sessionTitle, setSessionTitle] = useState('Secret Movie Showdown');
  const [nomTitle, setNomTitle] = useState('');
  const [nomUrl, setNomUrl] = useState('');

  if (!isOpen) return null;

  const handleNominate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomTitle.trim() || !nomUrl.trim()) return;
    onNominate(nomTitle.trim(), nomUrl.trim());
    setNomTitle('');
    setNomUrl('');
  };

  const myNomination = blindPick?.nominations.find(n => n.nominatedBy === currentUserId);
  const winner = blindPick?.winnerId
    ? blindPick.nominations.find(n => n.id === blindPick.winnerId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-cinematic-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col glass-panel-elevated">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-brand-primary" />
            <h3 className="font-bold text-lg text-white">Blind Pick Showdown</h3>
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
          {!blindPick ? (
            /* Idle: Start Session */
            <div className="py-8 text-center space-y-4">
              <EyeOff className="w-12 h-12 text-brand-primary mx-auto opacity-75" />
              <div>
                <h4 className="text-base font-bold text-white">No Active Blind Pick</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Each participant secretly nominates a movie without anyone seeing the titles.
                  Vote completely blind, then reveal the winner together!
                </p>
              </div>

              {isHost ? (
                <div className="max-w-xs mx-auto space-y-3 pt-2">
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="Blind Pick Title"
                    className="w-full px-4 py-2 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary"
                  />
                  <button
                    onClick={() => onStartBlindPick(sessionTitle)}
                    className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-xl text-sm shadow transition"
                  >
                    Start Blind Pick Session
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Only the host can initiate a Blind Pick.
                </p>
              )}
            </div>
          ) : blindPick.phase === 'nominating' ? (
            /* Phase 1: Nominating */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/30">
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">
                  Phase 1: Secret Nominations Open
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {blindPick.title}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  {blindPick.nominations.length} anonymous nomination(s) submitted so far.
                </p>
              </div>

              {/* Submit nomination */}
              <form onSubmit={handleNominate} className="space-y-3 p-4 bg-cinematic-800/50 rounded-2xl border border-slate-800">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {myNomination ? 'Update Your Secret Pick' : 'Submit Your Secret Pick'}
                </h5>
                <input
                  type="text"
                  value={nomTitle}
                  onChange={(e) => setNomTitle(e.target.value)}
                  placeholder="Movie Title"
                  required
                  className="w-full px-3.5 py-2 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary"
                />
                <input
                  type="url"
                  value={nomUrl}
                  onChange={(e) => setNomUrl(e.target.value)}
                  placeholder="Direct Video URL (MP4 / WebM)"
                  required
                  className="w-full px-3.5 py-2 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary font-mono text-xs"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-xl text-xs transition"
                >
                  {myNomination ? 'Update Secret Nomination' : 'Submit Secret Nomination'}
                </button>
              </form>

              {/* Host Advance Controls */}
              {isHost && (
                <div className="pt-2">
                  <button
                    onClick={() => onAdvancePhase('voting')}
                    disabled={blindPick.nominations.length < 2}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium rounded-xl text-sm transition shadow"
                  >
                    Close Nominations & Start Blind Voting ({blindPick.nominations.length} picks)
                  </button>
                </div>
              )}
            </div>
          ) : blindPick.phase === 'voting' ? (
            /* Phase 2: Voting */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Phase 2: Blind Voting in Progress
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">
                  Vote for a Mystery Reel
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Titles are hidden until voting finishes! Pick by mystery instinct.
                </p>
              </div>

              <div className="space-y-2.5">
                {blindPick.nominations.map((nom, idx) => {
                  const hasVoted = nom.votes.includes(currentUserId);

                  return (
                    <div
                      key={nom.id}
                      onClick={() => onVote(nom.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        hasVoted
                          ? 'border-brand-primary bg-brand-primary/10 shadow-md'
                          : 'border-slate-800 hover:border-slate-700 bg-cinematic-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-brand-primary">
                          #{idx + 1}
                        </div>
                        <div>
                          <h5 className="font-semibold text-white text-sm">
                            Mystery Film #{idx + 1}
                          </h5>
                          <span className="text-[11px] text-slate-500">
                            Nominated Anonymously
                          </span>
                        </div>
                      </div>

                      {hasVoted && (
                        <span className="px-2.5 py-1 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Your Vote
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {isHost && (
                <div className="pt-2">
                  <button
                    onClick={() => onAdvancePhase('revealed')}
                    className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-xl text-sm transition shadow"
                  >
                    Reveal Mystery Picks & Announce Winner!
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Phase 3: Revealed */
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-gradient-to-b from-brand-primary/30 to-cinematic-800 border border-brand-primary/50 text-center">
                <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2 animate-bounce" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  Blind Pick Winner
                </span>
                <h4 className="text-xl font-extrabold text-white mt-1">
                  {winner ? winner.title : 'No Winner'}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Received {winner ? winner.votes.length : 0} blind votes!
                </p>

                {winner && (
                  <button
                    onClick={() => {
                      onPlayWinner({
                        title: winner.title,
                        url: winner.url,
                        type: 'mp4',
                        durationSeconds: 600,
                      });
                      onClose();
                    }}
                    className="mt-4 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs rounded-xl shadow-lg transition inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" /> Play Winning Movie Now
                  </button>
                )}
              </div>

              {/* All revealed nominations */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  All Revealed Nominations
                </h5>
                {blindPick.nominations.map((nom, idx) => (
                  <div
                    key={nom.id}
                    className="p-3 rounded-xl bg-cinematic-800/40 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">#{idx + 1}</span>
                      <span className="font-medium text-white">{nom.title}</span>
                    </div>
                    <span className="font-mono text-amber-400 font-bold">
                      {nom.votes.length} votes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
