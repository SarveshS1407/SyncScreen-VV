import React, { useState } from 'react';
import { BarChart3, Plus, X, Check, Lock, AlertCircle } from 'lucide-react';
import { Poll } from '@watch-party/shared';

interface PollsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePoll?: Poll;
  currentUserId: string;
  isHost: boolean;
  canCreatePoll: boolean;
  onCreatePoll: (question: string, options: string[]) => void;
  onVote: (optionId: string) => void;
  onClosePoll: () => void;
}

export const PollsModal: React.FC<PollsModalProps> = ({
  isOpen,
  onClose,
  activePoll,
  currentUserId,
  isHost,
  canCreatePoll,
  onCreatePoll,
  onVote,
  onClosePoll,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const next = [...options];
    next[index] = val;
    setOptions(next);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return;

    onCreatePoll(question.trim(), validOptions);
    setIsCreating(false);
    setQuestion('');
    setOptions(['', '']);
  };

  // Calculate votes
  const totalVotes = activePoll
    ? activePoll.options.reduce((sum, opt) => sum + opt.votes.length, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-cinematic-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col glass-panel-elevated">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-primary" />
            <h3 className="font-bold text-lg text-white">Party Polls</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {isCreating ? (
            /* Creation Form */
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Poll Question
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Which movie should we play next?"
                  required
                  maxLength={120}
                  className="w-full px-4 py-2.5 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Options
                </label>
                {options.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    required
                    maxLength={60}
                    className="w-full px-4 py-2 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary"
                  />
                ))}

                {options.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs text-brand-primary hover:text-brand-accent flex items-center gap-1 font-medium mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Option
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-xl text-sm transition"
                >
                  Launch Poll
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : activePoll ? (
            /* Active Poll View */
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-bold text-white mb-1">
                    {activePoll.question}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Created by {activePoll.createdBy.name} • {totalVotes} votes total
                  </p>
                </div>
                {activePoll.closed ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
                    Closed
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-medium animate-pulse">
                    Live
                  </span>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2.5 pt-2">
                {activePoll.options.map((opt) => {
                  const hasVoted = opt.votes.includes(currentUserId);
                  const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => !activePoll.closed && onVote(opt.id)}
                      className={`relative overflow-hidden p-3 rounded-2xl border transition cursor-pointer ${
                        hasVoted
                          ? 'border-brand-primary bg-brand-primary/10'
                          : 'border-slate-800 hover:border-slate-700 bg-cinematic-800/40'
                      }`}
                    >
                      {/* Vote Percentage Fill Bar */}
                      <div
                        style={{ width: `${pct}%` }}
                        className={`absolute inset-y-0 left-0 opacity-20 pointer-events-none transition-all duration-500 ${
                          hasVoted ? 'bg-brand-primary' : 'bg-slate-600'
                        }`}
                      />

                      <div className="relative flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {hasVoted && (
                            <Check className="w-4 h-4 text-brand-primary flex-shrink-0" />
                          )}
                          <span className={`font-medium ${hasVoted ? 'text-white' : 'text-slate-200'}`}>
                            {opt.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-slate-400">{opt.votes.length}</span>
                          <span className="font-semibold text-slate-200">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {!activePoll.closed && (isHost || activePoll.createdBy.id === currentUserId) && (
                  <button
                    onClick={onClosePoll}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium transition"
                  >
                    End Poll & Lock Results
                  </button>
                )}

                {canCreatePoll && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="ml-auto text-xs text-brand-primary hover:text-brand-accent font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Start New Poll
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* No Active Poll State */
            <div className="py-10 text-center">
              <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-white mb-1">No Active Poll</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
                Poll party members to decide what to watch next, vote on scenes, or settle movie debates.
              </p>

              {canCreatePoll ? (
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-brand-primary/20 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create a Poll
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/80 px-3 py-1.5 rounded-full">
                  <Lock className="w-3.5 h-3.5" /> Only host can create polls
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
