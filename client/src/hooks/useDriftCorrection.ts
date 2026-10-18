import { useEffect, useRef, useState, useCallback } from 'react';
import { PlaybackState, SyncStatus, DriftDiagnostic } from '@watch-party/shared';
import { socketService } from '../services/socket.js';

interface UseDriftCorrectionProps {
  playback: PlaybackState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isBuffering: boolean;
  isHost: boolean;
  roomCode: string;
  onHardSeek?: (targetPos: number) => void;
}

export function useDriftCorrection({
  playback,
  videoRef,
  isBuffering,
  roomCode,
  onHardSeek,
}: UseDriftCorrectionProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [currentDriftMs, setCurrentDriftMs] = useState<number>(0);
  const [recentDiagnostics, setRecentDiagnostics] = useState<DriftDiagnostic[]>([]);
  const [correctionCount, setCorrectionCount] = useState<number>(0);

  // Anti-looping cooldown guards
  const lastHardSeekTimeRef = useRef<number>(0);
  const isGentleAdjustingRef = useRef<boolean>(false);
  const consecutiveDriftCountRef = useRef<number>(0);

  /**
   * Calculate expected server-authoritative playback position
   */
  const calculateExpectedPosition = useCallback((): number => {
    if (playback.status !== 'playing') {
      return playback.positionSeconds;
    }

    const estimatedServerNow = socketService.getEstimatedServerTime();
    const elapsedSeconds = Math.max(0, (estimatedServerNow - playback.updatedAt) / 1000);
    const targetPos = playback.positionSeconds + elapsedSeconds * playback.playbackRate;

    return playback.durationSeconds > 0
      ? Math.min(targetPos, playback.durationSeconds)
      : targetPos;
  }, [playback]);

  /**
   * Core continuous reconciliation loop
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check reconciliation every 1000ms
    const interval = window.setInterval(() => {
      const vid = videoRef.current;
      if (!vid || isBuffering || vid.seeking || vid.readyState < 2) {
        if (isBuffering) setSyncStatus('buffering');
        return;
      }

      // If server playback is paused, record drift; do not call vid.pause() here to avoid race conditions with user play gestures
      if (playback.status === 'paused') {
        const drift = (vid.currentTime - playback.positionSeconds) * 1000;
        setCurrentDriftMs(Math.round(drift));
        // Only reconcile position if video is already paused and drift is substantial (> 500ms)
        if (vid.paused && Math.abs(drift) > 500) {
          vid.currentTime = playback.positionSeconds;
        }
        setSyncStatus('synced');
        return;
      }

      // If server playback is playing, check drift
      const expectedPos = calculateExpectedPosition();
      const currentPos = vid.currentTime;
      // Drift = local time - expected server time (in milliseconds)
      // Positive drift: local is ahead of server
      // Negative drift: local is behind server
      const driftSeconds = currentPos - expectedPos;
      const driftMs = Math.round(driftSeconds * 1000);
      const absDriftMs = Math.abs(driftMs);

      setCurrentDriftMs(driftMs);

      const now = Date.now();
      let action: 'none' | 'rate_adjust' | 'hard_seek' = 'none';
      let appliedRate = playback.playbackRate;

      // Threshold evaluation:
      // Zone 1: < 150ms -> Fully synced, nominal rate
      if (absDriftMs <= 150) {
        if (isGentleAdjustingRef.current) {
          vid.playbackRate = playback.playbackRate;
          isGentleAdjustingRef.current = false;
        }
        setSyncStatus('synced');
        consecutiveDriftCountRef.current = 0;
      }
      // Zone 2: 150ms - 900ms -> Gentle rate adjustment (imperceptible audio pitch variation)
      else if (absDriftMs <= 900) {
        consecutiveDriftCountRef.current++;
        setSyncStatus('correcting');
        action = 'rate_adjust';

        if (driftMs > 0) {
          // Local is ahead: slow down slightly
          appliedRate = Math.max(0.85, playback.playbackRate * 0.94);
        } else {
          // Local is behind: speed up slightly
          appliedRate = Math.min(1.25, playback.playbackRate * 1.06);
        }

        vid.playbackRate = appliedRate;
        isGentleAdjustingRef.current = true;
        setCorrectionCount(c => c + 1);
      }
      // Zone 3: > 900ms -> Controlled Hard Seek with anti-thrashing cooldown
      else {
        consecutiveDriftCountRef.current++;
        setSyncStatus('correcting');
        action = 'hard_seek';

        // Only allow hard seek if at least 1500ms has elapsed since the last hard seek
        if (now - lastHardSeekTimeRef.current > 1500) {
          lastHardSeekTimeRef.current = now;
          vid.currentTime = expectedPos;
          vid.playbackRate = playback.playbackRate;
          isGentleAdjustingRef.current = false;
          setCorrectionCount(c => c + 1);
          if (onHardSeek) onHardSeek(expectedPos);
        }
      }

      // Record diagnostic
      const diagnostic: DriftDiagnostic = {
        driftMs,
        localPos: currentPos,
        serverTargetPos: expectedPos,
        rttMs: socketService.getLastRtt(),
        correctionAction: action,
        appliedRate: vid.playbackRate,
        timestamp: now,
      };

      setRecentDiagnostics(prev => [diagnostic, ...prev.slice(0, 19)]);

      // Report to server for room health tracking
      const socket = socketService.getSocket();
      if (socket && socket.connected) {
        socket.emit('report_drift', {
          roomCode,
          driftMs,
          rttMs: diagnostic.rttMs,
          hadCorrection: action !== 'none',
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playback, calculateExpectedPosition, isBuffering, roomCode, onHardSeek]);

  return {
    syncStatus,
    currentDriftMs,
    recentDiagnostics,
    correctionCount,
    calculateExpectedPosition,
  };
}
