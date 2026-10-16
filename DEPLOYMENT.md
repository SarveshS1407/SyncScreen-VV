# Deployment & Production Runbook: SyncScreen Watch Party

This document outlines the step-by-step procedures for deploying and running the **SyncScreen** application across containerized environments, cloud providers, and unified or decoupled hosting platforms.

---

## 1. Architecture & Hosting Strategy

The application consists of:
- **Frontend SPA:** React 18, TypeScript, Vite, Tailwind CSS (located in `client/`).
- **Backend API & WebSocket Server:** Node.js, Express, Socket.IO (located in `server/`).
- **Shared Code:** Types and Zod schemas in `shared/`.

### Deployment Models:
1. **Unified Single-Service (Recommended for zero-configuration):**
   The Express server serves the REST API, Socket.IO WebSockets, and the static compiled frontend (`client/dist`) from a single port.
   - **Supported on:** Render, Railway, Fly.io, DigitalOcean App Platform, AWS ECS, Google Cloud Run, or any Docker/VPS host.
   - **Advantage:** No CORS complexity, no external proxy required, instant room links.

2. **Decoupled Architecture (Vercel Frontend + Persistent WebSocket Backend):**
   - **Frontend:** Hosted on Vercel (using [`vercel.json`](file:///vercel.json)).
   - **Backend:** Hosted on Render, Railway, or Fly.io (where long-lived persistent WebSocket connections are maintained).
   - **Environment Connection:** Frontend points to the backend via `VITE_SERVER_URL=https://your-backend.onrender.com`.

---

## 2. Environment Variables Reference

| Variable | Target | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Server | No | `3001` | Server listener port |
| `CLIENT_URL` | Server | No | `http://localhost:5173` | Allowed frontend origins for CORS (comma-separated if multiple, e.g. `https://syncscreen.vercel.app`) |
| `NODE_ENV` | Server | No | `production` | Set to `production` in production environments |
| `VITE_SERVER_URL` | Client | No | *(empty)* | External backend URL for decoupled frontend hosting on Vercel |
| `TMDB_API_KEY` | Server | No | *(empty)* | Optional TMDB API key if external film search is desired |

---

## 3. Step-by-Step Deployment Procedures

### Method A: One-Click Render Deployment (Unified)

1. Fork or push the repository to GitHub: `https://github.com/SarveshS1407/SyncScreen-VV.git`.
2. Log into [Render.com](https://render.com) and click **New + > Blueprint**.
3. Select your repository. Render automatically reads [`render.yaml`](file:///render.yaml):
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. Click **Apply**.
5. Once deployed, copy your live Render URL (e.g. `https://syncscreen-watch-party.onrender.com`).
6. Set the `CLIENT_URL` environment variable in Render settings to your assigned URL.

---

### Method B: Decoupled Deployment (Vercel Frontend + Render Backend)

#### Step 1: Deploy Backend on Render / Railway
1. Deploy the backend as a Node Web Service using the steps in Method A.
2. Note your backend URL: e.g. `https://syncscreen-api.onrender.com`.

#### Step 2: Deploy Frontend on Vercel
1. Log into [Vercel](https://vercel.com) and click **Add New > Project**.
2. Import the `SyncScreen-VV` repository.
3. Configure project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (or `client`)
   - **Build Command:** `npm run build -w shared && npm run build -w client`
   - **Output Directory:** `client/dist`
4. Add Environment Variable:
   - `VITE_SERVER_URL` = `https://syncscreen-api.onrender.com`
5. Click **Deploy**.
6. In your Render backend settings, update `CLIENT_URL` to include your new Vercel domain (e.g. `https://syncscreen-vv.vercel.app`).

---

### Method C: Docker & Docker Compose (Self-Hosted / VPS)

The repository includes a production-hardened multi-stage [`Dockerfile`](file:///Dockerfile) and [`docker-compose.yml`](file:///docker-compose.yml).

#### Run with Docker Compose:
```bash
# Build and run the unified container
docker compose up --build -d

# Check running status and health check
docker compose ps

# View container logs
docker compose logs -f
```

#### Run with Plain Docker:
```bash
docker build -t syncscreen:latest .
docker run -d -p 3001:3001 -e NODE_ENV=production -e CLIENT_URL=http://your-server-ip:3001 --name syncscreen syncscreen:latest
```

---

## 4. Production Smoke Verification

Before declaring a deployment live, execute the automated production smoke test:

```bash
npm run test:smoke
```

This verifies:
1. HTTP GET `/health` returns 200 with uptime and room metrics.
2. HTTP GET `/` serves the compiled Vite SPA bundle (`index.html`).
3. SPA routing fallback for direct room invitation links (`/?room=CODE`).
4. HTTP POST `/api/rooms` creates a new room with human-readable code.
5. Real-time WebSocket connection joins the room and receives the synchronized snapshot.
6. Playback command broadcasts real-time state across participants.

---

## 5. Production Health & Monitoring

The backend exposes a health and diagnostic probe:
```http
GET /health
```
Response format:
```json
{
  "status": "ok",
  "uptime": 1254.3,
  "timestamp": 1729094400000,
  "roomsCount": 3,
  "memoryUsage": {
    "rss": 54231040,
    "heapTotal": 31252480,
    "heapUsed": 21849120
  }
}
```
Use this endpoint for Kubernetes liveness/readiness probes, AWS ALB target group health checks, or UptimeRobot monitors.
