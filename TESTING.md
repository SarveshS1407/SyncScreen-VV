# Testing & Verification Guide: Watch Party

This document outlines the testing strategy, test suites, execution commands, and expected results for the **Watch Party** application.

---

## 1. Test Architecture

The testing framework covers three complementary layers:

1. **Unit Tests (`tests/unit/`):**
   - Pure playback state calculations.
   - Expected server-authoritative position computation.
   - Drift measurement and multi-tier correction thresholds (gentle rate adjust vs hard seek).
   - Clock offset reconciliation.

2. **Integration Tests (`tests/integration/`):**
   - Room lifecycle (creation, human-readable codes, persistence).
   - Multi-user joins, session persistence, and reconnect recovery.
   - Authoritative command versioning and out-of-order rejection.
   - Host transfer and permission enforcement.
   - Shared queue management and poll voting mechanics.

3. **Performance & Concurrency Load Benchmark (`tests/perf-benchmark.ts`):**
   - Spawns 1 host client and 11 distinct guest clients (12 total concurrent users in one room).
   - Measures end-to-end command propagation latency (min, p50, p95, p99, max).
   - Evaluates compliance with the **< 250ms p95** propagation target and **< 500ms** drift correction target.
   - Measures reconnect recovery time.

---

## 2. Test Execution Commands

### Run All Unit & Integration Tests
```bash
npm test
```
*Runs Vitest across `tests/unit` and `tests/integration`.*

### Run Tests in Watch Mode (TDD)
```bash
npm run test:watch
```

### Run 12-Client Concurrency & Latency Benchmark
```bash
npm run test:perf
```

### Type Checking & Lint Verification
```bash
npm run typecheck
```

---

## 3. Manual Multi-User Verification Procedure

To manually verify multi-user synchronization in separate browser contexts:

1. **Start Development Server:**
   ```bash
   npm run dev
   ```
2. **Open Host Browser Window (Chrome):**
   - Navigate to `http://localhost:5173`.
   - Enter your name: `Alice`.
   - Click **Create Watch Room**.
   - Note the room code (e.g. `GOLDEN-CINEMA-482`) or click **Invite Link** to copy the URL.
3. **Open Second Browser Window (Incognito or Safari):**
   - Paste the invitation URL `http://localhost:5173?room=GOLDEN-CINEMA-482`.
   - Enter your name: `Bob`.
   - Click **Join Watch Room**.
4. **Verify Real-Time Synchronization:**
   - Both `Alice` and `Bob` appear in the Party Members list with green online indicators.
   - When Alice presses **Play**, Bob's player starts playing simultaneously.
   - When Bob scrubs the progress bar to 2:00, Alice's video scrubs to 2:00 immediately.
   - Send chat messages and floating emoji reactions: watch reactions float smoothly across both screens.
   - Launch a group poll from Alice's window: vote from Bob's window and verify live percentage updates in real time.
   - Test reconnection: disconnect WiFi or close Bob's tab and re-open: Bob recovers the exact playing timestamp automatically.
