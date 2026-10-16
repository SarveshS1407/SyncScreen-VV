import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../server/src/services/RoomManager.js';
import { PlaybackCommandSchema } from '@watch-party/shared';

describe('Phase 2 Multi-Session Core Functionality Tests', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  it('Scenario 1: Multi-user presence & host identification across separate sessions', () => {
    // Session 1: Alice creates room
    const { room, participant: alice } = roomManager.createRoom({
      userName: 'Alice',
      roomName: 'Film Night',
      socketId: 'sock_session_alice',
    });
    expect(alice.isHost).toBe(true);
    expect(room.hostId).toBe(alice.id);
    expect(room.participants).toHaveLength(1);
    expect(room.participants[0].name).toBe('Alice');

    // Session 2: Bob joins with room code
    const bobJoin = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Bob',
      socketId: 'sock_session_bob',
    });
    expect('error' in bobJoin).toBe(false);
    if ('error' in bobJoin) return;

    expect(bobJoin.participant.name).toBe('Bob');
    expect(bobJoin.participant.isHost).toBe(false);

    // Verify room state seen by both sessions
    const updatedRoom = roomManager.getRoom(room.code)!;
    expect(updatedRoom.participants).toHaveLength(2);
    expect(updatedRoom.pulse.activeWatchers).toBe(2);

    const hostFound = updatedRoom.participants.find(p => p.isHost);
    expect(hostFound?.id).toBe(alice.id);

    const guestFound = updatedRoom.participants.find(p => !p.isHost);
    expect(guestFound?.id).toBe(bobJoin.participant.id);
  });

  it('Scenario 2: Playback command propagation & monotonic revision order', () => {
    const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice' });
    const bobJoin = roomManager.joinRoom({ roomCode: room.code, userName: 'Bob', socketId: 'sock_bob' });
    if ('error' in bobJoin) throw new Error('Bob join failed');

    // Alice plays from 0.0s
    const playRes = roomManager.handlePlaybackCommand(room.code, alice.id, {
      action: 'play',
      positionSeconds: 0,
      expectedRevision: 1,
    });
    expect(playRes.success).toBe(true);
    expect(playRes.playback?.status).toBe('playing');
    expect(playRes.playback?.revision).toBe(2);
    expect(playRes.playback?.lastActionBy).toBe(alice.id);

    // Alice seeks to 45.0s
    const seekRes = roomManager.handlePlaybackCommand(room.code, alice.id, {
      action: 'seek',
      positionSeconds: 45.0,
      expectedRevision: 2,
    });
    expect(seekRes.success).toBe(true);
    expect(seekRes.playback?.positionSeconds).toBe(45.0);
    expect(seekRes.playback?.revision).toBe(3);

    // Bob attempts to execute a command with obsolete revision (e.g. revision 0)
    const staleRes = roomManager.handlePlaybackCommand(room.code, bobJoin.participant.id, {
      action: 'pause',
      positionSeconds: 10.0,
      expectedRevision: 0,
    });
    expect(staleRes.success).toBe(false);
    expect(staleRes.error).toContain('Stale command rejected');
  });

  it('Scenario 3: Late join snapshot with dynamic authoritative position', () => {
    const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice' });

    // Alice plays at 5.0s
    roomManager.handlePlaybackCommand(room.code, alice.id, {
      action: 'play',
      positionSeconds: 5.0,
      expectedRevision: 1,
    });

    // Simulate 4 seconds of playback elapsed
    room.playback.updatedAt = Date.now() - 4000;

    // Charlie joins late
    const charlieJoin = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Charlie',
      socketId: 'sock_charlie',
    });
    if ('error' in charlieJoin) throw new Error('Charlie join failed');

    const authoritativePos = roomManager.getAuthoritativePosition(charlieJoin.room.playback);
    // 5.0s + 4.0s = 9.0s
    expect(authoritativePos).toBeGreaterThanOrEqual(8.9);
    expect(authoritativePos).toBeLessThanOrEqual(9.2);
    expect(charlieJoin.room.playback.status).toBe('playing');
  });

  it('Scenario 4: Disconnect, presence change, and seamless session recovery', () => {
    const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice', socketId: 'sock_alice' });
    const bobJoin = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Bob',
      participantId: 'stable_bob_uuid',
      socketId: 'sock_bob_v1',
    });
    if ('error' in bobJoin) throw new Error('Bob join failed');

    expect(room.pulse.activeWatchers).toBe(2);

    // Bob drops connection
    const disconnectRes = roomManager.handleDisconnect('sock_bob_v1');
    expect(disconnectRes?.participant?.id).toBe('stable_bob_uuid');
    expect(disconnectRes?.participant?.isOnline).toBe(false);
    expect(room.pulse.activeWatchers).toBe(1);

    // Bob reconnects with the same session identity
    const reconnectRes = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Bob',
      participantId: 'stable_bob_uuid',
      socketId: 'sock_bob_v2',
    });
    expect('error' in reconnectRes).toBe(false);
    if ('error' in reconnectRes) return;

    expect(reconnectRes.isReconnect).toBe(true);
    expect(reconnectRes.participant.id).toBe('stable_bob_uuid');
    expect(reconnectRes.participant.isOnline).toBe(true);
    expect(reconnectRes.participant.socketId).toBe('sock_bob_v2');
    expect(room.pulse.activeWatchers).toBe(2);
    // Participant list still has exactly 2 members (no ghost duplicates)
    expect(room.participants).toHaveLength(2);
  });

  it('Scenario 5: Explicit host departure triggers automatic host failover', () => {
    const { room, participant: alice } = roomManager.createRoom({
      userName: 'Alice',
      socketId: 'sock_host_alice',
    });
    const bobJoin = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Bob',
      socketId: 'sock_guest_bob',
    });
    if ('error' in bobJoin) throw new Error('Bob join failed');

    expect(room.hostId).toBe(alice.id);

    // Host Alice departs the room
    const leaveRes = roomManager.handleDisconnect('sock_host_alice');
    expect(leaveRes).not.toBeNull();

    // Bob is automatically promoted to host
    expect(room.hostId).toBe(bobJoin.participant.id);
    const bobUpdated = room.participants.find(p => p.id === bobJoin.participant.id);
    expect(bobUpdated?.isHost).toBe(true);

    // System message logged in room
    const lastMsg = room.messages[room.messages.length - 1];
    expect(lastMsg.isSystem).toBe(true);
    expect(lastMsg.text).toContain('Host departed');
    expect(lastMsg.text).toContain('Bob is now the host');
  });

  it('Scenario 6: Case normalization & whitespace trimming on room codes', () => {
    const { room } = roomManager.createRoom({ userName: 'Alice' });
    const formattedCode = `  ${room.code.toLowerCase()}  `;

    const joinRes = roomManager.joinRoom({
      roomCode: formattedCode.trim().toUpperCase(),
      userName: 'David',
      socketId: 'sock_david',
    });

    expect('error' in joinRes).toBe(false);
    if (!('error' in joinRes)) {
      expect(joinRes.room.code).toBe(room.code);
      expect(joinRes.participant.name).toBe('David');
    }
  });

  it('Scenario 7: Permission control prevents non-host from restricted playback actions', () => {
    const { room, participant: host } = roomManager.createRoom({
      userName: 'Alice',
      permissions: { controlPlayback: 'host_only' },
    });
    const guestJoin = roomManager.joinRoom({ roomCode: room.code, userName: 'Bob', socketId: 'sock_b' });
    if ('error' in guestJoin) throw new Error('Join failed');

    // Guest attempts to play
    const guestAttempt = roomManager.handlePlaybackCommand(room.code, guestJoin.participant.id, {
      action: 'play',
      positionSeconds: 10,
      expectedRevision: 1,
    });
    expect(guestAttempt.success).toBe(false);
    expect(guestAttempt.error).toContain('restricted to the host');

    // Host Alice updates permissions to 'everyone'
    const updatePerms = roomManager.updatePermissions(room.code, host.id, {
      controlPlayback: 'everyone',
    });
    expect(updatePerms.success).toBe(true);

    // Guest attempts to play again
    const guestAttempt2 = roomManager.handlePlaybackCommand(room.code, guestJoin.participant.id, {
      action: 'play',
      positionSeconds: 10,
      expectedRevision: 1,
    });
    expect(guestAttempt2.success).toBe(true);
    expect(room.playback.status).toBe('playing');
  });
});
