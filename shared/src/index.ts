import { z } from 'zod';

// ==========================================
// 1. PLAYBACK STATE & CONTROLS
// ==========================================

export type PlaybackStatus = 'playing' | 'paused' | 'buffering';
export type MediaType = 'mp4' | 'webm' | 'hls' | 'youtube' | 'custom';

export interface PlaybackState {
  mediaId: string;
  mediaUrl: string;
  mediaTitle: string;
  mediaType: MediaType;
  status: PlaybackStatus;
  positionSeconds: number;
  durationSeconds: number;
  playbackRate: number;
  updatedAt: number; // Server-authoritative epoch timestamp (ms)
  revision: number;  // Monotonically increasing revision counter
  lastActionBy: string; // Participant ID
}

export type SyncStatus = 'synced' | 'correcting' | 'buffering' | 'reconnecting' | 'desynced';

export interface DriftDiagnostic {
  driftMs: number;
  localPos: number;
  serverTargetPos: number;
  rttMs: number;
  correctionAction: 'none' | 'rate_adjust' | 'hard_seek';
  appliedRate: number;
  timestamp: number;
}

// ==========================================
// 2. PARTICIPANTS & PERMISSIONS
// ==========================================

export const PARTICIPANT_COLORS = [
  '#6366F1', // Indigo (Host primary)
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#06B6D4', // Cyan
  '#E11D48', // Crimson
  '#84CC16', // Lime
  '#A855F7', // Violet
  '#FB923C', // Orange
  '#0EA5E9', // Sky
  '#D946EF', // Fuchsia
  '#22C55E', // Green
];

export function getDeterministicColor(index: number, seed?: string): string {
  if (index >= 0 && index < PARTICIPANT_COLORS.length) {
    return PARTICIPANT_COLORS[index];
  }
  const baseOffset = seed ? seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : 0;
  const hue = Math.round((baseOffset + index * 137.508) % 360);
  const lightness = 55 + (index % 3) * 6;
  return `hsl(${hue}, 85%, ${lightness}%)`;
}

export interface Participant {
  id: string;              // Unique persistent session ID
  socketId: string;        // Current active socket ID
  name: string;
  userName?: string;       // Compatibility alias for name
  isHost: boolean;
  joinedAt: number;
  lastSeenAt: number;
  isOnline: boolean;
  avatarColor: string;
  color?: string;          // Compatibility alias for avatarColor
  playbackPosition?: number; // Current playback position on timeline (seconds)
  lastPositionUpdate?: number; // Epoch timestamp of last position update (ms)
}

export interface RoomPermissions {
  controlPlayback: 'host_only' | 'everyone';
  manageQueue: 'host_only' | 'everyone';
  createPolls: 'host_only' | 'everyone';
}

export interface RoomSettings {
  autoPlayNext: boolean;
  allowParticipantInvites: boolean;
  driftThresholdMs: number;
}

// ==========================================
// 3. QUEUE & PLAYLIST
// ==========================================

export interface QueueItem {
  id: string;
  title: string;
  url: string;
  type: MediaType;
  durationSeconds: number;
  thumbnailUrl?: string;
  addedBy: {
    id: string;
    name: string;
  };
  addedAt: number;
  sourceType: 'sample' | 'custom' | 'youtube';
}

// ==========================================
// 4. CHAT & EMOJI REACTIONS
// ==========================================

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatarColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface ReactionEvent {
  id: string;
  emoji: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  x?: number; // 0.0 - 1.0 relative viewport position
  y?: number;
}

// ==========================================
// 5. GROUP POLLS
// ==========================================

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // List of participant IDs who voted for this option
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: number;
  closed: boolean;
  closedAt?: number;
}

// ==========================================
// 6. CREATIVE FEATURES
// ==========================================

// Watch Party Pulse: real-time activity metrics
export interface WatchPartyPulse {
  activeWatchers: number;
  reactionEnergy: number; // 0 - 100 calculated from recent reactions/chat activity
  syncHealthScore: number; // 0 - 100 room-wide average sync health
  recentActivityCount: number;
}

// Blind Pick: nominate choices secretly, then vote & reveal
export type BlindPickPhase = 'idle' | 'nominating' | 'voting' | 'revealed';

export interface BlindPickNomination {
  id: string;
  title: string;
  url: string;
  nominatedBy: string; // masked to other participants during nominating/voting
  votes: string[];
}

export interface BlindPickSession {
  id: string;
  phase: BlindPickPhase;
  title: string;
  nominations: BlindPickNomination[];
  winnerId?: string;
  createdAt: number;
}

// Vibe Matching: collective room mood matching
export type VibeType = 'suspenseful' | 'funny' | 'relaxing' | 'nostalgic' | 'mind_bending' | 'epic';

export interface VibeState {
  activeVibe?: VibeType;
  vibeVotes: Record<string, VibeType>; // participantId -> VibeType
  recommendedGenres: string[];
}

// Synchronized Moment Markers
export interface MomentMarker {
  id: string;
  title: string;
  timestampSeconds: number;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: number;
  reactionCount?: number;
}

// Diagnostic Health Monitor
export interface RoomHealthReport {
  roomId: string;
  totalParticipants: number;
  onlineParticipants: number;
  serverTime: number;
  playbackRevision: number;
  averageRttMs: number;
  maxDriftMs: number;
  recentCorrectionsCount: number;
  reconnectEventsCount: number;
  serverUptimeSeconds: number;
}

// ==========================================
// 7. COMPLETE ROOM STATE SNAPSHOT
// ==========================================

export interface RoomState {
  code: string;
  name: string;
  hostId: string;
  createdAt: number;
  permissions: RoomPermissions;
  settings: RoomSettings;
  participants: Participant[];
  playback: PlaybackState;
  queue: QueueItem[];
  messages: ChatMessage[];
  activePoll?: Poll;
  pulse: WatchPartyPulse;
  blindPick?: BlindPickSession;
  vibe: VibeState;
  markers: MomentMarker[];
}

// ==========================================
// 8. MOVIE DISCOVERY CATALOG
// ==========================================

export interface MovieItem {
  id: string;
  title: string;
  year: number;
  genre: string[];
  description: string;
  posterUrl: string;
  backdropUrl?: string;
  durationSeconds: number;
  rating: number; // 0 - 10
  videoUrl: string;
  videoType: MediaType;
  isPlayable: boolean; // clearly distinguished: true if playable directly, false if metadata/trailer
  trailerUrl?: string;
  vibeTags: VibeType[];
}

// ==========================================
// 9. ZOD SCHEMAS FOR API & SOCKET VALIDATION
// ==========================================

export const CreateRoomSchema = z.object({
  roomName: z.string().min(2).max(50).optional(),
  userName: z.string().trim().min(1, "Name cannot be empty").max(30, "Name too long"),
  permissions: z.object({
    controlPlayback: z.enum(['host_only', 'everyone']).default('everyone'),
    manageQueue: z.enum(['host_only', 'everyone']).default('everyone'),
    createPolls: z.enum(['host_only', 'everyone']).default('everyone'),
  }).optional(),
});

export const JoinRoomSchema = z.object({
  roomCode: z.string().trim().min(3).max(30).toUpperCase(),
  userName: z.string().trim().min(1, "Name cannot be empty").max(30, "Name too long"),
  participantId: z.string().optional(),
});

export const PlaybackCommandSchema = z.object({
  action: z.enum(['play', 'pause', 'seek', 'change_media', 'rate_change']),
  positionSeconds: z.number().min(0),
  playbackRate: z.number().min(0.25).max(3.0).optional(),
  mediaUrl: z.string().url().optional(),
  mediaTitle: z.string().optional(),
  mediaType: z.enum(['mp4', 'webm', 'hls', 'youtube', 'custom']).optional(),
  durationSeconds: z.number().min(0).optional(),
  clientTimestamp: z.number(),
  expectedRevision: z.number().int().min(0),
});

export const SendMessageSchema = z.object({
  text: z.string().trim().min(1, "Message cannot be empty").max(500, "Message too long"),
});

export const SendReactionSchema = z.object({
  emoji: z.string().min(1).max(8),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
});

export const AddQueueItemSchema = z.object({
  title: z.string().trim().min(1).max(100),
  url: z.string().url(),
  type: z.enum(['mp4', 'webm', 'hls', 'youtube', 'custom']),
  durationSeconds: z.number().min(0),
  thumbnailUrl: z.string().url().optional(),
});

export const ReorderQueueSchema = z.object({
  itemIds: z.array(z.string()),
});

export const CreatePollSchema = z.object({
  question: z.string().trim().min(3).max(150),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(6),
});

export const VotePollSchema = z.object({
  pollId: z.string(),
  optionId: z.string(),
});

export const CreateMomentMarkerSchema = z.object({
  title: z.string().trim().min(1).max(80),
  timestampSeconds: z.number().min(0),
});

export const SetVibeSchema = z.object({
  vibe: z.enum(['suspenseful', 'funny', 'relaxing', 'nostalgic', 'mind_bending', 'epic']),
});

export const TransferHostSchema = z.object({
  targetParticipantId: z.string(),
});

export const UpdatePermissionsSchema = z.object({
  controlPlayback: z.enum(['host_only', 'everyone']).optional(),
  manageQueue: z.enum(['host_only', 'everyone']).optional(),
  createPolls: z.enum(['host_only', 'everyone']).optional(),
});
