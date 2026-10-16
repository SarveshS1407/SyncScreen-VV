import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import { app, server } from '../server/dist/index.js';

async function runProductionSmokeTest() {
  console.log('=======================================================');
  console.log('🧪 RUNNING PRODUCTION SMOKE TEST ON COMPILED ARTIFACTS');
  console.log('=======================================================');

  const SMOKE_PORT = server.listening
    ? (server.address() as any).port
    : await new Promise<number>((resolve) => {
        server.listen(3999, () => resolve(3999));
      });
  console.log(`[Smoke] Production server active on http://localhost:${SMOKE_PORT}`);

  try {
    // 2. Health check
    const healthRes = await fetch(`http://localhost:${SMOKE_PORT}/health`);
    const healthData = await healthRes.json();
    if (healthRes.status !== 200 || healthData.status !== 'ok') {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }
    console.log('✅ 1. Health endpoint GET /health -> OK');

    // 3. Static asset / SPA index.html check
    const rootRes = await fetch(`http://localhost:${SMOKE_PORT}/`);
    const htmlText = await rootRes.text();
    if (rootRes.status !== 200 || !htmlText.includes('<div id="root">')) {
      throw new Error(`SPA root index.html check failed. Status: ${rootRes.status}`);
    }
    console.log('✅ 2. Production frontend SPA GET / -> Serves client/dist/index.html');

    // 4. SPA direct routing fallback check
    const directRouteRes = await fetch(`http://localhost:${SMOKE_PORT}/?room=LUCKY-LOUNGE-100`);
    const directHtml = await directRouteRes.text();
    if (directRouteRes.status !== 200 || !directHtml.includes('<div id="root">')) {
      throw new Error(`SPA direct routing check failed. Status: ${directRouteRes.status}`);
    }
    console.log('✅ 3. Direct invitation routing GET /?room=... -> Serves SPA fallback correctly');

    // 5. REST API Room Creation
    const createRes = await fetch(`http://localhost:${SMOKE_PORT}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: 'SmokeTester', roomName: 'Smoke Test Suite' }),
    });
    const createData = await createRes.json();
    if (createRes.status !== 201 || !createData.roomCode) {
      throw new Error(`API room creation failed: ${JSON.stringify(createData)}`);
    }
    const { roomCode, participant } = createData;
    console.log(`✅ 4. REST API POST /api/rooms -> Room created (${roomCode})`);

    // 6. Socket.IO Real-time Connection & State Sync
    const socket = ClientIO(`http://localhost:${SMOKE_PORT}`, {
      transports: ['websocket'],
    });

    let guestId = '';
    let currentRevision = 0;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket connection timed out')), 4000);

      socket.on('connect', () => {
        socket.emit('join_room', {
          roomCode,
          userName: 'GuestClient',
        });
      });

      socket.on('room_joined', (data: any) => {
        clearTimeout(timer);
        if (!data.room || data.room.code !== roomCode) {
          reject(new Error(`Invalid room_joined payload: ${JSON.stringify(data)}`));
        } else {
          guestId = data.participant.id;
          currentRevision = data.room.playback.revision;
          console.log(`✅ 5. Real-time Socket.IO join_room -> Synchronized room snapshot received`);
          resolve();
        }
      });

      socket.on('join_error', (err: any) => {
        clearTimeout(timer);
        reject(new Error(`Join error: ${JSON.stringify(err)}`));
      });
    });

    // 7. Authoritative Playback Command Propagation
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Playback command timeout')), 3000);

      socket.on('playback_error', (err: any) => {
        clearTimeout(timer);
        reject(new Error(`Playback error received: ${JSON.stringify(err)}`));
      });

      socket.emit('playback_command', {
        roomCode,
        participantId: guestId,
        command: {
          action: 'play',
          positionSeconds: 15,
          clientTimestamp: Date.now(),
          expectedRevision: currentRevision,
        },
      });

      socket.on('playback_update', (data: any) => {
        clearTimeout(timer);
        if (data.playback && data.playback.status === 'playing' && data.playback.positionSeconds >= 15) {
          console.log(`✅ 6. Playback command synchronization -> Real-time status: ${data.playback.status} @ ${data.playback.positionSeconds}s`);
          resolve();
        }
      });
    });

    socket.disconnect();

    console.log('=======================================================');
    console.log('🎉 ALL PRODUCTION SMOKE CHECKS PASSED SUCCESSFULLY!');
    console.log('=======================================================');
  } finally {
    server.close();
  }
}

runProductionSmokeTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Production smoke test failed:', err);
    process.exit(1);
  });
