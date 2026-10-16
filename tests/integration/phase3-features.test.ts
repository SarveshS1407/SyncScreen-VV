import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../server/src/services/RoomManager.js';
import { SAMPLE_MOVIES } from '../../server/src/data/movies.js';

describe('Phase 3 Feature Integration & Functional Verification', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  // ==========================================
  // 1. MOVIE DISCOVERY CATALOG & METADATA
  // ==========================================
  describe('Movie Discovery Catalog', () => {
    it('provides rich metadata, artwork, ratings and distinct isPlayable flags', () => {
      expect(SAMPLE_MOVIES.length).toBeGreaterThanOrEqual(6);
      SAMPLE_MOVIES.forEach((movie) => {
        expect(movie.id).toBeDefined();
        expect(movie.title).toBeDefined();
        expect(movie.posterUrl).toBeDefined();
        expect(movie.rating).toBeGreaterThanOrEqual(7.0);
        expect(typeof movie.isPlayable).toBe('boolean');
        expect(movie.genre.length).toBeGreaterThan(0);
        expect(movie.vibeTags.length).toBeGreaterThan(0);
      });
    });

    it('distinguishes directly playable sources from metadata previews', () => {
      const playable = SAMPLE_MOVIES.filter(m => m.isPlayable);
      const previewOnly = SAMPLE_MOVIES.filter(m => !m.isPlayable);

      expect(playable.length).toBeGreaterThan(0);
      expect(previewOnly.length).toBeGreaterThan(0);

      playable.forEach(m => {
        expect(m.videoUrl).toMatch(/^https?:\/\//);
      });
    });
  });

  // ==========================================
  // 2. SHARED QUEUE
  // ==========================================
  describe('Shared Queue Operations', () => {
    it('adds new items to the queue and synchronizes correctly', () => {
      const { room, participant: host } = roomManager.createRoom({ userName: 'Host' });
      const initialCount = room.queue.length;

      const res = roomManager.addToQueue(room.code, host.id, {
        title: 'Elephant Dream',
        url: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
        type: 'mp4',
        durationSeconds: 654,
      });

      expect(res.success).toBe(true);
      expect(res.queue).toHaveLength(initialCount + 1);
      const added = res.queue?.find(q => q.title === 'Elephant Dream');
      expect(added?.addedBy.name).toBe('Host');
    });

    it('rejects duplicate URLs in the queue to avoid redundant additions', () => {
      const { room, participant: host } = roomManager.createRoom({ userName: 'Host' });
      const duplicateUrl = room.queue[0].url;

      const res = roomManager.addToQueue(room.code, host.id, {
        title: 'Duplicate Item',
        url: duplicateUrl,
        type: 'mp4',
        durationSeconds: 300,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('already in the queue');
    });

    it('reorders and removes items from queue', () => {
      const { room, participant: host } = roomManager.createRoom({ userName: 'Host' });
      const initialQueue = [...room.queue];
      const id1 = initialQueue[0].id;
      const id2 = initialQueue[1].id;

      // Reorder items
      const reorderRes = roomManager.reorderQueue(room.code, host.id, [id2, id1]);
      expect(reorderRes.success).toBe(true);
      expect(room.queue[0].id).toBe(id2);
      expect(room.queue[1].id).toBe(id1);

      // Remove item
      const removeRes = roomManager.removeFromQueue(room.code, host.id, id1);
      expect(removeRes.success).toBe(true);
      expect(room.queue.find(q => q.id === id1)).toBeUndefined();
    });
  });

  // ==========================================
  // 3. CHAT RATE LIMITING & REACTIONS
  // ==========================================
  describe('Chat and Reactions', () => {
    it('enforces rate limits on rapid, excessive message submissions', () => {
      const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice' });

      // Send 5 messages rapidly
      for (let i = 0; i < 5; i++) {
        const res = roomManager.addChatMessage(room.code, alice.id, `Message ${i}`);
        expect(res.success).toBe(true);
      }

      // 6th message within 2 seconds should be rate-limited
      const rateLimited = roomManager.addChatMessage(room.code, alice.id, 'Spam message 6');
      expect(rateLimited.success).toBe(false);
      expect(rateLimited.error).toContain('sending messages too quickly');
    });

    it('broadcasts emoji reactions and elevates room pulse energy', () => {
      const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice' });
      const initialEnergy = room.pulse.reactionEnergy;

      const reactRes = roomManager.addReaction(room.code, alice.id, '🔥', 0.5, 0.7);
      expect(reactRes.success).toBe(true);
      expect(reactRes.reaction?.emoji).toBe('🔥');
      expect(reactRes.reaction?.senderId).toBe(alice.id);
      expect(room.pulse.reactionEnergy).toBeGreaterThan(initialEnergy);
    });
  });

  // ==========================================
  // 4. GROUP POLLS
  // ==========================================
  describe('Group Polls', () => {
    it('manages complete poll lifecycle: creation, voting, and closure', () => {
      const { room, participant: host } = roomManager.createRoom({ userName: 'Host' });
      const guestJoin = roomManager.joinRoom({ roomCode: room.code, userName: 'Guest', socketId: 'sock_g' });
      if ('error' in guestJoin) throw new Error('Guest join failed');

      // 1. Create poll
      const createRes = roomManager.createPoll(room.code, host.id, {
        question: 'Intermission break?',
        options: ['Yes (5 mins)', 'No (Keep watching)'],
      });
      expect(createRes.success).toBe(true);
      expect(room.activePoll?.question).toBe('Intermission break?');

      const opt1 = room.activePoll!.options[0].id;
      const opt2 = room.activePoll!.options[1].id;

      // 2. Vote
      roomManager.votePoll(room.code, host.id, opt1);
      roomManager.votePoll(room.code, guestJoin.participant.id, opt1);
      expect(room.activePoll?.options[0].votes).toHaveLength(2);

      // Guest changes vote to opt2
      roomManager.votePoll(room.code, guestJoin.participant.id, opt2);
      expect(room.activePoll?.options[0].votes).toHaveLength(1);
      expect(room.activePoll?.options[1].votes).toHaveLength(1);

      // 3. Close poll
      const closeRes = roomManager.closePoll(room.code, host.id);
      expect(closeRes.success).toBe(true);
      expect(room.activePoll?.closed).toBe(true);

      // 4. Reject votes once closed
      const lateVote = roomManager.votePoll(room.code, host.id, opt2);
      expect(lateVote.success).toBe(false);
      expect(lateVote.error).toContain('closed');
    });
  });

  // ==========================================
  // 5. CREATIVE: BLIND PICK SHOWDOWN
  // ==========================================
  describe('Creative Feature: Blind Pick Showdown', () => {
    it('executes secret nomination, blind voting, and reveal of the winning choice', () => {
      const { room, participant: host } = roomManager.createRoom({ userName: 'Host' });
      const guestJoin = roomManager.joinRoom({ roomCode: room.code, userName: 'Guest', socketId: 'sock_g' });
      if ('error' in guestJoin) throw new Error('Join failed');

      // 1. Host starts session
      const startRes = roomManager.startBlindPick(room.code, host.id, 'Sci-Fi Friday Blind Pick');
      expect(startRes.success).toBe(true);
      expect(room.blindPick?.phase).toBe('nominating');

      // 2. Both participants nominate secretly
      roomManager.nominateBlindPick(room.code, host.id, {
        title: 'The Matrix',
        url: 'https://example.com/matrix.mp4',
      });
      roomManager.nominateBlindPick(room.code, guestJoin.participant.id, {
        title: 'Interstellar',
        url: 'https://example.com/interstellar.mp4',
      });
      expect(room.blindPick?.nominations).toHaveLength(2);

      // 3. Host advances phase to voting
      const votingRes = roomManager.advanceBlindPickPhase(room.code, host.id, 'voting');
      expect(votingRes.success).toBe(true);
      expect(room.blindPick?.phase).toBe('voting');

      // 4. Participants vote for nominations
      const nom1 = room.blindPick!.nominations[0].id;
      const nom2 = room.blindPick!.nominations[1].id;

      roomManager.voteBlindPick(room.code, host.id, nom2);
      roomManager.voteBlindPick(room.code, guestJoin.participant.id, nom2);

      // 5. Host advances phase to revealed
      const revealRes = roomManager.advanceBlindPickPhase(room.code, host.id, 'revealed');
      expect(revealRes.success).toBe(true);
      expect(room.blindPick?.phase).toBe('revealed');
      expect(room.blindPick?.winnerId).toBe(nom2);
    });
  });

  // ==========================================
  // 6. CREATIVE: VIBE MATCHING CONSENSUS
  // ==========================================
  describe('Creative Feature: Vibe Matching & Smart Recommendations', () => {
    it('aggregates participant mood votes and calculates dominant consensus vibe', () => {
      const { room, participant: alice } = roomManager.createRoom({ userName: 'Alice' });
      const bobJoin = roomManager.joinRoom({ roomCode: room.code, userName: 'Bob', socketId: 'b' });
      const charlieJoin = roomManager.joinRoom({ roomCode: room.code, userName: 'Charlie', socketId: 'c' });
      if ('error' in bobJoin || 'error' in charlieJoin) throw new Error('Join failed');

      // Alice votes 'suspenseful'
      roomManager.setParticipantVibe(room.code, alice.id, 'suspenseful');
      expect(room.vibe.activeVibe).toBe('suspenseful');

      // Bob votes 'suspenseful'
      roomManager.setParticipantVibe(room.code, bobJoin.participant.id, 'suspenseful');

      // Charlie votes 'funny'
      const charlieRes = roomManager.setParticipantVibe(room.code, charlieJoin.participant.id, 'funny');
      expect(charlieRes.success).toBe(true);

      // Suspenseful has 2 votes vs 1 for funny -> dominant is suspenseful
      expect(room.vibe.activeVibe).toBe('suspenseful');
      expect(room.vibe.recommendedGenres).toContain('Thriller');
    });
  });
});
