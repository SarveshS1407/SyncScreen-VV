import { io as ClientIO } from 'socket.io-client';

const BASE_URL = 'https://syncscreen-vv.vercel.app';
const SERVER_URL = 'https://sheets-activation-prisoners-stanford.trycloudflare.com';

async function verifyLivePlayback() {
  console.log(`[Playback & Colors Verification] Testing against live deployment: ${BASE_URL}`);

  // 1. Create Room via REST API
  const createRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: 'Alex', roomName: 'Playback QA Room' }),
  });

  const createData = await createRes.json();
  if (createRes.status !== 201 || !createData.roomCode) {
    throw new Error(`Failed to create room: ${JSON.stringify(createData)}`);
  }

  const { roomCode, participant: hostPart } = createData;
  console.log(`[1/8] Created room ${roomCode} for host ${hostPart.id} (${hostPart.name})`);
  console.log(`      Host assigned color: ${hostPart.avatarColor}`);
  if (!hostPart.avatarColor) throw new Error('Host missing avatarColor');

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
  console.log(`[2/8] Both Host and Guest Socket.IO connections established`);

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
  console.log(`[3/8] Host joined room. Initial playback: status=${hostRoom.playback.status}, mediaUrl=${hostRoom.playback.mediaUrl}`);

  // Guest joins with duplicate display name "Alex" to test duplicate name resilience
  const guestJoinPromise = new Promise<any>((resolve) => {
    guestSocket.on('room_joined', resolve);
  });
  guestSocket.emit('join_room', {
    roomCode,
    userName: 'Alex', // Same display name as host
  });
  const guestData = await guestJoinPromise;
  const guestPart = guestData.participant;
  console.log(`[4/8] Guest joined with duplicate name 'Alex'. Unique ID: ${guestPart.id}, Color: ${guestPart.avatarColor}`);

  // Verify unique ID and distinct color
  if (guestPart.id === hostPart.id) {
    throw new Error(`Collision! Duplicate name resulted in identical participant ID: ${guestPart.id}`);
  }
  if (guestPart.avatarColor === hostPart.avatarColor) {
    throw new Error(`Collision! Duplicate name received identical color: ${guestPart.avatarColor}`);
  }
  console.log(`      Verified: No ID collision, distinct stable colors assigned (${hostPart.avatarColor} vs ${guestPart.avatarColor})`);

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
  console.log(`[5/8] Play command verified! Guest received status=playing, position=${playingState.positionSeconds}, revision=${playingState.revision}`);

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
  console.log(`[6/8] Pause command verified! Guest received status=paused, position=${pausedState.positionSeconds}, revision=${pausedState.revision}`);

  // 5. Test Timeline Position Reporting & Broadcast
  const guestPosPromise = new Promise<any>((resolve) => {
    guestSocket.on('participant_position_updated', (data) => {
      if (data.participantId === hostPart.id) resolve(data);
    });
  });

  hostSocket.emit('report_position', {
    roomCode,
    participantId: hostPart.id,
    positionSeconds: 25.4,
  });

  const hostReported = await guestPosPromise;
  console.log(`[7/8] Host timeline position broadcast verified! Guest received host position: ${hostReported.positionSeconds}s`);

  // Guest reports position back to host
  const hostPosPromise = new Promise<any>((resolve) => {
    hostSocket.on('participant_position_updated', (data) => {
      if (data.participantId === guestPart.id) resolve(data);
    });
  });

  guestSocket.emit('report_position', {
    roomCode,
    participantId: guestPart.id,
    positionSeconds: 25.1,
  });

  const guestReported = await hostPosPromise;
  console.log(`[8/8] Guest timeline position broadcast verified! Host received guest position: ${guestReported.positionSeconds}s`);

  hostSocket.disconnect();
  guestSocket.disconnect();
  console.log('🎉 ALL 8/8 LIVE PLAYBACK, COLOR STABILITY, AND TIMELINE POSITION CHECKS PASSED ON PRODUCTION!');
}

verifyLivePlayback().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
