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
  Bookmark
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
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(playback.durationSeconds || 100);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);
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
    if (!video) return;

    if (playback.status === 'playing') {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name === 'NotAllowedError') {
            setAutoplayBlocked(true);
          }
        });
      }
    } else if (playback.status === 'paused') {
      video.pause();
    }
  }, [playback.status, playback.revision]);

  // Handle media URL change
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.src !== playback.mediaUrl) {
      video.src = playback.mediaUrl;
      video.currentTime = playback.positionSeconds;
      video.load();
    }
  }, [playback.mediaUrl]);

  // Time update listener
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || playback.durationSeconds || 1);
    }
  };

  // User playback actions
  const togglePlay = useCallback(() => {
    if (!canControl) return;
    const nextAction = playback.status === 'playing' ? 'pause' : 'play';
    const pos = videoRef.current ? videoRef.current.currentTime : playback.positionSeconds;

    setCenterAnimation(nextAction === 'play' ? 'play' : 'pause');
    setTimeout(() => setCenterAnimation(null), 600);

    onCommand(nextAction, pos);
  }, [canControl, playback.status, playback.positionSeconds, onCommand]);

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
      // Don't trigger hotkeys if user is typing in input or textarea
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
    }).catch(() => {});
  };

  // Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (playback.status === 'playing') {
        setShowControls(false);
      }
    }, 3000);
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
      onMouseMove={handleMouseMove}
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
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
      />

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
          <h3 className="text-xl font-bold text-white mb-2">Browser Autoplay Blocked</h3>
          <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed">
            Your browser requires manual interaction before audio playback and live room synchronization can proceed.
          </p>
          <button
            onClick={handleUnmuteAndSync}
            className="px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-95 text-white font-bold rounded-xl shadow-xl shadow-brand-primary/40 transition transform hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
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
        className={`absolute top-0 left-0 right-0 p-4 sm:p-5 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-30 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-brand-primary/25 border border-brand-primary/40 px-2.5 py-1 rounded-lg text-[10px] font-bold text-brand-primary uppercase tracking-widest flex-shrink-0">
            {playback.mediaType}
          </div>
          <h2 className="text-white font-bold text-sm sm:text-base drop-shadow-md truncate max-w-xs sm:max-w-md">
            {playback.mediaTitle || 'Playing Video'}
          </h2>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border shadow-sm ${
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
            <span className="text-[10px] text-slate-400 opacity-90 font-mono">
              ({Math.abs(currentDriftMs)}ms)
            </span>
          </div>

          {!canControl && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-800/80 text-slate-400 border border-slate-700">
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
        className={`absolute bottom-0 left-0 right-0 p-4 sm:p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 z-30 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Scrubber Container with Hover Tooltip */}
        <div
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={() => setHoveredTime(null)}
          className="relative w-full mb-3 group/progress cursor-pointer py-1.5"
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
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400 rounded-full shadow-md border-2 border-cinematic-950 cursor-pointer hover:scale-150 transition-transform z-10"
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
            className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-brand-primary hover:h-2.5 transition-all"
            aria-label="Video scrubber"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              disabled={!canControl}
              className={`p-2 rounded-xl transition ${
                canControl
                  ? 'hover:bg-white/10 active:scale-95 focus-visible:ring-1'
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
              className="p-1.5 hover:bg-white/10 rounded-lg transition disabled:opacity-40"
              title="Skip back 10s (Left Arrow)"
              aria-label="Skip back 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSkip(10)}
              disabled={!canControl}
              className="p-1.5 hover:bg-white/10 rounded-lg transition disabled:opacity-40"
              title="Skip forward 10s (Right Arrow)"
              aria-label="Skip forward 10 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol ml-1">
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
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
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-primary opacity-80 group-hover/vol:opacity-100 transition"
                aria-label="Volume slider"
              />
            </div>

            {/* Time Stamp */}
            <span className="text-xs text-slate-300 font-mono ml-2 hidden sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Moment Marker */}
            <button
              onClick={onOpenMarkerModal}
              className="px-2.5 py-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-amber-400 transition flex items-center gap-1.5 text-xs font-medium"
              title="Bookmark this scene"
            >
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Mark Scene</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"
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
