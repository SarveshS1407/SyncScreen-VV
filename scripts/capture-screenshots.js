import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function waitForServer(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return true;
    } catch (e) {
      // wait
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function run() {
  console.log('[Screenshots] Starting production server on port 3001...');
  const serverProcess = spawn('node', ['server/dist/index.js'], {
    env: { ...process.env, PORT: '3001', NODE_ENV: 'production' },
    stdio: 'inherit'
  });

  try {
    const isReady = await waitForServer('http://localhost:3001/health');
    if (!isReady) {
      throw new Error('Server did not become ready in time.');
    }
    console.log('[Screenshots] Server is live.');

    fs.mkdirSync('docs/screenshots', { recursive: true });

    // 1. Capture Landing Page
    console.log('[Screenshots] Capturing 01-landing-page.png...');
    execSync(
      `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --virtual-time-budget=2000 --window-size=1440,900 --screenshot=docs/screenshots/01-landing-page.png http://localhost:3001/`
    );

    // 2. Create room to get genuine room URL
    const createRes = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: 'Alex', roomName: "Alex's Cinema Lounge" })
    });
    const { roomCode } = await createRes.json();
    console.log(`[Screenshots] Created room ${roomCode}`);

    // 3. Capture Watch Room
    console.log('[Screenshots] Capturing 02-watch-room.png...');
    execSync(
      `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --virtual-time-budget=4000 --window-size=1440,900 --screenshot=docs/screenshots/02-watch-room.png "http://localhost:3001/?room=${roomCode}&name=Alex"`
    );

    console.log('[Screenshots] Successfully generated genuine application screenshots in docs/screenshots/');
  } finally {
    serverProcess.kill();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
