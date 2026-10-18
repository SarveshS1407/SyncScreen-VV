import { useEffect, useRef, useState, useCallback } from 'react';
import { PlaybackState, SyncStatus, DriftDiagnostic } from '@watch-party/shared';
import { socketService } from '../services/socket.js';

interface UseDriftCorrectionProps {
  playback: PlaybackState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isBuffering: boolean;
  isHost: boolean;
  roomCode: string;
  participantId?: string;
  onHardSeek?: (targetPos: number) => void;
}

export function useDriftCorrection({
  playback,
  videoRef,
  isBuffering,
  isHost,
  roomCode,
  participantId,
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
      // Do not fight the browser while it is buffering, seeking, or has insufficient data (readyState < 3)
      if (!vid || isBuffering || vid.seeking || vid.readyState < 3) {
        if (isBuffering || (vid && vid.readyState < 3)) {
          setSyncStatus('buffering');
        }
        return;
      }

      // If server playback is paused, record drift; do not call vid.pause() here to avoid race conditions with user gestures
      if (playback.status === 'paused') {
        const drift = (vid.currentTime - playback.positionSeconds) * 1000;
        setCurrentDriftMs(Math.round(drift));
        // Only reconcile position if video is already paused, not host, and drift is substantial (> 800ms)
        if (!isHost && vid.paused && Math.abs(drift) > 800) {
          vid.currentTime = playback.positionSeconds;
        }
        setSyncStatus('synced');

        // Report heartbeat with current position
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
          socket.emit('report_drift', {
            roomCode,
            participantId,
            driftMs: 0,
            rttMs: socketService.getLastRtt(),
            hadCorrection: false,
            positionSeconds: Math.round(vid.currentTime * 10) / 10,
          });
        }
        return;
      }

      // Host is authoritative: Host never hard-seeks or adjusts rate against its own clock
      if (isHost) {
        setCurrentDriftMs(0);
        setSyncStatus('synced');
        if (isGentleAdjustingRef.current) {
          vid.playbackRate = playback.playbackRate;
          isGentleAdjustingRef.current = false;
        }

        const socket = socketService.getSocket();
        if (socket && socket.connected) {
          socket.emit('report_drift', {
            roomCode,
            participantId,
            driftMs: 0,
            rttMs: socketService.getLastRtt(),
            hadCorrection: false,
            positionSeconds: Math.round(vid.currentTime * 10) / 10,
          });
        }
        return;
      }

      // Guest / Non-host playback drift calculation
      const expectedPos = calculateExpectedPosition();
      const currentPos = vid.currentTime;
      // Drift = local time - expected server time (in milliseconds)
      // Positive: local is ahead of server. Negative: local is behind server.
      const driftSeconds = currentPos - expectedPos;
      const driftMs = Math.round(driftSeconds * 1000);
      const absDriftMs = Math.abs(driftMs);

      setCurrentDriftMs(driftMs);

      const now = Date.now();
      let action: 'none' | 'rate_adjust' | 'hard_seek' = 'none';
      let appliedRate = playback.playbackRate;

      // Threshold evaluation tuned to eliminate buffering loops:
      // Zone 1: <= 250ms -> In sync, nominal playback rate
      if (absDriftMs <= 250) {
        if (isGentleAdjustingRef.current) {
          vid.playbackRate = playback.playbackRate;
          isGentleAdjustingRef.current = false;
        }
        setSyncStatus('synced');
        consecutiveDriftCountRef.current = 0;
      }
      // Zone 2: 250ms - 1800ms -> Gentle rate adjustment (imperceptible pitch variation, zero buffering)
      else if (absDriftMs <= 1800) {
        consecutiveDriftCountRef.current++;
        setSyncStatus('correcting');
        action = 'rate_adjust';

        if (driftMs > 0) {
          // Local is ahead: slow down slightly
          appliedRate = Math.max(0.92, playback.playbackRate * 0.95);
        } else {
          // Local is behind: speed up slightly
          appliedRate = Math.min(1.08, playback.playbackRate * 1.05);
        }

        vid.playbackRate = appliedRate;
        isGentleAdjustingRef.current = true;
        setCorrectionCount(c => c + 1);
      }
      // Zone 3: > 1800ms -> Controlled Hard Seek with strict persistence and cooldown guards
      else {
        consecutiveDriftCountRef.current++;
        setSyncStatus('correcting');

        // Only allow hard seek if:
        // 1. Drift has persisted for at least 3 consecutive cycles (3 seconds)
        // 2. At least 4000ms has elapsed since the last hard seek
        // 3. The video is not currently paused or trying to buffer
        if (consecutiveDriftCountRef.current >= 3 && now - lastHardSeekTimeRef.current > 4000) {
          action = 'hard_seek';
          lastHardSeekTimeRef.current = now;
          consecutiveDriftCountRef.current = 0;
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

      // Report to server for room health tracking and timeline positions
      const socket = socketService.getSocket();
      if (socket && socket.connected) {
        socket.emit('report_drift', {
          roomCode,
          participantId,
          driftMs,
          rttMs: diagnostic.rttMs,
          hadCorrection: action !== 'none',
          positionSeconds: Math.round(currentPos * 10) / 10,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playback, calculateExpectedPosition, isBuffering, isHost, roomCode, participantId, onHardSeek]);

  return {
    syncStatus,
    currentDriftMs,
    recentDiagnostics,
    correctionCount,
    calculateExpectedPosition,
  };
}
