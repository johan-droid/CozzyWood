# Cozzywood

Cozzywood is a full-stack media room app with synchronized playback, realtime chat, and browser-based video calls.

## Tech Stack

- Frontend: React 19, Vite 8, React Router, Axios, Socket.IO client, PeerJS, React Player, Plyr, hls.js, Emoji Mart
- Backend: Node.js 22, Express 5, Socket.IO 4, Prisma, PostgreSQL, JWT auth, Peer server, optional Redis adapter

## Repository Layout

```text
backend/
  prisma/
  src/
frontend/
  src/
```

## Prerequisites

- Node.js 22.x
- npm
- PostgreSQL
- Optional for production-grade realtime scaling: Redis

## Quick Start

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Backend runs on http://localhost:4000.

Health check: GET http://localhost:4000/api/health

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on http://localhost:5173.

## Feature Summary

### Auth

- Register, login, refresh, logout, current-user profile
- JWT access + refresh token flow
- Cookie-based refresh token handling

### Media

- Protected media room route
- Unified playback for YouTube and direct URLs
- HLS playback support via hls.js + Plyr
- Media upload endpoint with local or S3-compatible storage
- Optional ffmpeg transcode pipeline
- YouTube and Spotify search integrations

### Realtime Sync

- JWT-protected Socket.IO connection
- Room join/leave and state snapshot sync
- Sync events for source, play/pause, seek, buffering, playback rate
- Presence updates per room
- Redis-backed adapter/state store when REDIS_URL is configured

### Realtime Chat

- Chat over the authenticated Socket.IO channel
- PostgreSQL persistence through Prisma
- Room history replay on join/snapshot
- Message types: TEXT and GIF

### Video Call (WebRTC)

- Self-hosted PeerJS signaling endpoint on backend
- In-room peer announcements over Socket.IO
- Local + remote stream rendering in frontend panel
- Dynamic ICE provider support: stun, twilio, metered, custom

## API Endpoints

### Auth

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

### Media

- GET /api/media/youtube/search?q=...
- GET /api/media/spotify/search?q=...
- GET /api/media/spotify/config
- GET /api/media/spotify/auth-url
- POST /api/media/spotify/token
- POST /api/media/spotify/refresh
- POST /api/media/upload (form-data key: media)

### WebRTC

- GET /api/webrtc/config
- GET /api/webrtc/ice-servers

## Realtime Socket Events

### Sync

- sync:source-change
- sync:play
- sync:pause
- sync:seek
- sync:buffer
- sync:rate-change
- presence:update

### Chat

- chat:send
- chat:new
- chat:history-request
- chat:history

### WebRTC

- webrtc:announce
- webrtc:update-media
- webrtc:clear
- webrtc:peer-announced
- webrtc:peer-cleared

## Environment Variables

Use these files as the source of truth:

- backend/.env.example
- frontend/.env.example

Important backend keys:

- DATABASE_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- CLIENT_ORIGIN
- REDIS_URL (optional)
- MEDIA_STORAGE and S3_* keys (if using S3/R2)
- WEBRTC_ICE_PROVIDER plus provider-specific keys

Important frontend keys:

- VITE_API_URL
- VITE_SOCKET_URL
- VITE_SOCKET_PATH

## Database Notes

If you hit local setup issues for chat schema creation, run:

- backend/prisma/manual/phase4_chat.sql

## Production Notes

- Set PEER_SERVER_PROXIED=true when behind a reverse proxy
- If scaling to multiple backend instances, configure Redis for Socket.IO adapter/state sync
- Ensure frontend origin and socket CORS settings match your deployed domains