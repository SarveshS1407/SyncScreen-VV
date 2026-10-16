import { describe, it, expect } from 'vitest';
import { PlaybackState } from '@watch-party/shared';

// Pure logic mirrors the client and server drift calculations
function calculateExpectedPosition(playback: PlaybackState, currentServerTime: number): number {
  if (playback.status !== 'playing') {
    return playback.positionSeconds;
  }
  const elapsedSeconds = Math.max(0, (currentServerTime - playback.updatedAt) / 1000);
  const targetPos = playback.positionSeconds + elapsedSeconds * playback.playbackRate;
  return playback.durationSeconds > 0 ? Math.min(targetPos, playback.durationSeconds) : targetPos;
}

function evaluateDriftCorrection(
  driftMs: number,
  playbackRate: number
): { action: 'none' | 'rate_adjust' | 'hard_seek'; appliedRate: number } {
  const absDrift = Math.abs(driftMs);
  if (absDrift <= 150) {
    return { action: 'none', appliedRate: playbackRate };
  } else if (absDrift <= 900) {
    const applied = driftMs > 0
      ? Math.max(0.85, playbackRate * 0.94) // ahead: slow down
      : Math.min(1.25, playbackRate * 1.06); // behind: speed up
    return { action: 'rate_adjust', appliedRate: applied };
  } else {
    return { action: 'hard_seek', appliedRate: playbackRate };
  }
}

describe('Playback State & Drift Correction Logic', () => {
  it('correctly calculates expected position for paused video', () => {
    const playback: PlaybackState = {
      mediaId: 'test-1',
      mediaUrl: 'https://example.com/video.mp4',
      mediaTitle: 'Test',
      mediaType: 'mp4',
      status: 'paused',
      positionSeconds: 42.5,
      durationSeconds: 600,
      playbackRate: 1.0,
      updatedAt: 1000000,
      revision: 1,
      lastActionBy: 'user-1',
    };

    // 10 seconds later, position should remain unchanged
    const expected = calculateExpectedPosition(playback, 1010000);
    expect(expected).toBe(42.5);
  });

  it('correctly calculates expected position for playing video with elapsed server time', () => {
    const playback: PlaybackState = {
      mediaId: 'test-1',
      mediaUrl: 'https://example.com/video.mp4',
      mediaTitle: 'Test',
      mediaType: 'mp4',
      status: 'playing',
      positionSeconds: 10.0,
      durationSeconds: 600,
      playbackRate: 1.0,
      updatedAt: 1000000,
      revision: 1,
      lastActionBy: 'user-1',
    };

    // 5.5 seconds later at 1.0x rate
    const expected = calculateExpectedPosition(playback, 1005500);
    expect(expected).toBeCloseTo(15.5, 2);
  });

  it('accounts for non-standard playback rate in expected position', () => {
    const playback: PlaybackState = {
      mediaId: 'test-1',
      mediaUrl: 'https://example.com/video.mp4',
      mediaTitle: 'Test',
      mediaType: 'mp4',
      status: 'playing',
      positionSeconds: 10.0,
      durationSeconds: 600,
      playbackRate: 1.5,
      updatedAt: 1000000,
      revision: 1,
      lastActionBy: 'user-1',
    };

    // 4 seconds elapsed at 1.5x rate = 6 seconds of video progress
    const expected = calculateExpectedPosition(playback, 1004000);
    expect(expected).toBeCloseTo(16.0, 2);
  });

  it('clamps expected position to durationSeconds', () => {
    const playback: PlaybackState = {
      mediaId: 'test-1',
      mediaUrl: 'https://example.com/video.mp4',
      mediaTitle: 'Test',
      mediaType: 'mp4',
      status: 'playing',
      positionSeconds: 595.0,
      durationSeconds: 600.0,
      playbackRate: 1.0,
      updatedAt: 1000000,
      revision: 1,
      lastActionBy: 'user-1',
    };

    // 20 seconds elapsed would exceed 600, must clamp to 600
    const expected = calculateExpectedPosition(playback, 1020000);
    expect(expected).toBe(600.0);
  });

  it('evaluates drift <= 150ms as synced with nominal playback rate', () => {
    const result = evaluateDriftCorrection(80, 1.0);
    expect(result.action).toBe('none');
    expect(result.appliedRate).toBe(1.0);
  });

  it('applies gentle rate reduction when local is moderately ahead (150ms < drift <= 900ms)', () => {
    const result = evaluateDriftCorrection(400, 1.0);
    expect(result.action).toBe('rate_adjust');
    expect(result.appliedRate).toBeLessThan(1.0);
  });

  it('applies gentle rate acceleration when local is moderately behind', () => {
    const result = evaluateDriftCorrection(-400, 1.0);
    expect(result.action).toBe('rate_adjust');
    expect(result.appliedRate).toBeGreaterThan(1.0);
  });

  it('triggers hard seek for large deviations > 900ms', () => {
    const result = evaluateDriftCorrection(1800, 1.0);
    expect(result.action).toBe('hard_seek');
  });
});
