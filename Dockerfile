# Multi-stage production build for Watch Party
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files for optimized caching
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies including workspace links
RUN npm install

# Copy application source code
COPY . .

# Run production build across all workspaces (shared -> client -> server)
RUN npm run build

# Production Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared/package*.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/package*.json ./client/
COPY --from=builder /app/client/dist ./client/dist

# Install production dependencies only
RUN npm install --omit=dev

EXPOSE 3001

# Healthcheck probe using the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["npm", "start"]
