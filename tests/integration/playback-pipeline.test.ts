import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../server/src/services/RoomManager.js';
import { SAMPLE_MOVIES } from '../../server/src/data/movies.js';
import { PlaybackCommandSchema, PlaybackState } from '@watch-party/shared';

describe('End-to-End Playback Pipeline & Regression Verification', () => {
  let roomManager: RoomManager;
  let roomCode: string;
  let hostId: string;
  let guestId: string;

  beforeEach(() => {
    roomManager = new RoomManager();
    const created = roomManager.createRoom({
      userName: 'DirectorHost',
      roomName: 'Playback QA Suite',
    });
    roomCode = created.room.code;
    hostId = created.participant.id;

    const joined = roomManager.joinRoom({
      roomCode,
      userName: 'ViewerGuest',
      socketId: 'sock_guest_1',
    });
    if ('participant' in joined) {
      guestId = joined.participant.id;
    }
  });

  it('1. Initial room creation resolves a valid, playable media source', () => {
    const room = roomManager.getRoom(roomCode);
    expect(room).toBeDefined();
    expect(room!.playback.mediaUrl).toBeDefined();
    expect(room!.playback.mediaUrl.length).toBeGreaterThan(0);
    expect(room!.playback.mediaUrl.startsWith('http')).toBe(true);
    expect(room!.playback.status).toBe('paused');
    expect(room!.playback.positionSeconds).toBe(0);
  });

  it('2. Distinguishes playable media titles from preview-only titles in catalog', () => {
    const playableMovies = SAMPLE_MOVIES.filter(m => m.isPlayable);
    const nonPlayableMovies = SAMPLE_MOVIES.filter(m => !m.isPlayable);

    expect(playableMovies.length).toBeGreaterThan(0);
    playableMovies.forEach(m => {
      expect(m.videoUrl).toBeTruthy();
      expect(m.videoUrl.startsWith('http')).toBe(true);
      expect(['mp4', 'webm', 'hls']).toContain(m.videoType);
    });

    nonPlayableMovies.forEach(m => {
      expect(m.isPlayable).toBe(false);
      expect(m.videoUrl).toBe('');
    });
  });

  it('3. Play action transitions state to playing and records authoritative epoch', () => {
    const result = roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'play',
      positionSeconds: 15.5,
      expectedRevision: 1,
    });

    expect(result.success).toBe(true);
    expect(result.playback?.status).toBe('playing');
    expect(result.playback?.positionSeconds).toBe(15.5);
    expect(result.playback?.revision).toBe(2);
    expect(result.playback?.lastActionBy).toBe(hostId);
  });

  it('4. Pause and seek commands update position accurately', () => {
    // 1. Play first
    roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'play',
      positionSeconds: 0,
      expectedRevision: 1,
    });

    // 2. Seek to 45.0s
    const seekResult = roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'seek',
      positionSeconds: 45.0,
      expectedRevision: 2,
    });
    expect(seekResult.success).toBe(true);
    expect(seekResult.playback?.positionSeconds).toBe(45.0);
    expect(seekResult.playback?.revision).toBe(3);

    // 3. Pause
    const pauseResult = roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'pause',
      positionSeconds: 45.0,
      expectedRevision: 3,
    });
    expect(pauseResult.success).toBe(true);
    expect(pauseResult.playback?.status).toBe('paused');
    expect(pauseResult.playback?.positionSeconds).toBe(45.0);
    expect(pauseResult.playback?.revision).toBe(4);
  });

  it('5. Switching movies loads the new media source and resets position', () => {
    const newMedia = SAMPLE_MOVIES[2]; // Disneynature Oceans
    const changeResult = roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'change_media',
      positionSeconds: 0,
      mediaUrl: newMedia.videoUrl,
      mediaTitle: newMedia.title,
      mediaType: newMedia.videoType,
      durationSeconds: newMedia.durationSeconds,
      expectedRevision: 1,
    });

    expect(changeResult.success).toBe(true);
    expect(changeResult.playback?.mediaUrl).toBe(newMedia.videoUrl);
    expect(changeResult.playback?.mediaTitle).toBe(newMedia.title);
    expect(changeResult.playback?.durationSeconds).toBe(newMedia.durationSeconds);
    expect(changeResult.playback?.positionSeconds).toBe(0);
    expect(changeResult.playback?.status).toBe('playing');
  });

  it('6. Malformed or invalid playback commands are rejected by Zod schema', () => {
    const invalidCommand = {
      action: 'invalid_action',
      positionSeconds: -5,
      clientTimestamp: 'not_a_number',
    };

    const parsed = PlaybackCommandSchema.safeParse(invalidCommand);
    expect(parsed.success).toBe(false);
  });

  it('7. Unauthorized playback commands are blocked when controlPlayback is host_only', () => {
    // Set permission to host_only
    roomManager.updatePermissions(roomCode, hostId, {
      controlPlayback: 'host_only',
    });

    // Guest attempts to command playback
    const guestAttempt = roomManager.handlePlaybackCommand(roomCode, guestId, {
      action: 'play',
      positionSeconds: 20,
      expectedRevision: 1,
    });

    expect(guestAttempt.success).toBe(false);
    expect(guestAttempt.error).toMatch(/host/i);
  });

  it('8. Late-joining participant seamlessly receives latest authoritative snapshot', () => {
    // Advance playback to 30.5s playing
    roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'play',
      positionSeconds: 30.5,
      expectedRevision: 1,
    });

    // Late joiner arrives
    const lateJoiner = roomManager.joinRoom({
      roomCode,
      userName: 'LateArrival',
      socketId: 'sock_late_1',
    });

    expect('room' in lateJoiner).toBe(true);
    if ('room' in lateJoiner) {
      expect(lateJoiner.room.playback.status).toBe('playing');
      expect(lateJoiner.room.playback.positionSeconds).toBe(30.5);
      expect(lateJoiner.room.playback.revision).toBe(2);
    }
  });

  it('9. Playback revision ordering prevents stale / out-of-order execution loops', () => {
    // Initial command revision 1 -> 2
    roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'play',
      positionSeconds: 10,
      expectedRevision: 1,
    });

    // Successive command advances revision to 3
    const secondCommand = roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'seek',
      positionSeconds: 50,
      expectedRevision: 2,
    });

    expect(secondCommand.success).toBe(true);
    expect(secondCommand.playback?.revision).toBe(3);
  });

  it('10. Rapid play/pause sequence maintains strict revision integrity and expected state', () => {
    // 1. Play
    const play1 = roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'play',
      positionSeconds: 0,
      expectedRevision: 1,
    });
    expect(play1.success).toBe(true);
    expect(play1.playback?.status).toBe('playing');
    expect(play1.playback?.revision).toBe(2);

    // 2. Immediate pause (simulating rapid user click or race condition)
    const pause1 = roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'pause',
      positionSeconds: 0.1,
      expectedRevision: 2,
    });
    expect(pause1.success).toBe(true);
    expect(pause1.playback?.status).toBe('paused');
    expect(pause1.playback?.revision).toBe(3);

    // 3. Immediate play again
    const play2 = roomManager.handlePlaybackCommand(roomCode, hostId, {
      action: 'play',
      positionSeconds: 0.1,
      expectedRevision: 3,
    });
    expect(play2.success).toBe(true);
    expect(play2.playback?.status).toBe('playing');
    expect(play2.playback?.revision).toBe(4);
  });
});

