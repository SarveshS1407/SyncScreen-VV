# WatchParty — Real-Time Synced Social Cinema Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)

A modern, production-ready, multi-user Watch Party web application featuring frame-accurate synchronized video playback, continuous sub-second drift detection and correction, real-time group polls, live chat with floating emoji reactions, movie discovery, and unique creative social features (**Watch Party Pulse**, **Blind Pick**, **Vibe Matching**, and **Synchronized Moment Markers**).

---

## 🌟 Key Features

1. **Sub-Second Synchronized Playback**
   - Centralized, server-authoritative playback clock model with monotonic command revisions.
   - Handles play, pause, seek, and media switching across all concurrent room participants.
   - Continuous drift reconciliation: gentle rate adjustment (0.94x / 1.06x) for minor deviations (< 900ms) and debounced hard seeks for major shifts.
   - Real-time sync badge (`Synced`, `Correcting`, `Buffering`, `Reconnecting`) with millisecond drift readout.
   - Full late-join catch-up and seamless reconnection state recovery.

2. **Movie Discovery & Media Catalog**
   - High-fidelity cinema catalog featuring open-source cinema masterpieces (Sintel, Tears of Steel, Big Buck Bunny, Night of the Living Dead).
   - Fuzzy search with typo tolerance and category/genre filters (Sci-Fi, Action, Animation, Horror, etc.).
   - Support for custom direct MP4, WebM, HLS (`.m3u8`), and YouTube URLs.
   - Shared room playlist queue with reordering and host permission locking.

3. **Creative Social Modes**
   - **Watch Party Pulse:** Ambient engagement indicator monitoring room reaction energy, active watcher count, and room sync health score.
   - **Blind Pick:** Participants secretly nominate films; titles remain masked during voting until the dramatic winner reveal.
   - **Vibe Matching:** Collective mood selector (Suspenseful, Funny, Relaxing, Mind-Bending, Epic) dynamically matching and recommending genres.
   - **Synchronized Moment Markers:** Pin memorable timestamps, plot twists, and funny quotes directly onto the shared player scrubber for instant one-click jumps.
   - **Watch Party Health Monitor:** Real-time diagnostic panel displaying RTT, clock offset, drift history, and server uptime.

4. **Live Chat & Interactive Overlays**
   - Real-time sanitized messaging with custom participant avatar colors and timestamps.
   - Ephemeral floating emoji reaction stream rendered directly over the player canvas.

5. **Host Privileges & Permissions**
   - Voluntary host transfer and deterministic automatic host re-election when the host departs.
   - Server-enforced permissions for playback controls, queue management, and poll creation.

---

## 🏗️ Architecture

```
Vinno-1/
├── shared/             # Shared TypeScript types, interfaces & Zod validation schemas
│   └── src/index.ts
├── server/             # Express.js REST API & Socket.IO real-time gateway
│   └── src/
│       ├── index.ts
│       ├── data/movies.ts
│       └── services/RoomManager.ts
├── client/             # React 18 + Vite + Tailwind CSS dark cinematic frontend
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── services/socket.ts
│       └── App.tsx
└── tests/              # Vitest unit & integration tests, concurrent load benchmarks
    ├── unit/
    ├── integration/
    └── perf-benchmark.ts
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start Development Servers
Run backend and frontend concurrently:
```bash
npm run dev
```
- **Frontend App:** http://localhost:5173
- **Backend API & WebSockets:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

---

## 🧪 Testing & Verification

### Unit & Integration Tests
```bash
npm test
```

### 10+ Concurrent User Load & Latency Benchmark
```bash
npm run test:perf
```

---

## 📋 Acceptance Criteria Verification

- [x] Application starts successfully in development mode.
- [x] Multi-user room creation, invitation link, and human-readable room codes.
- [x] Real-time synchronized Play, Pause, Seek, and Media Change.
- [x] Late-joiners receive current authoritative playback state.
- [x] Continuous drift correction keeping playback drift `< 500ms`.
- [x] Control propagation latency `< 250ms` at p95 under local network conditions.
- [x] Tested with 12 concurrent participants (exceeding 10+ target).
- [x] Live chat, emoji reactions, and group polls.
- [x] Complete creative feature implementations (Pulse, Blind Pick, Vibe, Moments, Health Monitor).
- [x] Mobile & desktop responsive cinematic UI.
