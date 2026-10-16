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

  it('normalizes room code casing and allows join with lowercase codes', () => {
    const { room } = roomManager.createRoom({ userName: 'HostAlice' });
    const lowerCode = room.code.toLowerCase();

    const joinRes = roomManager.joinRoom({
      roomCode: lowerCode,
      userName: 'GuestBob',
      socketId: 'sock_bob_lower',
    });

    expect('error' in joinRes).toBe(false);
    if (!('error' in joinRes)) {
      expect(joinRes.room.code).toBe(room.code);
      expect(joinRes.participant.name).toBe('GuestBob');
    }
  });

  it('gracefully rejects invalid room codes with descriptive error', () => {
    const joinRes = roomManager.joinRoom({
      roomCode: 'NON-EXISTENT-999',
      userName: 'LostUser',
      socketId: 'sock_lost',
    });

    expect('error' in joinRes).toBe(true);
    if ('error' in joinRes) {
      expect(joinRes.error).toContain('not found');
      expect(joinRes.error).toContain('Please check your code');
    }
  });

  it('supports explicit host transfer and rejects unauthorized transfer requests', () => {
    const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice' });
    const bobJoin = roomManager.joinRoom({ roomCode: room.code, userName: 'Bob', socketId: 'b' });
    if ('error' in bobJoin) throw new Error('Join failed');

    // Bob (not host) attempts to transfer host to himself
    const unauthorized = roomManager.transferHost(room.code, bobJoin.participant.id, bobJoin.participant.id);
    expect(unauthorized.success).toBe(false);
    expect(unauthorized.error).toContain('Only the current host can transfer host privileges');

    // Alice (host) transfers host to Bob
    const authorized = roomManager.transferHost(room.code, alice.id, bobJoin.participant.id);
    expect(authorized.success).toBe(true);
    expect(room.hostId).toBe(bobJoin.participant.id);
    expect(room.participants.find(p => p.id === bobJoin.participant.id)?.isHost).toBe(true);
    expect(room.participants.find(p => p.id === alice.id)?.isHost).toBe(false);
  });

  it('accurately calculates elapsed authoritative playback position for late joins', () => {
    const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice' });

    // Alice starts playback at 10.0s
    roomManager.handlePlaybackCommand(room.code, alice.id, {
      action: 'play',
      positionSeconds: 10.0,
      expectedRevision: 1,
    });

    // Artificially simulate 3 seconds of elapsed playback on the server
    room.playback.updatedAt = Date.now() - 3000;

    const computedPos = roomManager.getAuthoritativePosition(room.playback);
    // Position should be approximately 10 + 3 = 13.0s (within 0.1s tolerance)
    expect(computedPos).toBeGreaterThanOrEqual(12.9);
    expect(computedPos).toBeLessThanOrEqual(13.2);
  });

  it('manages shared queue additions, removals, reordering and media playback', () => {
    const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice' });

    // Add new media item to queue
    const addRes = roomManager.addToQueue(room.code, alice.id, {
      title: 'Tears of Steel',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      type: 'mp4',
      durationSeconds: 734,
    });

    expect(addRes.success).toBe(true);
    const addedItem = addRes.queue?.find(q => q.title === 'Tears of Steel');
    expect(addedItem).toBeDefined();

    // Play the queued item
    const playQueueRes = roomManager.playQueueItem(room.code, alice.id, addedItem!.id);
    expect(playQueueRes.success).toBe(true);
    expect(room.playback.mediaTitle).toBe('Tears of Steel');
    expect(room.playback.positionSeconds).toBe(0);
    expect(room.playback.status).toBe('playing');
  });

  it('sanitizes chat messages to prevent XSS script injection', () => {
    const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice' });

    const chatRes = roomManager.addChatMessage(
      room.code,
      alice.id,
      'Hello <script>alert("hack")</script><b>World!</b>'
    );

    expect(chatRes.success).toBe(true);
    expect(chatRes.message?.text).toBe('Hello alert("hack")World!');
    expect(chatRes.message?.text).not.toContain('<script>');
    expect(chatRes.message?.text).not.toContain('<b>');
  });
});
