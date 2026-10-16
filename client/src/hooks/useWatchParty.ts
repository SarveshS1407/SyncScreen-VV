import { useEffect, useState, useCallback, useRef } from 'react';
import {
  RoomState,
  Participant,
  PlaybackState,
  ChatMessage,
  ReactionEvent,
  Poll,
  QueueItem,
  VibeState,
  VibeType,
  BlindPickSession,
  MomentMarker,
  WatchPartyPulse,
  MediaType
} from '@watch-party/shared';
import { socketService } from '../services/socket.js';

export function useWatchParty(roomCode: string, userName: string, initialParticipantId?: string) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<ReactionEvent[]>([]);

  const participantIdRef = useRef<string>(initialParticipantId || localStorage.getItem(`wp_user_${roomCode}`) || '');

  // Connect socket and join room
  useEffect(() => {
    if (!roomCode || !userName) {
      setRoom(null);
      setCurrentParticipant(null);
      setErrorMessage(null);
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    const socket = socketService.connect();

    const onConnect = () => {
      setConnectionStatus('connected');
      socket.emit('join_room', {
        roomCode,
        userName,
        participantId: participantIdRef.current || undefined,
      });
    };

    const onDisconnect = () => {
      setConnectionStatus('reconnecting');
    };

    const onRoomJoined = (data: { room: RoomState; participant: Participant; serverTime: number }) => {
      setRoom(data.room);
      setCurrentParticipant(data.participant);
      participantIdRef.current = data.participant.id;
      localStorage.setItem(`wp_user_${roomCode}`, data.participant.id);
      setConnectionStatus('connected');
      setErrorMessage(null);
    };

    const onJoinError = (data: { message: string }) => {
      setErrorMessage(data.message);
      setConnectionStatus('disconnected');
    };

    const onPlaybackUpdate = (data: { playback: PlaybackState }) => {
      setRoom(prev => prev ? { ...prev, playback: data.playback } : null);
    };

    const onParticipantJoined = (data: { participant: Participant; participants: Participant[]; pulse: WatchPartyPulse; systemMessage?: ChatMessage }) => {
      setRoom(prev => {
        if (!prev) return null;
        const messages = data.systemMessage ? [...prev.messages, data.systemMessage] : prev.messages;
        return { ...prev, participants: data.participants, pulse: data.pulse, messages };
      });
    };

    const onParticipantLeft = (data: { participantId: string; participants: Participant[]; hostId: string; pulse: WatchPartyPulse }) => {
      setRoom(prev => {
        if (!prev) return null;
        return { ...prev, participants: data.participants, hostId: data.hostId, pulse: data.pulse };
      });
    };

    const onChatMessage = (message: ChatMessage) => {
      setRoom(prev => prev ? { ...prev, messages: [...prev.messages, message] } : null);
    };

    const onReactionEvent = (reaction: ReactionEvent) => {
      setFloatingReactions(prev => [...prev.slice(-15), reaction]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id));
      }, 2500);
    };

    const onQueueUpdated = (data: { queue: QueueItem[] }) => {
      setRoom(prev => prev ? { ...prev, queue: data.queue } : null);
    };

    const onPollUpdated = (data: { poll: Poll }) => {
      setRoom(prev => prev ? { ...prev, activePoll: data.poll } : null);
    };

    const onVibeUpdated = (vibeState: VibeState) => {
      setRoom(prev => prev ? { ...prev, vibe: vibeState } : null);
    };

    const onBlindPickUpdated = (blindPick: BlindPickSession) => {
      setRoom(prev => prev ? { ...prev, blindPick } : null);
    };

    const onMarkerAdded = (marker: MomentMarker) => {
      setRoom(prev => {
        if (!prev) return null;
        const updated = [...prev.markers, marker].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
        return { ...prev, markers: updated };
      });
    };

    const onHostChanged = (data: { hostId: string; participants: Participant[]; systemMessage?: ChatMessage }) => {
      setRoom(prev => {
        if (!prev) return null;
        const messages = data.systemMessage ? [...prev.messages, data.systemMessage] : prev.messages;
        return { ...prev, hostId: data.hostId, participants: data.participants, messages };
      });
      setCurrentParticipant(prev => prev ? { ...prev, isHost: prev.id === data.hostId } : null);
    };

    const onPermissionsUpdated = (permissions: RoomState['permissions']) => {
      setRoom(prev => prev ? { ...prev, permissions } : null);
    };

    const onPulseUpdated = (pulse: WatchPartyPulse) => {
      setRoom(prev => prev ? { ...prev, pulse } : null);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_joined', onRoomJoined);
    socket.on('join_error', onJoinError);
    socket.on('playback_update', onPlaybackUpdate);
    socket.on('participant_joined', onParticipantJoined);
    socket.on('participant_reconnected', onParticipantJoined);
    socket.on('participant_left', onParticipantLeft);
    socket.on('chat_message', onChatMessage);
    socket.on('reaction_event', onReactionEvent);
    socket.on('queue_updated', onQueueUpdated);
    socket.on('poll_updated', onPollUpdated);
    socket.on('vibe_updated', onVibeUpdated);
    socket.on('blind_pick_updated', onBlindPickUpdated);
    socket.on('marker_added', onMarkerAdded);
    socket.on('host_changed', onHostChanged);
    socket.on('permissions_updated', onPermissionsUpdated);
    socket.on('pulse_updated', onPulseUpdated);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_joined', onRoomJoined);
      socket.off('join_error', onJoinError);
      socket.off('playback_update', onPlaybackUpdate);
      socket.off('participant_joined', onParticipantJoined);
      socket.off('participant_reconnected', onParticipantJoined);
      socket.off('participant_left', onParticipantLeft);
      socket.off('chat_message', onChatMessage);
      socket.off('reaction_event', onReactionEvent);
      socket.off('queue_updated', onQueueUpdated);
      socket.off('poll_updated', onPollUpdated);
      socket.off('vibe_updated', onVibeUpdated);
      socket.off('blind_pick_updated', onBlindPickUpdated);
      socket.off('marker_added', onMarkerAdded);
      socket.off('host_changed', onHostChanged);
      socket.off('permissions_updated', onPermissionsUpdated);
      socket.off('pulse_updated', onPulseUpdated);
    };
  }, [roomCode, userName]);

  // Actions
  const sendPlaybackCommand = useCallback((
    action: 'play' | 'pause' | 'seek' | 'change_media' | 'rate_change',
    positionSeconds: number,
    opts?: {
      playbackRate?: number;
      mediaUrl?: string;
      mediaTitle?: string;
      mediaType?: MediaType;
      durationSeconds?: number;
    }
  ) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('playback_command', {
      roomCode: room.code,
      participantId: currentParticipant.id,
      command: {
        action,
        positionSeconds,
        playbackRate: opts?.playbackRate,
        mediaUrl: opts?.mediaUrl,
        mediaTitle: opts?.mediaTitle,
        mediaType: opts?.mediaType,
        durationSeconds: opts?.durationSeconds,
        clientTimestamp: Date.now(),
        expectedRevision: room.playback.revision,
      },
    });
  }, [room, currentParticipant]);

  const sendChatMessage = useCallback((text: string) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('send_chat', {
      roomCode: room.code,
      senderId: currentParticipant.id,
      text,
    });
  }, [room, currentParticipant]);

  const sendReaction = useCallback((emoji: string, x?: number, y?: number) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('send_reaction', {
      roomCode: room.code,
      senderId: currentParticipant.id,
      emoji,
      x,
      y,
    });
  }, [room, currentParticipant]);

  const addToQueue = useCallback((item: { title: string; url: string; type: MediaType; durationSeconds: number; thumbnailUrl?: string }) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('add_queue_item', {
      roomCode: room.code,
      participantId: currentParticipant.id,
      item,
    });
  }, [room, currentParticipant]);

  const removeFromQueue = useCallback((itemId: string) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('remove_queue_item', {
      roomCode: room.code,
      participantId: currentParticipant.id,
      itemId,
    });
  }, [room, currentParticipant]);

  const reorderQueue = useCallback((itemIds: string[]) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('reorder_queue', {
      roomCode: room.code,
      participantId: currentParticipant.id,
      itemIds,
    });
  }, [room, currentParticipant]);

  const playQueueItem = useCallback((itemId: string) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('play_queue_item', {
      roomCode: room.code,
      participantId: currentParticipant.id,
      itemId,
    });
  }, [room, currentParticipant]);

  const createPoll = useCallback((question: string, options: string[]) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('create_poll', {
      roomCode: room.code,
      participantId: currentParticipant.id,
      question,
      options,
    });
  }, [room, currentParticipant]);

  const votePoll = useCallback((optionId: string) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('vote_poll', {
      roomCode: room.code,
      participantId: currentParticipant.id,
      optionId,
    });
  }, [room, currentParticipant]);

  const closePoll = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('close_poll', {
      roomCode: room.code,
      participantId: currentParticipant.id,
    });
  }, [room, currentParticipant]);

  const setVibe = useCallback((vibe: VibeType) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('set_vibe', {
      roomCode: room.code,
      participantId: currentParticipant.id,
      vibe,
    });
  }, [room, currentParticipant]);

  const addMomentMarker = useCallback((title: string, timestampSeconds: number) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('add_moment_marker', {
      roomCode: room.code,
      participantId: currentParticipant.id,
      title,
      timestampSeconds,
    });
  }, [room, currentParticipant]);

  const transferHost = useCallback((targetParticipantId: string) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('transfer_host', {
      roomCode: room.code,
      requesterId: currentParticipant.id,
      targetParticipantId,
    });
  }, [room, currentParticipant]);

  const updatePermissions = useCallback((permissions: Partial<RoomState['permissions']>) => {
    const socket = socketService.getSocket();
    if (!socket || !currentParticipant || !room) return;

    socket.emit('update_permissions', {
      roomCode: room.code,
      requesterId: currentParticipant.id,
      permissions,
    });
  }, [room, currentParticipant]);

  const leaveRoom = useCallback(() => {
    const socket = socketService.getSocket();
    if (socket && room && currentParticipant) {
      socket.emit('leave_room', {
        roomCode: room.code,
        participantId: currentParticipant.id,
      });
    }
    setRoom(null);
    setCurrentParticipant(null);
    setErrorMessage(null);
    setConnectionStatus('disconnected');
    socketService.disconnect();
  }, [room, currentParticipant]);

  return {
    room,
    currentParticipant,
    isHost: currentParticipant?.isHost ?? false,
    connectionStatus,
    errorMessage,
    floatingReactions,
    sendPlaybackCommand,
    sendChatMessage,
    sendReaction,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    playQueueItem,
    createPoll,
    votePoll,
    closePoll,
    setVibe,
    addMomentMarker,
    transferHost,
    updatePermissions,
    leaveRoom,
  };
}
