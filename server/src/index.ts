import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './services/RoomManager.js';
import { SAMPLE_MOVIES } from './data/movies.js';
import {
  CreateRoomSchema,
  JoinRoomSchema,
  PlaybackCommandSchema,
  SendMessageSchema,
  SendReactionSchema,
  AddQueueItemSchema,
  ReorderQueueSchema,
  CreatePollSchema,
  VotePollSchema,
  CreateMomentMarkerSchema,
  SetVibeSchema,
  TransferHostSchema,
  UpdatePermissionsSchema,
  MovieItem,
  VibeType
} from '@watch-party/shared';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Health check endpoint (for deployment & monitoring)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    roomsCount: roomManager.getAllRoomsCount(),
    memoryUsage: process.memoryUsage(),
  });
});

// 2. Create room via HTTP
app.post('/api/rooms', (req, res) => {
  const parsed = CreateRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid room creation data' });
  }

  const { room, participant } = roomManager.createRoom({
    roomName: parsed.data.roomName,
    userName: parsed.data.userName,
    permissions: parsed.data.permissions,
  });

  return res.status(201).json({
    roomCode: room.code,
    room,
    participant,
  });
});

// 3. Get room info (check existence)
app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = roomManager.getRoom(code);
  if (!room) {
    return res.status(404).json({ error: `Room ${code} not found` });
  }

  return res.json({
    code: room.code,
    name: room.name,
    participantCount: room.participants.filter(p => p.isOnline).length,
    mediaTitle: room.playback.mediaTitle,
    requiresApproval: false,
  });
});

// 4. Room Health Report
app.get('/api/rooms/:code/health', (req, res) => {
  const code = req.params.code.toUpperCase();
  const report = roomManager.getHealthReport(code);
  if (!report) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json(report);
});

// 5. Fuzzy Movie Search & Discovery Catalog
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (t.includes(q)) return true;

  // Partial sub-token matching
  const queryTokens = q.split(/\s+/);
  return queryTokens.every(token => t.includes(token));
}

app.get('/api/movies', (req, res) => {
  const query = (req.query.q as string) || '';
  const genre = (req.query.genre as string) || '';
  const vibe = (req.query.vibe as string) || '';
  const sort = (req.query.sort as string) || 'rating';

  let results: MovieItem[] = [...SAMPLE_MOVIES];

  if (query) {
    results = results.filter(
      m => fuzzyMatch(m.title, query) || fuzzyMatch(m.description, query) || m.genre.some(g => fuzzyMatch(g, query))
    );
  }

  if (genre && genre !== 'All') {
    results = results.filter(m => m.genre.some(g => g.toLowerCase() === genre.toLowerCase()));
  }

  if (vibe && vibe !== 'All') {
    results = results.filter(m => m.vibeTags.includes(vibe as VibeType));
  }

  if (sort === 'rating') {
    results.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'year') {
    results.sort((a, b) => b.year - a.year);
  } else if (sort === 'title') {
    results.sort((a, b) => a.title.localeCompare(b.title));
  }

  res.json({
    total: results.length,
    movies: results,
  });
});

// ==========================================
// REAL-TIME SOCKET.IO GATEWAY
// ==========================================

io.on('connection', (socket: Socket) => {
  // 1. Precise Clock Synchronization (NTP-style ping-pong)
  socket.on('sync_clock_ping', (clientTimestamp: number) => {
    socket.emit('sync_clock_pong', {
      clientTimestamp,
      serverTimestamp: Date.now(),
    });
  });

  // 2. Join Room
  socket.on('join_room', (data: { roomCode: string; userName: string; participantId?: string }) => {
    const parsed = JoinRoomSchema.safeParse(data);
    if (!parsed.success) {
      return socket.emit('join_error', { message: parsed.error.issues[0]?.message || 'Invalid join parameters' });
    }

    const res = roomManager.joinRoom({
      roomCode: parsed.data.roomCode,
      userName: parsed.data.userName,
      participantId: parsed.data.participantId,
      socketId: socket.id,
    });

    if ('error' in res) {
      return socket.emit('join_error', { message: res.error });
    }

    const { room, participant, isReconnect } = res;
    socket.join(room.code.toUpperCase());

    // Send full authoritative room snapshot to joining client
    socket.emit('room_joined', {
      room,
      participant,
      serverTime: Date.now(),
      authoritativePosition: roomManager.getAuthoritativePosition(room.playback),
      isReconnect,
    });

    // Notify other room participants
    socket.to(room.code.toUpperCase()).emit(isReconnect ? 'participant_reconnected' : 'participant_joined', {
      participant,
      participants: room.participants,
      pulse: room.pulse,
      systemMessage: room.messages[room.messages.length - 1],
    });
  });

  // 3. Playback Command (Play, Pause, Seek, Change Media, Rate)
  socket.on('playback_command', (data: { roomCode: string; participantId: string; command: any }) => {
    const { roomCode, participantId, command } = data;
    const parsed = PlaybackCommandSchema.safeParse(command);

    if (!parsed.success) {
      return socket.emit('playback_error', { message: parsed.error.issues[0]?.message || 'Invalid playback command' });
    }

    const result = roomManager.handlePlaybackCommand(roomCode, participantId, parsed.data);

    if (!result.success || !result.playback) {
      return socket.emit('playback_error', { message: result.error || 'Failed to apply command' });
    }

    // Broadcast authoritative playback update to ALL clients in the room (including sender)
    io.in(roomCode.toUpperCase()).emit('playback_update', {
      playback: result.playback,
      serverTime: Date.now(),
      issuedBy: participantId,
      action: parsed.data.action,
    });
  });

  // 4. Report Drift Diagnostics (Continuous monitoring)
  socket.on('report_drift', (data: { roomCode: string; driftMs: number; rttMs: number; hadCorrection: boolean }) => {
    if (data.roomCode && typeof data.driftMs === 'number') {
      roomManager.recordDiagnostic(data.roomCode, data.driftMs, data.rttMs || 0, data.hadCorrection || false);
      const room = roomManager.getRoom(data.roomCode);
      if (room) {
        io.in(data.roomCode.toUpperCase()).emit('pulse_updated', room.pulse);
      }
    }
  });

  // 5. Chat Messages
  socket.on('send_chat', (data: { roomCode: string; senderId: string; text: string }) => {
    const parsed = SendMessageSchema.safeParse({ text: data.text });
    if (!parsed.success) {
      return socket.emit('chat_error', { message: parsed.error.issues[0]?.message });
    }

    const res = roomManager.addChatMessage(data.roomCode, data.senderId, parsed.data.text);
    if (res.success && res.message) {
      io.in(data.roomCode.toUpperCase()).emit('chat_message', res.message);
      const room = roomManager.getRoom(data.roomCode);
      if (room) io.in(data.roomCode.toUpperCase()).emit('pulse_updated', room.pulse);
    }
  });

  // 6. Emoji Reactions
  socket.on('send_reaction', (data: { roomCode: string; senderId: string; emoji: string; x?: number; y?: number }) => {
    const parsed = SendReactionSchema.safeParse({ emoji: data.emoji, x: data.x, y: data.y });
    if (!parsed.success) return;

    const res = roomManager.addReaction(data.roomCode, data.senderId, parsed.data.emoji, parsed.data.x, parsed.data.y);
    if (res.success && res.reaction) {
      io.in(data.roomCode.toUpperCase()).emit('reaction_event', res.reaction);
      const room = roomManager.getRoom(data.roomCode);
      if (room) io.in(data.roomCode.toUpperCase()).emit('pulse_updated', room.pulse);
    }
  });

  // 7. Queue Operations
  socket.on('add_queue_item', (data: { roomCode: string; participantId: string; item: any }) => {
    const parsed = AddQueueItemSchema.safeParse(data.item);
    if (!parsed.success) {
      return socket.emit('queue_error', { message: parsed.error.issues[0]?.message || 'Invalid queue item' });
    }

    const res = roomManager.addToQueue(data.roomCode, data.participantId, parsed.data);
    if (!res.success) {
      return socket.emit('queue_error', { message: res.error });
    }

    io.in(data.roomCode.toUpperCase()).emit('queue_updated', { queue: res.queue });
  });

  socket.on('remove_queue_item', (data: { roomCode: string; participantId: string; itemId: string }) => {
    const res = roomManager.removeFromQueue(data.roomCode, data.participantId, data.itemId);
    if (!res.success) {
      return socket.emit('queue_error', { message: res.error });
    }
    io.in(data.roomCode.toUpperCase()).emit('queue_updated', { queue: res.queue });
  });

  socket.on('reorder_queue', (data: { roomCode: string; participantId: string; itemIds: string[] }) => {
    const parsed = ReorderQueueSchema.safeParse({ itemIds: data.itemIds });
    if (!parsed.success) return;

    const res = roomManager.reorderQueue(data.roomCode, data.participantId, parsed.data.itemIds);
    if (!res.success) {
      return socket.emit('queue_error', { message: res.error });
    }
    io.in(data.roomCode.toUpperCase()).emit('queue_updated', { queue: res.queue });
  });

  socket.on('play_queue_item', (data: { roomCode: string; participantId: string; itemId: string }) => {
    const res = roomManager.playQueueItem(data.roomCode, data.participantId, data.itemId);
    if (!res.success) {
      return socket.emit('queue_error', { message: res.error });
    }

    io.in(data.roomCode.toUpperCase()).emit('playback_update', {
      playback: res.playback,
      serverTime: Date.now(),
      issuedBy: data.participantId,
      action: 'change_media',
    });
  });

  // 8. Poll Operations
  socket.on('create_poll', (data: { roomCode: string; participantId: string; question: string; options: string[] }) => {
    const parsed = CreatePollSchema.safeParse({ question: data.question, options: data.options });
    if (!parsed.success) {
      return socket.emit('poll_error', { message: parsed.error.issues[0]?.message || 'Invalid poll' });
    }

    const res = roomManager.createPoll(data.roomCode, data.participantId, parsed.data);
    if (!res.success) {
      return socket.emit('poll_error', { message: res.error });
    }

    io.in(data.roomCode.toUpperCase()).emit('poll_updated', { poll: res.poll });
  });

  socket.on('vote_poll', (data: { roomCode: string; participantId: string; optionId: string }) => {
    const parsed = VotePollSchema.safeParse({ pollId: 'dummy', optionId: data.optionId });
    if (!parsed.success) return;

    const res = roomManager.votePoll(data.roomCode, data.participantId, data.optionId);
    if (!res.success) {
      return socket.emit('poll_error', { message: res.error });
    }

    io.in(data.roomCode.toUpperCase()).emit('poll_updated', { poll: res.poll });
  });

  socket.on('close_poll', (data: { roomCode: string; participantId: string }) => {
    const res = roomManager.closePoll(data.roomCode, data.participantId);
    if (!res.success) {
      return socket.emit('poll_error', { message: res.error });
    }

    io.in(data.roomCode.toUpperCase()).emit('poll_updated', { poll: res.poll });
  });

  // 9. Creative Features Events
  socket.on('set_vibe', (data: { roomCode: string; participantId: string; vibe: VibeType }) => {
    const parsed = SetVibeSchema.safeParse({ vibe: data.vibe });
    if (!parsed.success) return;

    const res = roomManager.setParticipantVibe(data.roomCode, data.participantId, parsed.data.vibe);
    if (res.success) {
      io.in(data.roomCode.toUpperCase()).emit('vibe_updated', res.vibeState);
    }
  });

  socket.on('start_blind_pick', (data: { roomCode: string; participantId: string; title: string }) => {
    const res = roomManager.startBlindPick(data.roomCode, data.participantId, data.title);
    if (res.success && res.blindPick) {
      io.in(data.roomCode.toUpperCase()).emit('blind_pick_updated', res.blindPick);
    }
  });

  socket.on('nominate_blind_pick', (data: { roomCode: string; participantId: string; title: string; url: string }) => {
    const res = roomManager.nominateBlindPick(data.roomCode, data.participantId, { title: data.title, url: data.url });
    if (res.success && res.blindPick) {
      io.in(data.roomCode.toUpperCase()).emit('blind_pick_updated', res.blindPick);
    }
  });

  socket.on('advance_blind_pick', (data: { roomCode: string; participantId: string; phase: 'voting' | 'revealed' }) => {
    const res = roomManager.advanceBlindPickPhase(data.roomCode, data.participantId, data.phase);
    if (res.success && res.blindPick) {
      io.in(data.roomCode.toUpperCase()).emit('blind_pick_updated', res.blindPick);
    }
  });

  socket.on('vote_blind_pick', (data: { roomCode: string; participantId: string; nominationId: string }) => {
    const res = roomManager.voteBlindPick(data.roomCode, data.participantId, data.nominationId);
    if (res.success && res.blindPick) {
      io.in(data.roomCode.toUpperCase()).emit('blind_pick_updated', res.blindPick);
    }
  });

  socket.on('add_moment_marker', (data: { roomCode: string; participantId: string; title: string; timestampSeconds: number }) => {
    const parsed = CreateMomentMarkerSchema.safeParse({ title: data.title, timestampSeconds: data.timestampSeconds });
    if (!parsed.success) return;

    const res = roomManager.addMomentMarker(data.roomCode, data.participantId, parsed.data.title, parsed.data.timestampSeconds);
    if (res.success && res.marker) {
      io.in(data.roomCode.toUpperCase()).emit('marker_added', res.marker);
    }
  });

  // 10. Host Transfer & Permissions
  socket.on('transfer_host', (data: { roomCode: string; requesterId: string; targetParticipantId: string }) => {
    const parsed = TransferHostSchema.safeParse(data);
    if (!parsed.success) return;

    const res = roomManager.transferHost(data.roomCode, data.requesterId, data.targetParticipantId);
    if (!res.success) {
      return socket.emit('permission_error', { message: res.error });
    }

    if (res.room) {
      io.in(data.roomCode.toUpperCase()).emit('host_changed', {
        hostId: res.room.hostId,
        participants: res.room.participants,
        systemMessage: res.room.messages[res.room.messages.length - 1],
      });
    }
  });

  socket.on('update_permissions', (data: { roomCode: string; requesterId: string; permissions: any }) => {
    const parsed = UpdatePermissionsSchema.safeParse(data.permissions);
    if (!parsed.success) return;

    const res = roomManager.updatePermissions(data.roomCode, data.requesterId, parsed.data);
    if (!res.success) {
      return socket.emit('permission_error', { message: res.error });
    }

    if (res.room) {
      io.in(data.roomCode.toUpperCase()).emit('permissions_updated', res.room.permissions);
    }
  });

  // 11. Leave Room (explicit user leave)
  socket.on('leave_room', (data: { roomCode?: string; participantId?: string }) => {
    const result = roomManager.handleDisconnect(socket.id);
    if (result) {
      const { roomCode, room, participant } = result;
      socket.leave(roomCode.toUpperCase());
      io.in(roomCode.toUpperCase()).emit('participant_left', {
        participantId: participant?.id,
        participants: room.participants,
        hostId: room.hostId,
        pulse: room.pulse,
      });
    }
  });

  // 12. Disconnect
  socket.on('disconnect', () => {
    const result = roomManager.handleDisconnect(socket.id);
    if (result) {
      const { roomCode, room, participant } = result;
      io.in(roomCode.toUpperCase()).emit('participant_left', {
        participantId: participant?.id,
        participants: room.participants,
        hostId: room.hostId,
        pulse: room.pulse,
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`[WatchParty Server] Running on http://localhost:${PORT}`);
});

export { app, server, io, roomManager };
