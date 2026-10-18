import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../server/src/services/RoomManager.js';
import { PARTICIPANT_COLORS, getDeterministicColor } from '@watch-party/shared';

describe('Participant Colors and Timeline Position Tests', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  it('assigns PARTICIPANT_COLORS[0] to the host', () => {
    const { room, participant: host } = roomManager.createRoom({
      userName: 'Alice',
      roomName: 'Color Test Party',
    });

    expect(host.isHost).toBe(true);
    expect(host.avatarColor).toBe(PARTICIPANT_COLORS[0]);
    expect(host.color).toBe(PARTICIPANT_COLORS[0]);
  });

  it('assigns distinct, non-colliding colors to each participant', () => {
    const { room } = roomManager.createRoom({ userName: 'User 0' });

    for (let i = 1; i < 8; i++) {
      const joinRes = roomManager.joinRoom({
        roomCode: room.code,
        userName: `User ${i}`,
      });
      expect('error' in joinRes).toBe(false);
    }

    const updatedRoom = roomManager.getRoom(room.code)!;
    expect(updatedRoom.participants).toHaveLength(8);

    const colors = updatedRoom.participants.map(p => p.avatarColor);
    const uniqueColors = new Set(colors);

    // All 8 participants should have completely distinct colors
    expect(uniqueColors.size).toBe(8);

    // All colors should be from the official high-contrast palette
    for (const c of colors) {
      expect(PARTICIPANT_COLORS).toContain(c);
    }
  });

  it('handles duplicate display names without ID or color collision', () => {
    const { room, participant: host } = roomManager.createRoom({ userName: 'Alex' });

    // Second user with the identical name "Alex"
    const joinRes1 = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Alex',
    });
    expect('error' in joinRes1).toBe(false);
    if ('error' in joinRes1) return;
    const alex2 = joinRes1.participant;

    // Third user also named "Alex"
    const joinRes2 = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Alex',
    });
    expect('error' in joinRes2).toBe(false);
    if ('error' in joinRes2) return;
    const alex3 = joinRes2.participant;

    const updatedRoom = roomManager.getRoom(room.code)!;
    expect(updatedRoom.participants).toHaveLength(3);

    // Verify all 3 have unique IDs
    expect(host.id).not.toBe(alex2.id);
    expect(host.id).not.toBe(alex3.id);
    expect(alex2.id).not.toBe(alex3.id);

    // Verify all 3 have distinct colors
    expect(host.avatarColor).not.toBe(alex2.avatarColor);
    expect(host.avatarColor).not.toBe(alex3.avatarColor);
    expect(alex2.avatarColor).not.toBe(alex3.avatarColor);
  });

  it('preserves participant color on reconnection with participantId', () => {
    const { room } = roomManager.createRoom({ userName: 'Host' });
    const joinRes = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Sam',
    });
    if ('error' in joinRes) return;
    const originalId = joinRes.participant.id;
    const originalColor = joinRes.participant.avatarColor;

    // Simulate disconnect
    roomManager.handleDisconnect(joinRes.participant.socketId);

    // Reconnect with same participantId
    const reconnectRes = roomManager.joinRoom({
      roomCode: room.code,
      userName: 'Sam',
      participantId: originalId,
      socketId: 'sock_sam_reconnected',
    });
    if ('error' in reconnectRes) return;

    expect(reconnectRes.participant.id).toBe(originalId);
    expect(reconnectRes.participant.avatarColor).toBe(originalColor);
    expect(reconnectRes.participant.isOnline).toBe(true);
  });

  it('updates participant timeline playback position accurately', () => {
    const { room, participant } = roomManager.createRoom({ userName: 'Watcher' });

    expect(participant.playbackPosition).toBe(0);

    // Report position at 42.5s
    const updated = roomManager.updateParticipantPosition(room.code, participant.id, 42.5);
    expect(updated).toBe(true);

    const updatedRoom = roomManager.getRoom(room.code)!;
    const updatedP = updatedRoom.participants.find(p => p.id === participant.id);
    expect(updatedP?.playbackPosition).toBe(42.5);
    expect(updatedP?.lastPositionUpdate).toBeDefined();
    expect(Date.now() - (updatedP?.lastPositionUpdate || 0)).toBeLessThan(1000);
  });

  it('falls back to deterministic golden-angle colors when participants exceed palette size', () => {
    const { room } = roomManager.createRoom({ userName: 'User 0' });

    // Join 20 participants (palette has 16)
    for (let i = 1; i < 20; i++) {
      roomManager.joinRoom({
        roomCode: room.code,
        userName: `User ${i}`,
      });
    }

    const updatedRoom = roomManager.getRoom(room.code)!;
    expect(updatedRoom.participants).toHaveLength(20);

    // Check that every participant has a valid hex or hsl color string
    for (const p of updatedRoom.participants) {
      expect(p.avatarColor).toMatch(/^(#|hsl\()/);
    }

    // Verify deterministic color generator
    const color1 = getDeterministicColor(18, 'seed-a');
    const color2 = getDeterministicColor(18, 'seed-a');
    expect(color1).toBe(color2);
  });
});
