# Project Audit: Watch Party

**Date:** 2026-10-16  
**Auditor:** Autonomous Lead Software Engineer & System Architect (Antigravity)  
**Workspace:** `/Users/kingpin/Documents/Vinno-1`  

---

## 1. Executive Summary

A comprehensive inspection of the workspace `/Users/kingpin/Documents/Vinno-1` was conducted prior to any architectural or development decisions.

- **Initial State:** Empty directory (`/Users/kingpin/Documents/Vinno-1`).
- **Git Repository:** Not initialized initially; initialized to `main` branch.
- **Pre-existing Code/Assets:** None. No existing packages, configs, or hidden code were present.
- **Node Environment:** Node `v24.16.0`, npm `11.13.0`, Git `2.52.0`.
- **Target Stack:** Modern TypeScript Full-Stack architecture (React + Vite + Tailwind CSS on the frontend; Node.js + Express + Socket.IO + Prisma on the backend; Vitest + Playwright + custom concurrent socket harness for testing).

---

## 2. Requirement Gap Analysis

| Feature Area | Baseline Status | Required Functionality | Target State |
| :--- | :--- | :--- | :--- |
| **Room Creation & Joining** | Missing (0%) | Unique room codes, shareable URLs, participant session identities, host role & transfer, room lifecycle | Server-authoritative room state with persistent & in-memory room manager |
| **Real-Time Playback Sync** | Missing (0%) | Centralized playback state (media, status, timestamp, position, revision), Play/Pause/Seek, late join sync | Server-authoritative timestamped clock model, monotonic time reconciliation |
| **Drift Detection & Correction**| Missing (0%) | Drift calculation, threshold-based gentle vs seek correction, anti-looping, target <500ms drift | Continuous sync engine measuring drift every 1-2s, rate adjustment & seek |
| **Movie Discovery & Catalog** | Missing (0%) | Rich cards, fuzzy search, categories, filter/sort, details, queue addition, offline fallback catalog | In-memory & TMDB-compatible fallback catalog with fuzzy matching (Levenshtein/Fuse-style) |
| **Shared Watch Queue** | Missing (0%) | Add/remove/reorder queue, synchronized updates, host/participant permission models | Centralized playlist queue with optimistic UI and server conflict resolution |
| **Live Chat & Reactions** | Missing (0%) | Real-time chat, sender info, sanitized input, emoji reaction bursts, floating reaction overlays | Socket.IO room messaging with XSS protection and floating canvas/DOM reaction engine |
| **Group Polls** | Missing (0%) | Creation, voting, live tallies, auto/manual close, duplicate prevention | Real-time poll manager with atomic vote counting |
| **Host Transfer & Permissions** | Missing (0%) | Voluntary transfer, automatic host election on departure, permission flags (open vs host-only) | Server-enforced permissions on all playback and queue mutations |
| **Reliability & Recovery** | Missing (0%) | Socket reconnection, late join catch-up, heartbeat/liveness, graceful error states | Auto-reconnect with full room sync snapshot replay, empty room auto-cleanup |
| **Creative Features** | Missing (0%) | Watch Party Pulse, Blind Pick, Vibe Matching, Synchronized Moment Markers, Smart Room Queue, Health Monitor | Full end-to-end implementations with dedicated UI views and socket events |
| **Testing & Performance** | Missing (0%) | Unit tests, Integration tests, 10+ concurrent user simulation, p95 < 250ms propagation, < 500ms drift | Vitest suite, custom multi-client load benchmark script reporting p50/p95/p99 |
| **Deployment Readiness** | Missing (0%) | Production builds, health check `/health`, Dockerfile/hosting instructions, env configs | Production Vite build, Express static serving, unified port or decoupled hosting |

---

## 3. Architecture & Design Decisions

1. **Monorepo / Clean Modular Structure:**
   - `shared/`: TypeScript interfaces, Zod schemas, socket protocol constants.
   - `server/`: Express app, Socket.IO gateway, Room/Playback/Poll/Queue service layers, Prisma SQLite persistence (zero external database setup required locally, fully portable to PostgreSQL for production).
   - `client/`: React 18/19 + Vite + TypeScript + Tailwind CSS, custom hooks (`useWatchParty`, `useDriftCorrection`, `useVideoPlayer`), dark cinematic UI design system.
   - `tests/`: Unit tests, integration tests, performance and concurrent load testing scripts.

2. **Server-Authoritative Clock & Drift Model:**
   - Server holds authoritative state: `{ mediaId, mediaUrl, mediaType, status: 'playing' | 'paused' | 'buffering', positionSeconds, updatedAt: timestamp, revision: number, hostId }`.
   - Clients calculate target position: `targetPosition = (status === 'playing') ? positionSeconds + (Date.now() - updatedAt)/1000 : positionSeconds`.
   - Drift calculation: `drift = Math.abs(currentLocalPosition - targetPosition)`.
   - Drift thresholds:
     - `< 0.15s`: In sync, no action needed.
     - `0.15s - 1.0s`: Gentle correction via playback rate adjust (e.g. 0.95x or 1.05x) if supported.
     - `> 1.0s`: Hard seek to target position with cooldown debounce to prevent thrashing.

3. **Concurrency & Message Ordering:**
   - Playback revisions increment strictly monotonically on the server.
   - Stale commands (where `commandRevision < currentRevision`) are rejected or resolved deterministically.
   - Only validated, accepted state transitions are broadcast to room participants.

4. **Video Player Abstraction:**
   - Unified player interface supporting HTML5 Direct Video (MP4, WebM, HLS) and YouTube Embed API.
   - Handles browser autoplay policy restrictions with intuitive "Click to unmute and sync" banner.

5. **Performance Measurement:**
   - Automated load test script spawning 10+ distinct headless Socket.IO clients connected to a live room.
   - Measuring roundtrip and broadcast latency (p50, p95, p99), validating against the 250 ms p95 threshold.
   - Drift validation under simulated network jitter and delay.

---

## 4. Implementation Roadmap

- **Phase 1: Project Audit & Workspace Scaffolding** (Done)
- **Phase 2: Project Setup & Shared Foundation** (Dependencies, TypeScript, Shared Types & Validation)
- **Phase 3: Backend Core Engine & Socket Protocol** (Room Manager, Central Playback Engine, Persistence)
- **Phase 4: Client Core & Real-time Playback Player** (Video Abstraction, Sync & Drift Correction Engine)
- **Phase 5: Collaborative Features** (Chat, Reactions, Shared Queue, Group Polls, Host Controls)
- **Phase 6: Movie Discovery & Creative Features** (Fuzzy Search, Vibe Matching, Blind Pick, Moment Markers, Pulse, Health Monitor)
- **Phase 7: UI/UX Refinement & Responsive Design** (Dark Cinematic Design System, Accessibility, Toast/Alerts)
- **Phase 8: Comprehensive Automated Testing & Performance Benchmarks** (Unit, Integration, 10+ Client Load Test)
- **Phase 9: Production Build & Deployment Documentation** (Docker, .env.example, DEPLOYMENT.md, PERFORMANCE_REPORT.md)
