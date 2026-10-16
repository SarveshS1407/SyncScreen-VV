import {
  RoomState,
  Participant,
  PlaybackState,
  QueueItem,
  ChatMessage,
  ReactionEvent,
  Poll,
  MomentMarker,
  BlindPickSession,
  VibeState,
  VibeType,
  WatchPartyPulse,
  RoomHealthReport,
  PlaybackCommandSchema,
  CreatePollSchema,
  AddQueueItemSchema,
  MediaType
} from '@watch-party/shared';
import { SAMPLE_MOVIES } from '../data/movies.js';

// Human-readable code generator
const ADJECTIVES = ['COSMIC', 'NEON', 'GOLDEN', 'VELVET', 'SILVER', 'CYBER', 'EPIC', 'LUCKY', 'SHADOW', 'BRIGHT'];
const NOUNS = ['CINEMA', 'LOUNGE', 'THEATER', 'PULSE', 'STUDIO', 'STELLA', 'NEXUS', 'VIBE', 'STREAM', 'OASIS'];

function generateRoomCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}-${noun}-${num}`;
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#14b8a6'
];

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private socketToRoom: Map<string, { roomCode: string; participantId: string }> = new Map();
  private emptyRoomTimers: Map<string, NodeJS.Timeout> = new Map();
  private healthStats: Map<string, { corrections: number; reconnects: number; rtts: number[]; maxDrift: number }> = new Map();
  private serverStartTime: number = Date.now();

  constructor() {
    // Pulse decay interval: update pulse energy every 2 seconds
    setInterval(() => this.decayPulseEnergy(), 2000);
  }

  // -------------------------------------------------------------
  // Room Creation & Lookup
  // -------------------------------------------------------------

  public createRoom(params: {
    roomName?: string;
    userName: string;
    participantId?: string;
    socketId?: string;
    permissions?: {
      controlPlayback?: 'host_only' | 'everyone';
      manageQueue?: 'host_only' | 'everyone';
      createPolls?: 'host_only' | 'everyone';
    };
  }): { room: RoomState; participant: Participant } {
    const code = generateRoomCode();
    const participantId = params.participantId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const socketId = params.socketId || '';

    const host: Participant = {
      id: participantId,
      socketId,
      name: params.userName.trim(),
      isHost: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      isOnline: true,
      avatarColor: getRandomColor(),
    };

    if (socketId) {
      this.socketToRoom.set(socketId, { roomCode: code, participantId: host.id });
    }

    // Default movie: Sintel
    const defaultMovie = SAMPLE_MOVIES[0];
    const initialPlayback: PlaybackState = {
      mediaId: defaultMovie.id,
      mediaUrl: defaultMovie.videoUrl,
      mediaTitle: defaultMovie.title,
      mediaType: defaultMovie.videoType,
      status: 'paused',
      positionSeconds: 0,
      durationSeconds: defaultMovie.durationSeconds,
      playbackRate: 1.0,
      updatedAt: Date.now(),
      revision: 1,
      lastActionBy: host.id,
    };

    const initialQueue: QueueItem[] = [
      {
        id: `q_${Date.now()}_1`,
        title: defaultMovie.title,
        url: defaultMovie.videoUrl,
        type: defaultMovie.videoType,
        durationSeconds: defaultMovie.durationSeconds,
        thumbnailUrl: defaultMovie.posterUrl,
        addedBy: { id: host.id, name: host.name },
        addedAt: Date.now(),
        sourceType: 'sample',
      },
      {
        id: `q_${Date.now()}_2`,
        title: SAMPLE_MOVIES[1].title,
        url: SAMPLE_MOVIES[1].videoUrl,
        type: SAMPLE_MOVIES[1].videoType,
        durationSeconds: SAMPLE_MOVIES[1].durationSeconds,
        thumbnailUrl: SAMPLE_MOVIES[1].posterUrl,
        addedBy: { id: host.id, name: host.name },
        addedAt: Date.now() + 1,
        sourceType: 'sample',
      }
    ];

    const initialPulse: WatchPartyPulse = {
      activeWatchers: 1,
      reactionEnergy: 30,
      syncHealthScore: 100,
      recentActivityCount: 1,
    };

    const initialVibe: VibeState = {
      activeVibe: undefined,
      vibeVotes: {},
      recommendedGenres: ['Sci-Fi', 'Animation'],
    };

    const initialMarkers: MomentMarker[] = [
      {
        id: `m_${Date.now()}`,
        title: 'Opening Scene & Title Reveal',
        timestampSeconds: 15,
        createdBy: { id: host.id, name: host.name },
        createdAt: Date.now(),
        reactionCount: 2
      }
    ];

    const room: RoomState = {
      code,
      name: params.roomName?.trim() || `${host.name}'s Cinema`,
      hostId: host.id,
      createdAt: Date.now(),
      permissions: {
        controlPlayback: params.permissions?.controlPlayback || 'everyone',
        manageQueue: params.permissions?.manageQueue || 'everyone',
        createPolls: params.permissions?.createPolls || 'everyone',
      },
      settings: {
        autoPlayNext: true,
        allowParticipantInvites: true,
        driftThresholdMs: 300,
      },
      participants: [host],
      playback: initialPlayback,
      queue: initialQueue,
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          avatarColor: '#6366f1',
          text: `Room created! Welcome to ${params.roomName || `${host.name}'s Cinema`}. Invite friends with the room code: ${code}`,
          timestamp: Date.now(),
          isSystem: true,
        }
      ],
      activePoll: undefined,
      pulse: initialPulse,
      blindPick: undefined,
      vibe: initialVibe,
      markers: initialMarkers,
    };

    this.rooms.set(code, room);
    this.healthStats.set(code, { corrections: 0, reconnects: 0, rtts: [], maxDrift: 0 });

    return { room, participant: host };
  }

  public getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public getAllRoomsCount(): number {
    return this.rooms.size;
  }

  // -------------------------------------------------------------
  // Participant Join & Reconnect
  // -------------------------------------------------------------

  public joinRoom(params: {
    roomCode: string;
    userName: string;
    participantId?: string;
    socketId: string;
  }): { room: RoomState; participant: Participant; isReconnect: boolean } | { error: string } {
    const code = params.roomCode.toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      return { error: `Room "${code}" not found. Please check your code.` };
    }

    // Cancel pending empty room cleanup
    if (this.emptyRoomTimers.has(code)) {
      clearTimeout(this.emptyRoomTimers.get(code)!);
      this.emptyRoomTimers.delete(code);
    }

    let participant: Participant;
    let isReconnect = false;

    // Check if participant already exists in room (reconnection or existing session)
    const existingIndex = room.participants.findIndex(
      (p) => (params.participantId && p.id === params.participantId) || p.name.toLowerCase() === params.userName.trim().toLowerCase()
    );

    if (existingIndex !== -1) {
      // Reconnect
      isReconnect = true;
      participant = {
        ...room.participants[existingIndex],
        socketId: params.socketId,
        isOnline: true,
        lastSeenAt: Date.now(),
      };
      room.participants[existingIndex] = participant;

      const health = this.healthStats.get(code);
      if (health) health.reconnects++;

      // System notification
      room.messages.push({
        id: `msg_${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        avatarColor: '#10b981',
        text: `${participant.name} reconnected.`,
        timestamp: Date.now(),
        isSystem: true,
      });
    } else {
      // New participant
      const participantId = params.participantId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      participant = {
        id: participantId,
        socketId: params.socketId,
        name: params.userName.trim(),
        isHost: room.participants.length === 0, // Fallback if somehow no host
        joinedAt: Date.now(),
        lastSeenAt: Date.now(),
        isOnline: true,
        avatarColor: getRandomColor(),
      };

      room.participants.push(participant);

      // System announcement
      room.messages.push({
        id: `msg_${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        avatarColor: '#6366f1',
        text: `${participant.name} joined the room.`,
        timestamp: Date.now(),
        isSystem: true,
      });
    }

    // Map socket
    this.socketToRoom.set(params.socketId, { roomCode: code, participantId: participant.id });

    // Update active watchers
    room.pulse.activeWatchers = room.participants.filter(p => p.isOnline).length;
    room.pulse.recentActivityCount++;

    return { room, participant, isReconnect };
  }

  // -------------------------------------------------------------
  // Disconnect & Leave Handling
  // -------------------------------------------------------------

  public handleDisconnect(socketId: string): { roomCode: string; room: RoomState; participant?: Participant } | null {
    const mapping = this.socketToRoom.get(socketId);
    if (!mapping) return null;

    const { roomCode, participantId } = mapping;
    this.socketToRoom.delete(socketId);

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const participantIndex = room.participants.findIndex(p => p.id === participantId);
    if (participantIndex === -1) return null;

    const participant = room.participants[participantIndex];
    participant.isOnline = false;
    participant.lastSeenAt = Date.now();

    // Check if host disconnected
    if (participant.isHost) {
      // Automatically elect next available online participant as host
      const nextOnline = room.participants.find(p => p.isOnline && p.id !== participant.id);
      if (nextOnline) {
        participant.isHost = false;
        nextOnline.isHost = true;
        room.hostId = nextOnline.id;

        room.messages.push({
          id: `msg_${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          avatarColor: '#f59e0b',
          text: `Host departed. ${nextOnline.name} is now the host.`,
          timestamp: Date.now(),
          isSystem: true,
        });
      }
    }

    // Update pulse
    const onlineCount = room.participants.filter(p => p.isOnline).length;
    room.pulse.activeWatchers = onlineCount;

    // If room is completely empty, schedule cleanup in 5 minutes
    if (onlineCount === 0) {
      const timer = setTimeout(() => {
        this.rooms.delete(roomCode);
        this.healthStats.delete(roomCode);
        this.emptyRoomTimers.delete(roomCode);
      }, 5 * 60 * 1000);
      this.emptyRoomTimers.set(roomCode, timer);
    }

    return { roomCode, room, participant };
  }

  // -------------------------------------------------------------
  // Host Transfer & Permissions
  // -------------------------------------------------------------

  public transferHost(roomCode: string, requesterId: string, targetId: string): { success: boolean; error?: string; room?: RoomState } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    if (room.hostId !== requesterId) {
      return { success: false, error: 'Only the current host can transfer host privileges' };
    }

    const currentHost = room.participants.find(p => p.id === requesterId);
    const target = room.participants.find(p => p.id === targetId);

    if (!target) {
      return { success: false, error: 'Target participant not found in room' };
    }

    if (currentHost) currentHost.isHost = false;
    target.isHost = true;
    room.hostId = target.id;

    room.messages.push({
      id: `msg_${Date.now()}`,
      senderId: 'system',
      senderName: 'System',
      avatarColor: '#f59e0b',
      text: `Host privileges were transferred to ${target.name}.`,
      timestamp: Date.now(),
      isSystem: true,
    });

    return { success: true, room };
  }

  public updatePermissions(
    roomCode: string,
    requesterId: string,
    permissions: Partial<RoomState['permissions']>
  ): { success: boolean; error?: string; room?: RoomState } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    if (room.hostId !== requesterId) {
      return { success: false, error: 'Only the host can modify room permissions' };
    }

    room.permissions = {
      ...room.permissions,
      ...permissions,
    };

    return { success: true, room };
  }

  // -------------------------------------------------------------
  // Real-Time Playback Synchronization Engine
  // -------------------------------------------------------------

  public handlePlaybackCommand(
    roomCode: string,
    participantId: string,
    command: {
      action: 'play' | 'pause' | 'seek' | 'change_media' | 'rate_change';
      positionSeconds: number;
      playbackRate?: number;
      mediaUrl?: string;
      mediaTitle?: string;
      mediaType?: MediaType;
      durationSeconds?: number;
      expectedRevision: number;
    }
  ): { success: boolean; error?: string; playback?: PlaybackState } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.find(p => p.id === participantId);
    if (!participant) return { success: false, error: 'Participant not in room' };

    // Permission enforcement
    if (room.permissions.controlPlayback === 'host_only' && !participant.isHost) {
      return { success: false, error: 'Playback control is restricted to the host.' };
    }

    const current = room.playback;

    // Detect stale or out-of-order revision (allow revision within 2 for rapid successive actions, reject outdated)
    if (command.expectedRevision < current.revision - 3) {
      return {
        success: false,
        error: `Stale command rejected. Current revision is ${current.revision}, received expected ${command.expectedRevision}.`,
        playback: current,
      };
    }

    const now = Date.now();
    let newStatus = current.status;
    let newPos = command.positionSeconds;
    let newRate = command.playbackRate ?? current.playbackRate;
    let newMediaId = current.mediaId;
    let newMediaUrl = current.mediaUrl;
    let newMediaTitle = current.mediaTitle;
    let newMediaType = current.mediaType;
    let newDuration = command.durationSeconds ?? current.durationSeconds;

    switch (command.action) {
      case 'play':
        newStatus = 'playing';
        break;
      case 'pause':
        newStatus = 'paused';
        break;
      case 'seek':
        // Keep current status, update target position
        break;
      case 'rate_change':
        if (command.playbackRate) newRate = command.playbackRate;
        break;
      case 'change_media':
        if (command.mediaUrl) {
          newMediaUrl = command.mediaUrl;
          newMediaTitle = command.mediaTitle || 'Custom Media';
          newMediaType = command.mediaType || 'mp4';
          newMediaId = `media_${Date.now()}`;
          newPos = 0;
          newStatus = 'playing';
        }
        break;
    }

    // Monotonically increase authoritative revision
    const nextRevision = current.revision + 1;

    room.playback = {
      mediaId: newMediaId,
      mediaUrl: newMediaUrl,
      mediaTitle: newMediaTitle,
      mediaType: newMediaType,
      status: newStatus,
      positionSeconds: newPos,
      durationSeconds: newDuration,
      playbackRate: newRate,
      updatedAt: now,
      revision: nextRevision,
      lastActionBy: participant.id,
    };

    // Update pulse activity
    room.pulse.recentActivityCount++;

    return { success: true, playback: room.playback };
  }

  /**
   * Calculates the exact authoritative current position of the room video.
   * If playing, accounts for elapsed server time multiplied by playback rate.
   */
  public getAuthoritativePosition(playback: PlaybackState): number {
    if (playback.status !== 'playing') {
      return playback.positionSeconds;
    }
    const elapsedSeconds = (Date.now() - playback.updatedAt) / 1000;
    const computed = playback.positionSeconds + elapsedSeconds * playback.playbackRate;
    return playback.durationSeconds > 0 ? Math.min(computed, playback.durationSeconds) : computed;
  }

  // -------------------------------------------------------------
  // Queue Management
  // -------------------------------------------------------------

  public addToQueue(
    roomCode: string,
    participantId: string,
    item: {
      title: string;
      url: string;
      type: MediaType;
      durationSeconds: number;
      thumbnailUrl?: string;
    }
  ): { success: boolean; error?: string; queue?: QueueItem[] } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.find(p => p.id === participantId);
    if (!participant) return { success: false, error: 'Participant not in room' };

    if (room.permissions.manageQueue === 'host_only' && !participant.isHost) {
      return { success: false, error: 'Queue management is restricted to the host.' };
    }

    const newItem: QueueItem = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: item.title,
      url: item.url,
      type: item.type,
      durationSeconds: item.durationSeconds,
      thumbnailUrl: item.thumbnailUrl,
      addedBy: { id: participant.id, name: participant.name },
      addedAt: Date.now(),
      sourceType: 'custom',
    };

    room.queue.push(newItem);
    room.pulse.recentActivityCount++;

    return { success: true, queue: room.queue };
  }

  public removeFromQueue(
    roomCode: string,
    participantId: string,
    itemId: string
  ): { success: boolean; error?: string; queue?: QueueItem[] } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.find(p => p.id === participantId);
    if (!participant) return { success: false, error: 'Participant not in room' };

    if (room.permissions.manageQueue === 'host_only' && !participant.isHost) {
      return { success: false, error: 'Queue management is restricted to the host.' };
    }

    room.queue = room.queue.filter(q => q.id !== itemId);
    return { success: true, queue: room.queue };
  }

  public reorderQueue(
    roomCode: string,
    participantId: string,
    itemIds: string[]
  ): { success: boolean; error?: string; queue?: QueueItem[] } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.find(p => p.id === participantId);
    if (!participant) return { success: false, error: 'Participant not in room' };

    if (room.permissions.manageQueue === 'host_only' && !participant.isHost) {
      return { success: false, error: 'Queue management is restricted to the host.' };
    }

    const itemMap = new Map(room.queue.map(i => [i.id, i]));
    const reordered: QueueItem[] = [];

    for (const id of itemIds) {
      const item = itemMap.get(id);
      if (item) {
        reordered.push(item);
        itemMap.delete(id);
      }
    }
    // Append any items that were not specified in the payload
    for (const remaining of itemMap.values()) {
      reordered.push(remaining);
    }

    room.queue = reordered;
    return { success: true, queue: room.queue };
  }

  public playQueueItem(
    roomCode: string,
    participantId: string,
    itemId: string
  ): { success: boolean; error?: string; playback?: PlaybackState; queue?: QueueItem[] } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    const item = room.queue.find(q => q.id === itemId);
    if (!item) return { success: false, error: 'Queue item not found' };

    const res = this.handlePlaybackCommand(roomCode, participantId, {
      action: 'change_media',
      positionSeconds: 0,
      mediaUrl: item.url,
      mediaTitle: item.title,
      mediaType: item.type,
      durationSeconds: item.durationSeconds,
      expectedRevision: room.playback.revision,
    });

    if (!res.success) return res;

    return { success: true, playback: res.playback, queue: room.queue };
  }

  // -------------------------------------------------------------
  // Chat & Reactions
  // -------------------------------------------------------------

  public addChatMessage(
    roomCode: string,
    senderId: string,
    text: string
  ): { success: boolean; error?: string; message?: ChatMessage } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.find(p => p.id === senderId);
    if (!participant) return { success: false, error: 'Participant not in room' };

    // Sanitize string (strip script or html tags)
    const sanitized = text.replace(/<[^>]*>?/gm, '').trim();
    if (!sanitized) return { success: false, error: 'Message cannot be empty' };

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: participant.id,
      senderName: participant.name,
      avatarColor: participant.avatarColor,
      text: sanitized.slice(0, 500),
      timestamp: Date.now(),
    };

    room.messages.push(message);
    if (room.messages.length > 200) {
      room.messages.shift(); // Keep last 200 messages
    }

    // Boost pulse energy
    room.pulse.reactionEnergy = Math.min(100, room.pulse.reactionEnergy + 10);
    room.pulse.recentActivityCount++;

    return { success: true, message };
  }

  public addReaction(
    roomCode: string,
    senderId: string,
    emoji: string,
    x?: number,
    y?: number
  ): { success: boolean; reaction?: ReactionEvent } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false };

    const participant = room.participants.find(p => p.id === senderId);
    if (!participant) return { success: false };

    const reaction: ReactionEvent = {
      id: `react_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      emoji,
      senderId: participant.id,
      senderName: participant.name,
      timestamp: Date.now(),
      x: x ?? (0.2 + Math.random() * 0.6),
      y: y ?? (0.6 + Math.random() * 0.3),
    };

    // Boost pulse energy on reaction
    room.pulse.reactionEnergy = Math.min(100, room.pulse.reactionEnergy + 15);
    room.pulse.recentActivityCount++;

    return { success: true, reaction };
  }

  // -------------------------------------------------------------
  // Group Polls
  // -------------------------------------------------------------

  public createPoll(
    roomCode: string,
    participantId: string,
    pollData: { question: string; options: string[] }
  ): { success: boolean; error?: string; poll?: Poll } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.find(p => p.id === participantId);
    if (!participant) return { success: false, error: 'Participant not in room' };

    if (room.permissions.createPolls === 'host_only' && !participant.isHost) {
      return { success: false, error: 'Poll creation is restricted to the host.' };
    }

    const poll: Poll = {
      id: `poll_${Date.now()}`,
      question: pollData.question.trim(),
      options: pollData.options.map((opt, idx) => ({
        id: `opt_${idx}_${Date.now()}`,
        text: opt.trim(),
        votes: [],
      })),
      createdBy: { id: participant.id, name: participant.name },
      createdAt: Date.now(),
      closed: false,
    };

    room.activePoll = poll;
    room.pulse.recentActivityCount += 2;

    return { success: true, poll };
  }

  public votePoll(
    roomCode: string,
    participantId: string,
    optionId: string
  ): { success: boolean; error?: string; poll?: Poll } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || !room.activePoll) return { success: false, error: 'No active poll in room' };

    if (room.activePoll.closed) {
      return { success: false, error: 'This poll is already closed.' };
    }

    const poll = room.activePoll;
    // Remove previous vote from any option
    for (const option of poll.options) {
      option.votes = option.votes.filter(id => id !== participantId);
    }

    // Add vote to chosen option
    const target = poll.options.find(o => o.id === optionId);
    if (!target) return { success: false, error: 'Option not found' };

    target.votes.push(participantId);
    room.pulse.reactionEnergy = Math.min(100, room.pulse.reactionEnergy + 8);

    return { success: true, poll };
  }

  public closePoll(
    roomCode: string,
    participantId: string
  ): { success: boolean; error?: string; poll?: Poll } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || !room.activePoll) return { success: false, error: 'No active poll' };

    const participant = room.participants.find(p => p.id === participantId);
    if (!participant || (!participant.isHost && room.activePoll.createdBy.id !== participantId)) {
      return { success: false, error: 'Only the poll creator or room host can close the poll.' };
    }

    room.activePoll.closed = true;
    room.activePoll.closedAt = Date.now();

    return { success: true, poll: room.activePoll };
  }

  // -------------------------------------------------------------
  // Creative Features: Pulse, Blind Pick, Vibe, Moments
  // -------------------------------------------------------------

  private decayPulseEnergy(): void {
    for (const room of this.rooms.values()) {
      if (room.pulse.reactionEnergy > 5) {
        room.pulse.reactionEnergy = Math.max(5, Math.floor(room.pulse.reactionEnergy * 0.92));
      }
    }
  }

  public recordDiagnostic(roomCode: string, driftMs: number, rttMs: number, hadCorrection: boolean): void {
    const health = this.healthStats.get(roomCode.toUpperCase());
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!health || !room) return;

    if (hadCorrection) health.corrections++;
    health.maxDrift = Math.max(health.maxDrift, Math.abs(driftMs));
    health.rtts.push(rttMs);
    if (health.rtts.length > 50) health.rtts.shift();

    // Calculate room sync health score (0-100)
    const driftAbs = Math.abs(driftMs);
    let score = 100;
    if (driftAbs > 500) score = Math.max(20, 100 - (driftAbs - 500) / 10);
    else if (driftAbs > 150) score = Math.max(70, 100 - (driftAbs - 150) / 10);
    room.pulse.syncHealthScore = Math.round(score);
  }

  public getHealthReport(roomCode: string): RoomHealthReport | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    const health = this.healthStats.get(roomCode.toUpperCase());
    if (!room || !health) return null;

    const avgRtt = health.rtts.length ? Math.round(health.rtts.reduce((a, b) => a + b, 0) / health.rtts.length) : 0;

    return {
      roomId: room.code,
      totalParticipants: room.participants.length,
      onlineParticipants: room.participants.filter(p => p.isOnline).length,
      serverTime: Date.now(),
      playbackRevision: room.playback.revision,
      averageRttMs: avgRtt,
      maxDriftMs: Math.round(health.maxDrift),
      recentCorrectionsCount: health.corrections,
      reconnectEventsCount: health.reconnects,
      serverUptimeSeconds: Math.floor((Date.now() - this.serverStartTime) / 1000),
    };
  }

  // Vibe Matching
  public setParticipantVibe(roomCode: string, participantId: string, vibe: VibeType): { success: boolean; vibeState: VibeState } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, vibeState: { vibeVotes: {}, recommendedGenres: [] } };

    room.vibe.vibeVotes[participantId] = vibe;

    // Tally dominant vibe
    const counts: Record<string, number> = {};
    for (const v of Object.values(room.vibe.vibeVotes)) {
      counts[v] = (counts[v] || 0) + 1;
    }

    let maxCount = 0;
    let dominant: VibeType = vibe;
    for (const [v, c] of Object.entries(counts)) {
      if (c > maxCount) {
        maxCount = c;
        dominant = v as VibeType;
      }
    }

    room.vibe.activeVibe = dominant;

    // Compute recommended genres
    const GENRE_MAP: Record<VibeType, string[]> = {
      suspenseful: ['Thriller', 'Horror', 'Mystery'],
      funny: ['Comedy', 'Animation', 'Family'],
      relaxing: ['Documentary', 'Nature', 'Animation'],
      nostalgic: ['Classic', 'Drama', 'Adventure'],
      mind_bending: ['Sci-Fi', 'Mystery', 'Thriller'],
      epic: ['Action', 'Adventure', 'Fantasy'],
    };

    room.vibe.recommendedGenres = GENRE_MAP[dominant] || ['Adventure'];
    room.pulse.recentActivityCount++;

    return { success: true, vibeState: room.vibe };
  }

  // Blind Pick
  public startBlindPick(roomCode: string, participantId: string, title: string): { success: boolean; blindPick?: BlindPickSession; error?: string } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.find(p => p.id === participantId);
    if (!participant || !participant.isHost) {
      return { success: false, error: 'Only the host can start a Blind Pick session.' };
    }

    const session: BlindPickSession = {
      id: `bp_${Date.now()}`,
      phase: 'nominating',
      title: title || 'Secret Movie Selection',
      nominations: [],
      createdAt: Date.now(),
    };

    room.blindPick = session;
    return { success: true, blindPick: session };
  }

  public nominateBlindPick(
    roomCode: string,
    participantId: string,
    nomination: { title: string; url: string }
  ): { success: boolean; error?: string; blindPick?: BlindPickSession } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || !room.blindPick || room.blindPick.phase !== 'nominating') {
      return { success: false, error: 'Nominations are not currently open.' };
    }

    // Check if participant already nominated
    const existing = room.blindPick.nominations.find(n => n.nominatedBy === participantId);
    if (existing) {
      existing.title = nomination.title;
      existing.url = nomination.url;
    } else {
      room.blindPick.nominations.push({
        id: `nom_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        title: nomination.title,
        url: nomination.url,
        nominatedBy: participantId,
        votes: [],
      });
    }

    return { success: true, blindPick: room.blindPick };
  }

  public advanceBlindPickPhase(
    roomCode: string,
    participantId: string,
    targetPhase: 'voting' | 'revealed'
  ): { success: boolean; error?: string; blindPick?: BlindPickSession } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || !room.blindPick) return { success: false, error: 'No active Blind Pick' };

    const participant = room.participants.find(p => p.id === participantId);
    if (!participant || !participant.isHost) {
      return { success: false, error: 'Only host can change Blind Pick phase' };
    }

    room.blindPick.phase = targetPhase;

    if (targetPhase === 'revealed') {
      // Calculate winner
      let highestVotes = -1;
      let winnerId = '';
      for (const nom of room.blindPick.nominations) {
        if (nom.votes.length > highestVotes) {
          highestVotes = nom.votes.length;
          winnerId = nom.id;
        }
      }
      room.blindPick.winnerId = winnerId;
    }

    return { success: true, blindPick: room.blindPick };
  }

  public voteBlindPick(
    roomCode: string,
    participantId: string,
    nominationId: string
  ): { success: boolean; error?: string; blindPick?: BlindPickSession } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || !room.blindPick || room.blindPick.phase !== 'voting') {
      return { success: false, error: 'Voting is not open.' };
    }

    for (const nom of room.blindPick.nominations) {
      nom.votes = nom.votes.filter(id => id !== participantId);
    }

    const target = room.blindPick.nominations.find(n => n.id === nominationId);
    if (target) {
      target.votes.push(participantId);
    }

    return { success: true, blindPick: room.blindPick };
  }

  // Moment Markers
  public addMomentMarker(
    roomCode: string,
    participantId: string,
    title: string,
    timestampSeconds: number
  ): { success: boolean; error?: string; marker?: MomentMarker } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.find(p => p.id === participantId);
    if (!participant) return { success: false, error: 'Participant not in room' };

    const marker: MomentMarker = {
      id: `mark_${Date.now()}`,
      title: title.trim().slice(0, 80),
      timestampSeconds: Math.max(0, Math.round(timestampSeconds)),
      createdBy: { id: participant.id, name: participant.name },
      createdAt: Date.now(),
      reactionCount: 1,
    };

    room.markers.push(marker);
    // Sort markers by timestamp
    room.markers.sort((a, b) => a.timestampSeconds - b.timestampSeconds);

    return { success: true, marker };
  }
}
