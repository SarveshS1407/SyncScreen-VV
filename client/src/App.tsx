import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage.js';
import { VideoPlayer } from './components/VideoPlayer.js';
import { RoomControls } from './components/RoomControls.js';
import { ChatPanel } from './components/ChatPanel.js';
import { ParticipantList } from './components/ParticipantList.js';
import { QueuePanel } from './components/QueuePanel.js';
import { WatchPartyPulse } from './components/WatchPartyPulse.js';
import { MovieDiscoveryModal } from './components/MovieDiscoveryModal.js';
import { PollsModal } from './components/PollsModal.js';
import { VibeMatchingModal } from './components/CreativeFeatures/VibeMatchingModal.js';
import { BlindPickModal } from './components/CreativeFeatures/BlindPickModal.js';
import { MomentMarkerModal } from './components/CreativeFeatures/MomentMarkerModal.js';
import { HealthMonitorModal } from './components/HealthMonitorModal.js';
import { useWatchParty } from './hooks/useWatchParty.js';
import { apiUrl } from './services/api.js';
import { MessageSquare, ListVideo, Users, Bookmark, Film, RefreshCw, AlertTriangle, Play } from 'lucide-react';
import { MediaType, VibeType } from '@watch-party/shared';

export function App() {
  const [roomCode, setRoomCode] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'queue' | 'members'>('chat');

  // Modal visibility states
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [showVibe, setShowVibe] = useState(false);
  const [showBlindPick, setShowBlindPick] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showMomentMarker, setShowMomentMarker] = useState(false);
  const [vibeGenre, setVibeGenre] = useState<string>('All');

  // Check URL search parameters on initial load & restore remembered username
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    const nameParam = params.get('name') || localStorage.getItem('syncscreen_username');
    if (code) {
      setRoomCode(code.toUpperCase());
    }
    if (nameParam && code) {
      setUserName(nameParam);
    }
  }, []);

  // Hook connecting to room once roomCode and userName are set
  const {
    room,
    currentParticipant,
    isHost,
    connectionStatus,
    errorMessage,
    chatError,
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
    startBlindPick,
    nominateBlindPick,
    advanceBlindPick,
    voteBlindPick,
  } = useWatchParty(roomCode, userName);

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Handle Create Room with timeout, error extraction, and double-click protection
  const handleCreateRoom = async (name: string, roomTitle?: string) => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const url = apiUrl('/api/rooms');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: name, roomName: roomTitle }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || `Server error (${res.status}). Please try again.`);
        return;
      }
      if (!data.roomCode) {
        setCreateError('Invalid response received from server.');
        return;
      }
      setUserName(name);
      setRoomCode(data.roomCode);
      try { localStorage.setItem('syncscreen_username', name); } catch {}
      window.history.pushState({}, '', `?room=${data.roomCode}`);
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      const msg = isTimeout
        ? 'Connection timed out while reaching the real-time server. Please try again.'
        : 'Unable to connect to the SyncScreen real-time server. Please check your internet connection or try again in a moment.';
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Join Room
  const handleJoinRoom = (code: string, name: string) => {
    setCreateError(null);
    setUserName(name);
    setRoomCode(code);
    try { localStorage.setItem('syncscreen_username', name); } catch {}
    window.history.pushState({}, '', `?room=${code}`);
  };

  // Handle Leave Room
  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave this watch party?')) {
      leaveRoom();
      localStorage.removeItem(`wp_user_${roomCode}`);
      setRoomCode('');
      setUserName('');
      setCreateError(null);
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  // If user is not yet in a room or disconnected with error, show Landing
  if (!roomCode || !userName || !room || !currentParticipant) {
    return (
      <div className="min-h-screen bg-cinematic-950">
        {errorMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-600/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-3 border border-rose-400/30">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
            <button
              onClick={() => {
                setRoomCode('');
                setUserName('');
                setCreateError(null);
                window.history.pushState({}, '', window.location.pathname);
              }}
              className="underline hover:text-rose-200 ml-2 font-semibold"
            >
              Back to Home
            </button>
          </div>
        )}
        <LandingPage
          initialRoomCode={roomCode}
          onJoin={handleJoinRoom}
          onCreate={handleCreateRoom}
          isCreating={isCreating}
          createError={createError}
        />
      </div>
    );
  }

  // Permission evaluation
  const canControlPlayback = room.permissions.controlPlayback === 'everyone' || isHost;
  const canManageQueue = room.permissions.manageQueue === 'everyone' || isHost;
  const canCreatePolls = room.permissions.createPolls === 'everyone' || isHost;

  return (
    <div className="min-h-screen bg-cinematic-950 flex flex-col text-slate-100 selection:bg-brand-primary selection:text-white">
      {/* Reconnecting Banner */}
      {connectionStatus === 'reconnecting' && (
        <div className="bg-amber-500/90 text-cinematic-950 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Temporary connection drop. Reconnecting to party room...</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-cinematic-900/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center font-black text-white shadow-md ring-1 ring-white/10">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
          <div>
            <span className="font-black text-white text-base tracking-tight hidden sm:inline">
              SyncScreen
            </span>
            <span className="text-[10px] font-mono font-bold text-brand-primary block -mt-1 sm:hidden">
              SYNC
            </span>
          </div>
        </div>

        {/* Real-time Watch Party Pulse Activity Gauge */}
        <WatchPartyPulse
          pulse={room.pulse}
          onOpenHealth={() => setShowHealth(true)}
        />
      </header>

      {/* Main Party Room Body */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-5">
        {/* Left Column: Player & Room Controls */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <RoomControls
            room={room}
            isHost={isHost}
            onOpenDiscovery={() => setShowDiscovery(true)}
            onOpenPolls={() => setShowPolls(true)}
            onOpenVibe={() => setShowVibe(true)}
            onOpenBlindPick={() => setShowBlindPick(true)}
            onOpenHealth={() => setShowHealth(true)}
            onUpdatePermissions={updatePermissions}
            onLeaveRoom={handleLeaveRoom}
          />

          {/* Central Synchronized Video Player */}
          <VideoPlayer
            playback={room.playback}
            isHost={isHost}
            canControl={canControlPlayback}
            roomCode={room.code}
            markers={room.markers}
            floatingReactions={floatingReactions}
            participants={room.participants}
            currentParticipantId={currentParticipant?.id}
            onCommand={(action, pos, opts) => sendPlaybackCommand(action, pos, opts)}
            onOpenMarkerModal={() => setShowMomentMarker(true)}
            onOpenDiscovery={() => setShowDiscovery(true)}
          />

          {/* Moment Markers Strip */}
          {room.markers.length > 0 && (
            <div className="p-3.5 bg-cinematic-900/90 border border-slate-800/80 rounded-2xl glass-panel flex items-center gap-2.5 overflow-x-auto shadow-sm">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 flex-shrink-0">
                <Bookmark className="w-4 h-4" /> Bookmarks:
              </span>
              <div className="flex items-center gap-2">
                {room.markers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => canControlPlayback && sendPlaybackCommand('seek', m.timestampSeconds)}
                    className="px-3 py-1 rounded-xl bg-cinematic-800/90 hover:bg-cinematic-700 border border-slate-700/80 text-xs text-slate-200 whitespace-nowrap transition flex items-center gap-1.5 group"
                  >
                    <span className="font-medium group-hover:text-white">{m.title}</span>
                    <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-400/10 px-1 rounded">
                      {Math.floor(m.timestampSeconds / 60)}:{(m.timestampSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Multi-tab Interactive Sidebar */}
        <div className="w-full lg:w-96 flex flex-col h-[520px] lg:h-auto min-h-[480px]">
          {/* Tabs Navigation */}
          <div className="flex bg-cinematic-900 border border-slate-800/90 p-1.5 rounded-2xl mb-3 glass-panel shadow-sm">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'chat'
                  ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'queue'
                  ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListVideo className="w-3.5 h-3.5" />
              <span>Queue ({room.queue.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'members'
                  ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Party ({room.participants.filter(p => p.isOnline).length})</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="flex-1 min-h-0">
            {activeTab === 'chat' && (
              <ChatPanel
                messages={room.messages}
                currentUserId={currentParticipant.id}
                onSendMessage={sendChatMessage}
                onSendReaction={sendReaction}
                chatError={chatError}
              />
            )}

            {activeTab === 'queue' && (
              <QueuePanel
                queue={room.queue}
                playback={room.playback}
                canManage={canManageQueue}
                onPlayItem={playQueueItem}
                onRemoveItem={removeFromQueue}
                onReorder={reorderQueue}
                onOpenDiscovery={() => setShowDiscovery(true)}
              />
            )}

            {activeTab === 'members' && (
              <ParticipantList
                participants={room.participants}
                currentUserId={currentParticipant.id}
                isHost={isHost}
                onTransferHost={transferHost}
              />
            )}
          </div>
        </div>
      </main>

      {/* Modals for Discovery & Creative Features */}
      <MovieDiscoveryModal
        isOpen={showDiscovery}
        onClose={() => setShowDiscovery(false)}
        initialGenre={vibeGenre}
        onPlayNow={(movie) => {
          sendPlaybackCommand('change_media', 0, {
            mediaUrl: movie.url,
            mediaTitle: movie.title,
            mediaType: movie.type,
            durationSeconds: movie.durationSeconds,
          });
        }}
        onAddToQueue={(movie) => {
          addToQueue(movie);
        }}
      />

      <PollsModal
        isOpen={showPolls}
        onClose={() => setShowPolls(false)}
        activePoll={room.activePoll}
        currentUserId={currentParticipant.id}
        isHost={isHost}
        canCreatePoll={canCreatePolls}
        onCreatePoll={createPoll}
        onVote={votePoll}
        onClosePoll={closePoll}
      />

      <VibeMatchingModal
        isOpen={showVibe}
        onClose={() => setShowVibe(false)}
        vibeState={room.vibe}
        currentUserId={currentParticipant.id}
        onSelectVibe={setVibe}
        onFilterCatalogByVibe={(vibe) => {
          const recGenre = room.vibe.recommendedGenres[0] || 'All';
          setVibeGenre(recGenre);
          setShowVibe(false);
          setShowDiscovery(true);
        }}
      />

      <BlindPickModal
        isOpen={showBlindPick}
        onClose={() => setShowBlindPick(false)}
        blindPick={room.blindPick}
        isHost={isHost}
        currentUserId={currentParticipant.id}
        onStartBlindPick={startBlindPick}
        onNominate={nominateBlindPick}
        onAdvancePhase={advanceBlindPick}
        onVote={voteBlindPick}
        onPlayWinner={(movie) => {
          sendPlaybackCommand('change_media', 0, {
            mediaUrl: movie.url,
            mediaTitle: movie.title,
            mediaType: movie.type,
            durationSeconds: movie.durationSeconds,
          });
        }}
      />

      <MomentMarkerModal
        isOpen={showMomentMarker}
        onClose={() => setShowMomentMarker(false)}
        currentPlaybackSeconds={room.playback.positionSeconds}
        onAddMarker={addMomentMarker}
      />

      <HealthMonitorModal
        isOpen={showHealth}
        onClose={() => setShowHealth(false)}
        roomCode={room.code}
      />
    </div>
  );
}
