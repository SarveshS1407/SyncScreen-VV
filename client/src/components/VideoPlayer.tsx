import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Activity,
  Sparkles,
  Lock,
  Bookmark,
  AlertTriangle,
  Film,
  RefreshCw
} from 'lucide-react';
import { PlaybackState, ReactionEvent, MomentMarker, SyncStatus } from '@watch-party/shared';
import { useDriftCorrection } from '../hooks/useDriftCorrection.js';

interface VideoPlayerProps {
  playback: PlaybackState;
  isHost: boolean;
  canControl: boolean;
  roomCode: string;
  markers: MomentMarker[];
  floatingReactions: ReactionEvent[];
  onCommand: (action: 'play' | 'pause' | 'seek' | 'rate_change', pos: number, opts?: { playbackRate?: number }) => void;
  onOpenMarkerModal: () => void;
  onOpenDiscovery?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playback,
  isHost,
  canControl,
  roomCode,
  markers,
  floatingReactions,
  onCommand,
  onOpenMarkerModal,
  onOpenDiscovery,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(playback.durationSeconds || 100);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isActuallyPlaying, setIsActuallyPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [hoveredPositionPct, setHoveredPositionPct] = useState<number>(0);
  const [centerAnimation, setCenterAnimation] = useState<'play' | 'pause' | null>(null);

  const controlsTimeoutRef = useRef<number | null>(null);

  // Drift Correction Engine Hook
  const { syncStatus, currentDriftMs } = useDriftCorrection({
    playback,
    videoRef,
    isBuffering,
    isHost,
    roomCode,
  });

  // Track playback status updates from server
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playback.mediaUrl) return;

    if (playback.status === 'playing') {
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setMediaError(null);
              setAutoplayBlocked(false);
            })
            .catch((err) => {
              if (err.name === 'NotAllowedError') {
                setAutoplayBlocked(true);
              } else {
                setMediaError(`Playback error: ${err.message || 'Stream blocked or unsupported'}`);
              }
            });
        }
      }
    } else if (playback.status === 'paused') {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [playback.status, playback.revision, playback.mediaUrl]);

  // Handle media URL change
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setMediaError(null);
    setAutoplayBlocked(false);

    if (playback.mediaUrl) {
      if (video.src !== playback.mediaUrl) {
        video.src = playback.mediaUrl;
        video.currentTime = playback.positionSeconds || 0;
        video.load();
      }
    } else {
      video.removeAttribute('src');
      video.load();
    }
  }, [playback.mediaUrl]);

  // Video element error listener
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const err = video.error;
    let message = 'Unable to play video source. Please check media availability or network connection.';
    if (err) {
      switch (err.code) {
        case 1:
          message = 'Media loading aborted by browser or network.';
          break;
        case 2:
          message = 'Network error occurred while downloading video.';
          break;
        case 3:
          message = 'Media decode error: Corrupted video or unsupported codec.';
          break;
        case 4:
          message = 'Video source not supported or URL inaccessible (HTTP 403/404).';
          break;
        default:
          message = err.message || message;
      }
    }
    setMediaError(message);
    setIsBuffering(false);
  };

  // Time update listener
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || playback.durationSeconds || 1);
      setMediaError(null);
    }
  };

  // User playback actions
  const togglePlay = useCallback(() => {
    if (!canControl) return;
    const video = videoRef.current;
    const nextAction = playback.status === 'playing' ? 'pause' : 'play';
    const pos = video ? video.currentTime : playback.positionSeconds;

    setCenterAnimation(nextAction === 'play' ? 'play' : 'pause');
    setTimeout(() => setCenterAnimation(null), 600);

    // Call video.play() / video.pause() directly inside user click handler to capture transient user activation
    if (video && playback.mediaUrl) {
      if (nextAction === 'play') {
        const p = video.play();
        if (p !== undefined) {
          p.then(() => {
            setMediaError(null);
            setAutoplayBlocked(false);
          }).catch((err) => {
            if (err.name === 'NotAllowedError') {
              setAutoplayBlocked(true);
            } else {
              setMediaError(`Play rejected: ${err.message}`);
            }
          });
        }
      } else {
        video.pause();
      }
    }

    onCommand(nextAction, pos);
  }, [canControl, playback.status, playback.positionSeconds, playback.mediaUrl, onCommand]);

  const handleSeek = (newTime: number) => {
    if (!canControl) return;
    const clamped = Math.max(0, Math.min(newTime, duration));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
    onCommand('seek', clamped);
  };

  const handleSkip = useCallback((seconds: number) => {
    if (!canControl) return;
    const current = videoRef.current ? videoRef.current.currentTime : currentTime;
    const clamped = Math.max(0, Math.min(current + seconds, duration));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
    onCommand('seek', clamped);
  }, [canControl, currentTime, duration, onCommand]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  }, [isMuted, volume]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard Navigation / Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          handleSkip(10);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen, handleSkip]);

  // Unblock autoplay
  const handleUnmuteAndSync = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = false;
    setIsMuted(false);
    videoRef.current.play().then(() => {
      setAutoplayBlocked(false);
      setMediaError(null);
    }).catch(() => {});
  };

  // Auto-hide controls
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (playback.status === 'playing') {
        setShowControls(false);
      }
    }, 3500);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    setHoveredPositionPct(pct * 100);
    setHoveredTime(pct * duration);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onMouseLeave={() => {
        setHoveredTime(null);
        if (playback.status === 'playing') setShowControls(false);
      }}
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800/90 group select-none ring-1 ring-white/5"
      tabIndex={0}
      aria-label="Video Player"
    >
      {/* HTML5 Native Video Element */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => {
          setIsBuffering(false);
          setMediaError(null);
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setIsActuallyPlaying(true);
          setMediaError(null);
        }}
        onPause={() => setIsActuallyPlaying(false)}
        onError={handleVideoError}
        onEnded={() => {
          if (canControl) onCommand('pause', duration);
        }}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
      />

      {/* No Media Loaded Placeholder */}
      {!playback.mediaUrl && (
        <div className="absolute inset-0 bg-cinematic-950 flex flex-col items-center justify-center z-25 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-3">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-white font-bold text-base sm:text-lg mb-1">No Video Loaded</h3>
          <p className="text-slate-400 text-xs sm:text-sm max-w-sm mb-5">
            {isHost
              ? 'Select a movie from the catalog or paste a direct video stream URL.'
              : 'Waiting for the host to select a title to watch together...'}
          </p>
          {isHost && onOpenDiscovery && (
            <button
              onClick={onOpenDiscovery}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-primary to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-brand-primary/30 transition transform hover:scale-105"
            >
              Browse Movie Catalog
            </button>
          )}
        </div>
      )}

      {/* Playback Error Overlay */}
      {mediaError && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-40 p-6 text-center animate-in fade-in">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mb-3 border border-rose-500/40">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">Stream Error</h3>
          <p className="text-slate-300 text-xs sm:text-sm max-w-md mb-5 leading-relaxed font-mono">
            {mediaError}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setMediaError(null);
                if (videoRef.current && playback.mediaUrl) {
                  videoRef.current.load();
                  if (playback.status === 'playing') {
                    videoRef.current.play().catch(() => {});
                  }
                }
              }}
              className="min-h-[44px] px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition border border-slate-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Stream</span>
            </button>
            {onOpenDiscovery && (
              <button
                onClick={onOpenDiscovery}
                className="min-h-[44px] px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-brand-primary/30 flex items-center gap-2"
              >
                <Film className="w-4 h-4" />
                <span>Choose Another Movie</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Center Action Splash Animation */}
      {centerAnimation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 animate-ping">
            {centerAnimation === 'play' ? (
              <Play className="w-8 h-8 fill-current ml-1" />
            ) : (
              <Pause className="w-8 h-8 fill-current" />
            )}
          </div>
        </div>
      )}

      {/* Autoplay Blocked Banner */}
      {autoplayBlocked && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-40 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary mb-4 animate-bounce border border-brand-primary/40 shadow-lg shadow-brand-primary/30">
            <Volume2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Browser Autoplay Blocked</h3>
          <p className="text-slate-300 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
            Your browser requires manual interaction before audio playback and live room synchronization can proceed.
          </p>
          <button
            onClick={handleUnmuteAndSync}
            className="min-h-[48px] px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-95 text-white font-bold rounded-xl shadow-xl shadow-brand-primary/40 transition transform hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>Click to Unmute &amp; Sync</span>
          </button>
        </div>
      )}

      {/* Floating Reaction Canvas Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            style={{
              left: `${(reaction.x ?? 0.5) * 100}%`,
              bottom: '15%',
            }}
            className="absolute text-4xl sm:text-5xl animate-float-up pointer-events-none drop-shadow-xl"
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* Top Overlay: Media Title & Sync Status Pill */}
      <div
        className={`absolute top-0 left-0 right-0 p-3 sm:p-5 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-30 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="bg-brand-primary/25 border border-brand-primary/40 px-2 py-0.5 rounded-lg text-[10px] font-bold text-brand-primary uppercase tracking-widest flex-shrink-0">
            {playback.mediaType}
          </div>
          <h2 className="text-white font-bold text-xs sm:text-base drop-shadow-md truncate max-w-[180px] sm:max-w-md">
            {playback.mediaTitle || 'Playing Video'}
          </h2>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold backdrop-blur-md border shadow-sm ${
              syncStatus === 'synced'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                : syncStatus === 'correcting'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/35 animate-pulse'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/35'
            }`}
            title={`Playback Drift: ${Math.abs(currentDriftMs)}ms`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="capitalize">{syncStatus}</span>
            <span className="text-[10px] text-slate-400 opacity-90 font-mono hidden sm:inline">
              ({Math.abs(currentDriftMs)}ms)
            </span>
          </div>

          {!canControl && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs bg-slate-800/80 text-slate-400 border border-slate-700">
              <Lock className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Host Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Center Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-14 h-14 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin shadow-lg" />
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 z-30 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Container with Touch-friendly Hit Area */}
        <div
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={() => setHoveredTime(null)}
          className="relative w-full mb-2 sm:mb-3 group/progress cursor-pointer py-2.5 sm:py-2"
        >
          {/* Hover Time Tooltip */}
          {hoveredTime !== null && (
            <div
              style={{ left: `${hoveredPositionPct}%` }}
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-cinematic-900 border border-slate-700 text-[11px] text-slate-200 font-mono shadow-md pointer-events-none whitespace-nowrap"
            >
              {formatTime(hoveredTime)}
            </div>
          )}

          {/* Moment Marker Pins */}
          {markers.map((marker) => {
            const pct = duration > 0 ? (marker.timestampSeconds / duration) * 100 : 0;
            return (
              <div
                key={marker.id}
                style={{ left: `${pct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canControl) handleSeek(marker.timestampSeconds);
                }}
                title={`Marker: ${marker.title} (${formatTime(marker.timestampSeconds)})`}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-amber-400 rounded-full shadow-md border-2 border-cinematic-950 cursor-pointer hover:scale-150 transition-transform z-10"
              />
            );
          })}

          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={currentTime}
            disabled={!canControl}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-2 sm:h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-brand-primary hover:h-2.5 transition-all"
            aria-label="Video scrubber"
          />
        </div>

        {/* Buttons Row with 44px Min Touch Targets */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={togglePlay}
              disabled={!canControl}
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl transition flex items-center justify-center ${
                canControl
                  ? 'hover:bg-white/10 active:scale-95 focus-visible:ring-1 focus-visible:ring-brand-primary'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              title={canControl ? (playback.status === 'playing' ? 'Pause (Space)' : 'Play (Space)') : 'Playback locked to host'}
              aria-label={playback.status === 'playing' ? 'Pause' : 'Play'}
            >
              {playback.status === 'playing' ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => handleSkip(-10)}
              disabled={!canControl}
              className="min-h-[44px] min-w-[44px] p-2 hover:bg-white/10 rounded-xl transition disabled:opacity-40 flex items-center justify-center"
              title="Skip back 10s (Left Arrow)"
              aria-label="Skip back 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSkip(10)}
              disabled={!canControl}
              className="min-h-[44px] min-w-[44px] p-2 hover:bg-white/10 rounded-xl transition disabled:opacity-40 flex items-center justify-center"
              title="Skip forward 10s (Right Arrow)"
              aria-label="Skip forward 10 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1 group/vol ml-0.5">
              <button
                onClick={toggleMute}
                className="min-h-[44px] min-w-[44px] p-2 hover:bg-white/10 rounded-xl transition flex items-center justify-center"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 text-slate-300" />
                ) : (
                  <Volume2 className="w-4 h-4 text-slate-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-primary opacity-80 group-hover/vol:opacity-100 transition hidden sm:inline-block"
                aria-label="Volume slider"
              />
            </div>

            {/* Time Stamp */}
            <span className="text-[11px] sm:text-xs text-slate-300 font-mono ml-1 sm:ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Add Moment Marker */}
            <button
              onClick={onOpenMarkerModal}
              className="min-h-[44px] px-2.5 py-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-amber-400 transition flex items-center gap-1.5 text-xs font-medium"
              title="Bookmark this scene"
            >
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Mark Scene</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="min-h-[44px] min-w-[44px] p-2 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white flex items-center justify-center"
              title="Fullscreen (F)"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
