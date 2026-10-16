# SyncScreen — Real-Time Multi-User Watch Party Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-39%2F39%20Passing-brightgreen.svg)](file:///tests)
[![Benchmark](https://img.shields.io/badge/p95%20Latency-6.19ms-brightgreen.svg)](file:///tests/perf-benchmark.ts)

A production-grade, multi-user Watch Party web application featuring frame-accurate synchronized video playback, continuous sub-second drift detection and correction, real-time group polls, live chat with floating emoji reactions, movie discovery catalog, and creative social features (**Watch Party Pulse**, **Blind Pick**, **Vibe Matching**, and **Synchronized Moment Markers**).

---

## 🌟 Key Features

1. **Sub-Second Synchronized Playback**
   - Centralized, server-authoritative playback clock model with monotonic command revisions.
   - Synchronized Play, Pause, Seek, and Media Change across all connected room participants.
   - Continuous drift reconciliation: gentle rate adjustment (0.94x / 1.06x) for minor deviations (< 900ms) and debounced hard seeks for major shifts.
   - Real-time sync badge (`Synced`, `Correcting`, `Buffering`, `Reconnecting`) with millisecond drift readout.
   - Full late-join catch-up and seamless reconnection state recovery (measured at 4.75ms recovery).

2. **Movie Discovery & Media Catalog**
   - High-fidelity cinema catalog featuring open-source cinema masterpieces (Sintel, Tears of Steel, Big Buck Bunny, Night of the Living Dead).
   - Fuzzy search with typo tolerance and category/genre filters (Sci-Fi, Action, Animation, Horror, etc.).
   - Support for custom direct MP4, WebM, HLS (`.m3u8`), and YouTube URLs.
   - Shared room playlist queue with reordering, deduplication, and host permission locking.

3. **Creative Social Modes**
   - **Watch Party Pulse:** Ambient engagement indicator monitoring room reaction energy, active watcher count, and room sync health score.
   - **Blind Pick:** Participants secretly nominate films; titles remain masked during voting until the dramatic winner reveal.
   - **Vibe Matching:** Collective mood selector (Suspenseful, Funny, Relaxing, Mind-Bending, Epic) dynamically matching and recommending genres.
   - **Synchronized Moment Markers:** Pin memorable timestamps, plot twists, and funny quotes directly onto the shared player scrubber for instant one-click jumps.
   - **Watch Party Health Monitor:** Real-time diagnostic panel displaying RTT, clock offset, drift history, and server uptime.

4. **Live Chat & Interactive Overlays**
   - Real-time sanitized messaging with custom participant avatar colors and timestamps.
   - Sliding-window rate limiter (5 msgs / 2s per user) preventing spam flooding with in-app error feedback.
   - Ephemeral floating emoji reaction stream rendered directly over the player canvas.

5. **Host Privileges & Permissions**
   - Voluntary host transfer and deterministic automatic host re-election when the host departs.
   - Server-enforced permissions for playback controls, queue management, and poll creation.

---

## 💻 Technology Stack

- **Frontend:** React 18, TypeScript 5.7, Vite 6, Tailwind CSS, Lucide React, Socket.IO Client.
- **Backend:** Node.js 20+, Express 4.21, Socket.IO 4.8, Zod 3.24.
- **Shared Workspace:** Monorepo package (`@watch-party/shared`) with TypeScript contracts, Zod schemas, and data models.
- **Testing & QA:** Vitest 3, TypeScript compiler (`tsc --noEmit`), standalone concurrency benchmark suite, and production artifact smoke tests.
- **Deployment:** Multi-stage Dockerfile, Docker Compose, Render blueprint (`render.yaml`), and Vercel configuration (`vercel.json`).

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
│       ├── services/api.ts
│       └── App.tsx
├── tests/              # Vitest unit & integration tests, load benchmark & smoke tests
│   ├── unit/playback-drift.test.ts
│   ├── integration/room-lifecycle.test.ts
│   ├── integration/multi-client-sessions.test.ts
│   ├── integration/phase3-features.test.ts
│   ├── perf-benchmark.ts
│   └── smoke-test.ts
├── Dockerfile          # Multi-stage production container build
├── docker-compose.yml  # One-command container orchestration
├── render.yaml         # Render Infrastructure-as-Code blueprint
└── vercel.json         # Vercel configuration for decoupled frontend hosting
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js >= 18.0.0 (tested on Node v20 & v24)
- npm >= 9.0.0

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/SarveshS1407/SyncScreen-VV.git
cd SyncScreen-VV
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

## ⚙️ Environment Variables

| Variable | Scope | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Server | No | `3001` | Server listener port |
| `CLIENT_URL` | Server | No | `http://localhost:5173` | Allowed frontend origins for CORS (comma-separated if multiple) |
| `NODE_ENV` | Server | No | `development` | Set to `production` in production environments |
| `VITE_SERVER_URL` | Client | No | *(empty)* | Optional external backend URL for decoupled frontend (Vercel) hosting |
| `TMDB_API_KEY` | Server | No | *(empty)* | Optional TMDB API key (if omitted, rich local cinema catalog is used) |

---

## 🧪 Testing & Verification Suites

### 1. Run All Unit & Integration Tests (39 Tests)
```bash
npm test
```
*Runs Vitest across `tests/unit` and `tests/integration` (100% pass rate).*

### 2. Run Type Checks Across All Workspaces
```bash
npm run typecheck
```
*Executes `tsc --noEmit` across `@watch-party/shared`, `@watch-party/server`, and `@watch-party/client` (0 errors).*

### 3. Run Concurrency & Latency Benchmark (12 Clients)
```bash
npm run test:perf
```
*Spawns 1 host + 11 guest clients (12 concurrent users), evaluating command propagation latency (p95: 6.19ms) and post-correction drift (30ms).*

### 4. Run Production Smoke Test on Compiled Artifacts
```bash
npm run test:smoke
```
*Validates the built production server (`server/dist/index.js`), `/health` endpoint, static SPA assets, direct invitation routing, REST API room creation, Socket.IO connections, and authoritative playback commands.*

### 5. Production Build
```bash
npm run build
```
*Compiles all workspaces into production bundles in ~1.5s.*

---

## 🎬 Supported Media Sources

- **Direct Native Video:** MP4, WebM, Ogg formats over HTTP/HTTPS.
- **Adaptive Streams:** HLS (`.m3u8`) direct media streams.
- **YouTube:** Full URL embeds (`https://www.youtube.com/watch?v=...` or `https://youtu.be/...`).
- **Open Cinema Masterpieces:** Built-in high-quality Creative Commons films (*Sintel*, *Tears of Steel*, *Big Buck Bunny*, *Night of the Living Dead*).

---

## ⚠️ Known Limitations & Edge Cases

1. **DRM-Protected Sources:**
   - Proprietary subscription streaming platforms (Netflix, Amazon Prime, Disney+, Apple TV+) require hardware-level Widevine/FairPlay DRM and reject iframe embedding or direct stream extraction. The application clearly labels these as metadata/preview only in the discovery catalog.
2. **Browser Autoplay Restrictions:**
   - Modern browsers (Chrome, Safari, Firefox) prohibit unmuted video autoplay without prior user interaction. When joining an active room where a video is already playing, the app presents an interactive *"Autoplay Blocked — Click to Unmute & Sync"* overlay to comply with browser policies while immediately locking onto the server's synchronized timestamp.

---

## 🚢 Deployment Architecture & Options

The application supports two production deployment architectures:

### Option A: Unified Single-Service Deployment (Recommended)
In unified mode, the Node.js Express server hosts the REST API, Socket.IO WebSockets, and directly serves the compiled React SPA static assets from `client/dist`.

- **Run locally with Docker:**
  ```bash
  docker compose up --build
  ```
- **Deploy to Render / Railway / Fly.io:**
  - Build command: `npm install && npm run build`
  - Start command: `npm start`
  - Blueprint included in [`render.yaml`](file:///render.yaml).

### Option B: Decoupled Deployment (Vercel Frontend + Persistent Backend)
- **Frontend on Vercel:** Connect GitHub repository, set framework to **Vite**, and set environment variable `VITE_SERVER_URL=https://your-backend.onrender.com`. (Configuration included in [`vercel.json`](file:///vercel.json)).
- **Backend on Render / AWS ECS / DigitalOcean:** Expose port `3001` and set `CLIENT_URL=https://your-app.vercel.app`.

*For detailed step-by-step instructions, see [`DEPLOYMENT.md`](file:///DEPLOYMENT.md).*

---

## 📄 License

MIT License. Open source and built for collaborative cinema experiences.
