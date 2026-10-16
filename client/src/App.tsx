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
import { MessageSquare, ListVideo, Users, Bookmark, Film } from 'lucide-react';
import { MediaType, VibeType } from '@watch-party/shared';

export function App() {
  const [roomCode, setRoomCode] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'queue' | 'members' | 'moments'>('chat');

  // Modal visibility states
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [showVibe, setShowVibe] = useState(false);
  const [showBlindPick, setShowBlindPick] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showMomentMarker, setShowMomentMarker] = useState(false);

  // Check URL search parameters on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setRoomCode(code.toUpperCase());
    }
  }, []);

  // Hook connecting to room once roomCode and userName are set
  const {
    room,
    currentParticipant,
    isHost,
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
  } = useWatchParty(roomCode, userName);

  // Handle Create Room
  const handleCreateRoom = async (name: string, roomTitle?: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: name, roomName: roomTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to create room');
        return;
      }
      setUserName(name);
      setRoomCode(data.roomCode);
      window.history.pushState({}, '', `?room=${data.roomCode}`);
    } catch (err) {
      alert('Network error connecting to server');
    }
  };

  // Handle Join Room
  const handleJoinRoom = (code: string, name: string) => {
    setUserName(name);
    setRoomCode(code);
    window.history.pushState({}, '', `?room=${code}`);
  };

  // If user is not yet in a room or disconnected with error, show Landing
  if (!roomCode || !userName || !room || !currentParticipant) {
    return (
      <div className="min-h-screen bg-cinematic-950">
        {errorMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-5 py-2.5 rounded-2xl shadow-xl font-medium text-xs flex items-center gap-2">
            <span>{errorMessage}</span>
            <button
              onClick={() => { setRoomCode(''); setUserName(''); }}
              className="underline ml-2"
            >
              Back to Home
            </button>
          </div>
        )}
        <LandingPage
          initialRoomCode={roomCode}
          onJoin={handleJoinRoom}
          onCreate={handleCreateRoom}
        />
      </div>
    );
  }

  // Permission evaluation
  const canControlPlayback = room.permissions.controlPlayback === 'everyone' || isHost;
  const canManageQueue = room.permissions.manageQueue === 'everyone' || isHost;
  const canCreatePolls = room.permissions.createPolls === 'everyone' || isHost;

  return (
    <div className="min-h-screen bg-cinematic-950 flex flex-col text-slate-100">
      {/* Top Header Bar */}
      <header className="px-4 py-3 border-b border-slate-800/80 bg-cinematic-900/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-white shadow-md">
            WP
          </div>
          <span className="font-extrabold text-white text-sm hidden sm:inline">
            WatchParty
          </span>
        </div>

        {/* Real-time Watch Party Pulse Activity Gauge */}
        <WatchPartyPulse
          pulse={room.pulse}
          onOpenHealth={() => setShowHealth(true)}
        />
      </header>

      {/* Main Party Room Body */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-5">
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
          />

          {/* Central Synchronized Video Player */}
          <VideoPlayer
            playback={room.playback}
            isHost={isHost}
            canControl={canControlPlayback}
            roomCode={room.code}
            markers={room.markers}
            floatingReactions={floatingReactions}
            onCommand={(action, pos, opts) => sendPlaybackCommand(action, pos, opts)}
            onOpenMarkerModal={() => setShowMomentMarker(true)}
          />

          {/* Moment Markers Strip */}
          {room.markers.length > 0 && (
            <div className="p-3 bg-cinematic-900/90 border border-slate-800 rounded-2xl glass-panel flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 flex-shrink-0">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" /> Bookmarks:
              </span>
              <div className="flex items-center gap-2">
                {room.markers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => canControlPlayback && sendPlaybackCommand('seek', m.timestampSeconds)}
                    className="px-2.5 py-1 rounded-xl bg-cinematic-800 hover:bg-cinematic-700 border border-slate-700 text-xs text-slate-200 whitespace-nowrap transition flex items-center gap-1"
                  >
                    <span>{m.title}</span>
                    <span className="font-mono text-[10px] text-amber-400">
                      ({Math.floor(m.timestampSeconds / 60)}:{(m.timestampSeconds % 60).toString().padStart(2, '0')})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Multi-tab Interactive Sidebar */}
        <div className="w-full lg:w-96 flex flex-col h-[600px] lg:h-auto min-h-[500px]">
          {/* Tabs Navigation */}
          <div className="flex bg-cinematic-900 border border-slate-800 p-1 rounded-2xl mb-3 glass-panel">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'chat'
                  ? 'bg-brand-primary text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Chat
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'queue'
                  ? 'bg-brand-primary text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListVideo className="w-3.5 h-3.5" /> Queue ({room.queue.length})
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'members'
                  ? 'bg-brand-primary text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Party ({room.participants.filter(p => p.isOnline).length})
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
        onStartBlindPick={(title) => {
          const socket = (window as any)._socket;
          if (socket) socket.emit('start_blind_pick', { roomCode: room.code, participantId: currentParticipant.id, title });
        }}
        onNominate={(title, url) => {
          const socket = (window as any)._socket;
          if (socket) socket.emit('nominate_blind_pick', { roomCode: room.code, participantId: currentParticipant.id, title, url });
        }}
        onAdvancePhase={(phase) => {
          const socket = (window as any)._socket;
          if (socket) socket.emit('advance_blind_pick', { roomCode: room.code, participantId: currentParticipant.id, phase });
        }}
        onVote={(nominationId) => {
          const socket = (window as any)._socket;
          if (socket) socket.emit('vote_blind_pick', { roomCode: room.code, participantId: currentParticipant.id, nominationId });
        }}
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
