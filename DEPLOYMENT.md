# Deployment Guide: Watch Party

This document outlines the step-by-step procedures for deploying the **Watch Party** application to containerized environments, cloud providers, and unified hosting platforms.

---

## 1. Architecture Overview

- **Frontend:** Single Page Application (SPA) built with React 18, Vite, and Tailwind CSS.
- **Backend:** Node.js, Express, Socket.IO server.
- **Protocol Requirements:** Full WebSocket support (`Upgrade: websocket` headers) with sticky sessions if load-balanced across multiple instances.
- **Database / Persistence:** In-memory high-throughput state manager with optional persistent storage (SQLite or PostgreSQL via Prisma).
- **Static Assets:** Can be served directly via Express in a unified deployment or hosted on a CDN (Vercel, Netlify, Cloudflare Pages, Cloud Storage).

---

## 2. Environment Variables

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `3001` | The HTTP & WebSocket listener port for the backend server |
| `CLIENT_URL` | No | `http://localhost:5173` | The allowed frontend origin for CORS policies |
| `NODE_ENV` | No | `development` | Set to `production` in production deployments |
| `TMDB_API_KEY`| No | *(empty)* | Optional TMDB API key if external movie discovery is preferred |

---

## 3. Production Build & Run

### Step 1: Build all workspaces
```bash
npm run build
```
This builds:
1. `@watch-party/shared` -> `shared/dist`
2. `@watch-party/client` -> `client/dist` (optimized HTML/JS/CSS bundle)
3. `@watch-party/server` -> `server/dist`

### Step 2: Start the Production Server
```bash
npm start
```
By default, the server serves the API and Socket.IO on port `3001`.

---

## 4. Docker Deployment

### Dockerfile
Create a `Dockerfile` at the root:

```dockerfile
# Multi-stage production build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install

COPY . .
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared/package*.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

RUN npm install --omit=dev

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["npm", "start"]
```

### Build & Run Docker Image
```bash
docker build -t watch-party:latest .
docker run -p 3001:3001 --env-file .env watch-party:latest
```

---

## 5. Cloud Platform Recommendations

### A. Render.com / Railway.app (Recommended)
1. Create a **Web Service** pointing to the repository.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. WebSocket support is automatically provisioned out of the box.

### B. Google Cloud Run
1. Build container image and push to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/watch-party:latest
   ```
2. Deploy service enabling WebSockets with session affinity:
   ```bash
   gcloud run deploy watch-party \
     --image gcr.io/[PROJECT_ID]/watch-party:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3001 \
     --session-affinity
   ```

### C. Decoupled Deployment (Vercel + Node VPS)
- **Frontend on Vercel:** Deploy `client/` folder. In Vercel Project Settings, set `Root Directory` to `client` and configure rewrite rules to redirect `/socket.io` to your backend URL.
- **Backend on Render / AWS ECS / DigitalOcean:** Expose port `3001` and set `CLIENT_URL=https://your-frontend.vercel.app`.

---

## 6. Health & Liveness Checks

A health endpoint is available at:
```http
GET /health
```
Response:
```json
{
  "status": "ok",
  "uptime": 124.5,
  "timestamp": 1729068000000,
  "roomsCount": 3,
  "memoryUsage": { ... }
}
```
Use this endpoint for Kubernetes liveness probes and AWS Target Group health checks.
