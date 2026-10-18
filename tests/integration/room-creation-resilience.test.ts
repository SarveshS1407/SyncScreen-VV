import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../server/src/services/RoomManager.js';
import { CreateRoomSchema, JoinRoomSchema } from '@watch-party/shared';

describe('Room Creation & Network Resilience Suite', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  it('1. Successfully creates a room and returns valid roomCode and state', () => {
    const parsed = CreateRoomSchema.safeParse({ userName: 'TestHost', roomName: 'Friday Movie Night' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const { room, participant } = roomManager.createRoom({
      userName: parsed.data.userName,
      roomName: parsed.data.roomName,
      permissions: parsed.data.permissions,
    });

    expect(room.code).toBeDefined();
    expect(typeof room.code).toBe('string');
    expect(room.code.length).toBeGreaterThan(6);
    expect(room.name).toBe('Friday Movie Night');
    expect(participant.name).toBe('TestHost');
    expect(participant.isHost).toBe(true);
    expect(room.hostId).toBe(participant.id);
    expect(room.playback.status).toBe('paused');
    expect(room.queue.length).toBeGreaterThan(0);
  });

  it('2. Rejects room creation with schema error when userName is empty or missing', () => {
    const invalidPayloads = [
      { userName: '' },
      { userName: '   ' },
      {},
      { userName: 123 },
    ];

    for (const payload of invalidPayloads) {
      const parsed = CreateRoomSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    }
  });

  it('3. Successfully joins created room and updates participant list', () => {
    const { room: createdRoom } = roomManager.createRoom({ userName: 'Host1' });

    const joinParsed = JoinRoomSchema.safeParse({ roomCode: createdRoom.code, userName: 'Host1' });
    expect(joinParsed.success).toBe(true);

    const joinRes = roomManager.joinRoom({
      roomCode: createdRoom.code,
      userName: 'Guest1',
      socketId: 'sock_guest_1',
    });

    expect('error' in joinRes).toBe(false);
    if (!('error' in joinRes)) {
      expect(joinRes.room.code).toBe(createdRoom.code);
      expect(joinRes.participant.name).toBe('Guest1');
      expect(joinRes.participant.isHost).toBe(false);
      expect(joinRes.room.participants).toHaveLength(2);
    }
  });

  it('4. Two clients join the same room and both appear in participant list', () => {
    const { room: createdRoom } = roomManager.createRoom({ userName: 'Host2' });

    const guest1 = roomManager.joinRoom({
      roomCode: createdRoom.code,
      userName: 'GuestAlpha',
      socketId: 'sock_alpha',
    });
    const guest2 = roomManager.joinRoom({
      roomCode: createdRoom.code,
      userName: 'GuestBeta',
      socketId: 'sock_beta',
    });

    expect('error' in guest1).toBe(false);
    expect('error' in guest2).toBe(false);

    const currentRoom = roomManager.getRoom(createdRoom.code);
    expect(currentRoom).toBeDefined();
    expect(currentRoom!.participants).toHaveLength(3);
    const names = currentRoom!.participants.map(p => p.name);
    expect(names).toContain('Host2');
    expect(names).toContain('GuestAlpha');
    expect(names).toContain('GuestBeta');
  });

  it('5. Handles joining a non-existent room code with structured error', () => {
    const joinRes = roomManager.joinRoom({
      roomCode: 'NON-EXISTENT-ROOM',
      userName: 'Stranger',
      socketId: 'sock_stranger',
    });

    expect('error' in joinRes).toBe(true);
    if ('error' in joinRes) {
      expect(joinRes.error).toContain('not found');
    }
  });

  it('6. Cleans and resolves API URLs with and without trailing slashes and handles relative paths', () => {
    const formatUrl = (base: string | undefined, endpoint: string) => {
      const cleanBase = (base || '').replace(/\/+$/, '');
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `${cleanBase}${cleanEndpoint}`;
    };

    expect(formatUrl('https://api.syncscreen.com/', '/api/rooms')).toBe('https://api.syncscreen.com/api/rooms');
    expect(formatUrl('https://api.syncscreen.com', 'api/rooms')).toBe('https://api.syncscreen.com/api/rooms');
    expect(formatUrl('', '/api/rooms')).toBe('/api/rooms');
    expect(formatUrl(undefined, '/api/rooms')).toBe('/api/rooms');
  });

  it('7. Formats network diagnostic messages accurately based on error types', () => {
    const getErrorMessage = (err: any) => {
      if (err?.name === 'AbortError') {
        return 'Connection timed out while reaching the real-time server. Please try again.';
      }
      return 'Unable to connect to the SyncScreen real-time server. Please check your internet connection or try again in a moment.';
    };

    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    const genericError = new TypeError('Failed to fetch');

    expect(getErrorMessage(abortError)).toContain('timed out');
    expect(getErrorMessage(genericError)).toContain('Unable to connect');
  });
});
