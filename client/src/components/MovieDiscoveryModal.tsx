import React, { useState, useEffect } from 'react';
import { Search, X, Star, Play, Plus, Link, Check, Film, AlertCircle } from 'lucide-react';
import { MovieItem, MediaType } from '@watch-party/shared';

interface MovieDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayNow: (movie: { title: string; url: string; type: MediaType; durationSeconds: number }) => void;
  onAddToQueue: (movie: { title: string; url: string; type: MediaType; durationSeconds: number; thumbnailUrl?: string }) => void;
}

const GENRES = ['All', 'Action', 'Sci-Fi', 'Animation', 'Horror', 'Documentary', 'Adventure', 'Comedy'];

export const MovieDiscoveryModal: React.FC<MovieDiscoveryModalProps> = ({
  isOpen,
  onClose,
  onPlayNow,
  onAddToQueue,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'year' | 'title'>('rating');
  const [isLoading, setIsLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Custom URL inputs
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customType, setCustomType] = useState<MediaType>('mp4');

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);

    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedGenre !== 'All') params.set('genre', selectedGenre);
    params.set('sort', sortBy);

    fetch(`/api/movies?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setMovies(data.movies || []);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [isOpen, searchQuery, selectedGenre, sortBy]);

  if (!isOpen) return null;

  const handleQueueClick = (movie: MovieItem) => {
    onAddToQueue({
      title: movie.title,
      url: movie.videoUrl,
      type: movie.videoType,
      durationSeconds: movie.durationSeconds,
      thumbnailUrl: movie.posterUrl,
    });
    setAddedIds(prev => new Set(prev).add(movie.id));
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(movie.id);
        return next;
      });
    }, 2000);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim() || !customTitle.trim()) return;

    onAddToQueue({
      title: customTitle.trim(),
      url: customUrl.trim(),
      type: customType,
      durationSeconds: 300,
    });

    setCustomTitle('');
    setCustomUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[90vh] bg-cinematic-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col glass-panel-elevated">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Film className="w-6 h-6 text-brand-primary" /> Movie & Media Catalog
            </h2>
            <div className="flex bg-cinematic-800 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'catalog' ? 'bg-brand-primary text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Curated Cinema
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'custom' ? 'bg-brand-primary text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom Video URL
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeTab === 'catalog' ? (
          <>
            {/* Search and Filter Controls */}
            <div className="p-4 bg-cinematic-950/60 border-b border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Fuzzy Search Input */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Fuzzy search title, genre..."
                  className="w-full pl-10 pr-4 py-2 bg-cinematic-800 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary transition"
                />
              </div>

              {/* Genre Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGenre(g)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                      selectedGenre === g
                        ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/40'
                        : 'bg-cinematic-800/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-cinematic-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="rating">Top Rated</option>
                <option value="year">Newest Year</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>

            {/* Movie Grid */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <div className="col-span-full h-64 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                </div>
              ) : movies.length === 0 ? (
                <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-500">
                  <AlertCircle className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No movies found matching criteria</p>
                </div>
              ) : (
                movies.map((m) => {
                  const isAdded = addedIds.has(m.id);

                  return (
                    <div
                      key={m.id}
                      className="group bg-cinematic-800/60 hover:bg-cinematic-800 border border-slate-800/80 hover:border-brand-primary/40 rounded-2xl overflow-hidden transition flex flex-col shadow-lg"
                    >
                      {/* Poster image */}
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                        <img
                          src={m.posterUrl}
                          alt={m.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold text-amber-400 flex items-center gap-1 border border-amber-400/20">
                          <Star className="w-3 h-3 fill-current" /> {m.rating}
                        </div>
                        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1">
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                            m.isPlayable
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {m.isPlayable ? 'Direct Stream' : 'Trailer Preview'}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-white text-base group-hover:text-brand-primary transition truncate">
                              {m.title}
                            </h3>
                            <span className="text-xs font-mono text-slate-400">{m.year}</span>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-2">
                            {m.genre.map((g) => (
                              <span
                                key={g}
                                className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded"
                              >
                                {g}
                              </span>
                            ))}
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                            {m.description}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                          {m.isPlayable ? (
                            <>
                              <button
                                onClick={() => {
                                  onPlayNow({
                                    title: m.title,
                                    url: m.videoUrl,
                                    type: m.videoType,
                                    durationSeconds: m.durationSeconds,
                                  });
                                  onClose();
                                }}
                                className="flex-1 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" /> Play Now
                              </button>
                              <button
                                onClick={() => handleQueueClick(m)}
                                disabled={isAdded}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1 transition ${
                                  isAdded
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                    : 'border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white'
                                }`}
                              >
                                {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                {isAdded ? 'Queued' : 'Queue'}
                              </button>
                            </>
                          ) : (
                            <div className="w-full text-center py-1.5 text-xs text-slate-400 bg-slate-800/80 rounded-xl">
                              Catalog Preview Only
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* Custom Video URL Form */
          <div className="p-8 max-w-lg mx-auto w-full flex-1 flex flex-col justify-center">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Link className="w-5 h-5 text-brand-primary" /> Add Custom Video Source
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Enter any accessible direct MP4, WebM, HLS, or YouTube stream URL to synchronize with the room.
            </p>

            <form onSubmit={handleAddCustom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Video Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Vacation Trip Reel 4K"
                  required
                  className="w-full px-4 py-2.5 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Direct Video URL
                </label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  required
                  className="w-full px-4 py-2.5 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Format Type
                </label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as MediaType)}
                  className="w-full px-4 py-2.5 bg-cinematic-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                >
                  <option value="mp4">MP4 Video</option>
                  <option value="hls">HLS Stream (.m3u8)</option>
                  <option value="youtube">YouTube Embed</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-xl text-sm transition mt-4 shadow-lg shadow-brand-primary/20"
              >
                Add to Room Queue
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
