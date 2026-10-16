import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../server/src/services/RoomManager.js';

describe('Room Lifecycle & Real-Time Sync Service', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  it('creates a room with unique code, host participant, and initial playback state', () => {
    const { room, participant } = roomManager.createRoom({
      userName: 'Alice',
      roomName: "Alice's Lounge",
    });

    expect(room.code).toBeDefined();
    expect(room.code.length).toBeGreaterThan(6);
    expect(room.hostId).toBe(participant.id);
    expect(participant.isHost).toBe(true);
    expect(participant.name).toBe('Alice');
    expect(room.participants).toHaveLength(1);
    expect(room.playback.status).toBe('paused');
    expect(room.playback.revision).toBe(1);
    expect(room.queue.length).toBeGreaterThan(0);
  });

  it('allows a second participant to join the room', () => {
    const { room } = roomManager.createRoom({ userName: 'Alice' });
    const joinRes = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Bob',
      socketId: 'socket_bob_1',
    });

    expect('error' in joinRes).toBe(false);
    if (!('error' in joinRes)) {
      expect(joinRes.participant.name).toBe('Bob');
      expect(joinRes.participant.isHost).toBe(false);
      expect(joinRes.room.participants).toHaveLength(2);
      expect(joinRes.isReconnect).toBe(false);
    }
  });

  it('handles participant reconnection cleanly with the same session ID', () => {
    const { room } = roomManager.createRoom({ userName: 'Alice' });
    const joinRes = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Bob',
      participantId: 'user_bob_stable_id',
      socketId: 'socket_bob_1',
    });

    if ('error' in joinRes) throw new Error('Join failed');

    // Bob disconnects
    roomManager.handleDisconnect('socket_bob_1');
    const bobAfterLeave = room.participants.find(p => p.id === 'user_bob_stable_id');
    expect(bobAfterLeave?.isOnline).toBe(false);

    // Bob reconnects with a new socket ID
    const reconnectRes = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Bob',
      participantId: 'user_bob_stable_id',
      socketId: 'socket_bob_2',
    });

    if ('error' in reconnectRes) throw new Error('Reconnect failed');
    expect(reconnectRes.isReconnect).toBe(true);
    expect(reconnectRes.participant.isOnline).toBe(true);
    expect(reconnectRes.participant.socketId).toBe('socket_bob_2');
    expect(room.participants.filter(p => p.id === 'user_bob_stable_id')).toHaveLength(1);
  });

  it('authoritatively handles Play, Pause, and Seek commands with revision increments', () => {
    const { room, participant } = roomManager.createRoom({ userName: 'Alice' });

    // Execute Play
    const playRes = roomManager.handlePlaybackCommand(room.code, participant.id, {
      action: 'play',
      positionSeconds: 0,
      expectedRevision: 1,
    });

    expect(playRes.success).toBe(true);
    expect(playRes.playback?.status).toBe('playing');
    expect(playRes.playback?.revision).toBe(2);

    // Execute Seek
    const seekRes = roomManager.handlePlaybackCommand(room.code, participant.id, {
      action: 'seek',
      positionSeconds: 120.5,
      expectedRevision: 2,
    });

    expect(seekRes.success).toBe(true);
    expect(seekRes.playback?.positionSeconds).toBe(120.5);
    expect(seekRes.playback?.revision).toBe(3);
  });

  it('rejects stale commands with out-of-order expectedRevision', () => {
    const { room, participant } = roomManager.createRoom({ userName: 'Alice' });

    // Advance revision to 5
    for (let i = 1; i < 5; i++) {
      roomManager.handlePlaybackCommand(room.code, participant.id, {
        action: 'seek',
        positionSeconds: i * 10,
        expectedRevision: i,
      });
    }

    expect(room.playback.revision).toBe(5);

    // Attempt to execute an old command expecting revision 1
    const staleRes = roomManager.handlePlaybackCommand(room.code, participant.id, {
      action: 'play',
      positionSeconds: 0,
      expectedRevision: 1,
    });

    expect(staleRes.success).toBe(false);
    expect(staleRes.error).toContain('Stale command rejected');
  });

  it('enforces host-only permissions when configured', () => {
    const { room, participant: host } = roomManager.createRoom({
      userName: 'Alice',
      permissions: { controlPlayback: 'host_only' },
    });

    const bobJoin = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Bob',
      socketId: 'sock_bob',
    });
    if ('error' in bobJoin) throw new Error('Join failed');

    // Bob attempts to play
    const bobPlay = roomManager.handlePlaybackCommand(room.code, bobJoin.participant.id, {
      action: 'play',
      positionSeconds: 0,
      expectedRevision: 1,
    });

    expect(bobPlay.success).toBe(false);
    expect(bobPlay.error).toContain('Playback control is restricted to the host');

    // Host Alice plays successfully
    const hostPlay = roomManager.handlePlaybackCommand(room.code, host.id, {
      action: 'play',
      positionSeconds: 0,
      expectedRevision: 1,
    });
    expect(hostPlay.success).toBe(true);
  });

  it('automatically elects a new host if the current host disconnects', () => {
    const { room, participant: host } = roomManager.createRoom({ userName: 'Alice', socketId: 'sock_alice' });
    const bobJoin = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Bob',
      socketId: 'sock_bob',
    });
    if ('error' in bobJoin) throw new Error('Join failed');

    // Host Alice disconnects
    roomManager.handleDisconnect(host.socketId);

    // Bob should now be elected host
    expect(room.hostId).toBe(bobJoin.participant.id);
    const bobInRoom = room.participants.find(p => p.id === bobJoin.participant.id);
    expect(bobInRoom?.isHost).toBe(true);
  });

  it('creates polls, collects votes, and prevents duplicate votes per user', () => {
    const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice' });
    const bobJoin = roomManager.joinRoom({ roomCode: room.code, userName: 'Bob', socketId: 'b' });
    if ('error' in bobJoin) throw new Error('Join failed');

    // Create poll
    const pollRes = roomManager.createPoll(room.code, alice.id, {
      question: 'Which movie next?',
      options: ['Sintel', 'Big Buck Bunny'],
    });

    expect(pollRes.success).toBe(true);
    const opt1 = pollRes.poll!.options[0].id;
    const opt2 = pollRes.poll!.options[1].id;

    // Bob votes for opt1
    roomManager.votePoll(room.code, bobJoin.participant.id, opt1);
    expect(room.activePoll?.options[0].votes).toContain(bobJoin.participant.id);

    // Bob changes vote to opt2
    roomManager.votePoll(room.code, bobJoin.participant.id, opt2);
    expect(room.activePoll?.options[0].votes).not.toContain(bobJoin.participant.id);
    expect(room.activePoll?.options[1].votes).toContain(bobJoin.participant.id);
  });
});
