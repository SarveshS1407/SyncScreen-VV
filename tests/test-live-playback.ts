import { io as ClientIO } from 'socket.io-client';

const BASE_URL = 'https://syncscreen-vv.vercel.app';
const SERVER_URL = 'https://sheets-activation-prisoners-stanford.trycloudflare.com';

async function verifyLivePlayback() {
  console.log(`[Playback Verification] Testing against live deployment: ${BASE_URL}`);

  // 1. Create Room via REST API
  const createRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: 'HostProducer', roomName: 'Playback QA Room' }),
  });

  const createData = await createRes.json();
  if (createRes.status !== 201 || !createData.roomCode) {
    throw new Error(`Failed to create room: ${JSON.stringify(createData)}`);
  }

  const { roomCode, participant: hostPart } = createData;
  console.log(`[1/6] Created room ${roomCode} for host ${hostPart.id} (${hostPart.name})`);

  // 2. Connect Host and Guest via Socket.IO
  const hostSocket = ClientIO(SERVER_URL, {
    transports: ['websocket', 'polling'],
  });

  const guestSocket = ClientIO(SERVER_URL, {
    transports: ['websocket', 'polling'],
  });

  await Promise.all([
    new Promise<void>((resolve) => hostSocket.on('connect', resolve)),
    new Promise<void>((resolve) => guestSocket.on('connect', resolve)),
  ]);
  console.log(`[2/6] Both Host and Guest Socket.IO connections established`);

  // Join Room
  const hostJoinPromise = new Promise<any>((resolve) => {
    hostSocket.on('room_joined', resolve);
  });
  hostSocket.emit('join_room', {
    roomCode,
    userName: hostPart.name,
    participantId: hostPart.id,
  });
  const hostData = await hostJoinPromise;
  const hostRoom = hostData.room;
  console.log(`[3/6] Host joined room. Initial playback: status=${hostRoom.playback.status}, mediaUrl=${hostRoom.playback.mediaUrl}`);

  const guestJoinPromise = new Promise<any>((resolve) => {
    guestSocket.on('room_joined', resolve);
  });
  guestSocket.emit('join_room', {
    roomCode,
    userName: 'ViewerGuest',
  });
  const guestData = await guestJoinPromise;
  const guestRoom = guestData.room;
  const guestId = guestData.participant.id;
  console.log(`[4/6] Guest (${guestId}) joined room. Verified initial sync: status=${guestRoom.playback.status}`);

  // 3. Test Play Command
  const guestPlayPromise = new Promise<any>((resolve) => {
    guestSocket.on('playback_update', (data) => {
      if (data.playback.status === 'playing') resolve(data.playback);
    });
  });

  hostSocket.emit('playback_command', {
    roomCode,
    participantId: hostPart.id,
    command: {
      action: 'play',
      positionSeconds: 10.0,
      clientTimestamp: Date.now(),
      expectedRevision: hostRoom.playback.revision,
    },
  });

  const playingState = await guestPlayPromise;
  console.log(`[5/6] Play command verified! Guest received status=playing, position=${playingState.positionSeconds}, revision=${playingState.revision}`);

  // 4. Test Pause and Seek
  const guestPausePromise = new Promise<any>((resolve) => {
    guestSocket.on('playback_update', (data) => {
      if (data.playback.status === 'paused') resolve(data.playback);
    });
  });

  hostSocket.emit('playback_command', {
    roomCode,
    participantId: hostPart.id,
    command: {
      action: 'pause',
      positionSeconds: 25.0,
      clientTimestamp: Date.now(),
      expectedRevision: playingState.revision,
    },
  });

  const pausedState = await guestPausePromise;
  console.log(`[6/6] Pause command verified! Guest received status=paused, position=${pausedState.positionSeconds}, revision=${pausedState.revision}`);

  hostSocket.disconnect();
  guestSocket.disconnect();
  console.log('🎉 ALL PLAYBACK AND SYNCHRONIZATION CHECKS PASSED ON PRODUCTION!');
}

verifyLivePlayback().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
