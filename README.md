# Cozzywood

<p align="center">
  <img src="./readme-banner.svg" alt="Cozzywood animated banner" width="100%" />
</p>

Cozzywood is a full-stack media room platform with synchronized playback, realtime chat, uploads, Spotify and YouTube integrations, and browser-based video calls.

## Quick Links

### Root workspace

- [Root package](./package.json)
- [Root README](./README.md)
- [Root Vite config](./vite.config.ts)
- [Root TypeScript config](./tsconfig.json)
- [Node TypeScript config](./tsconfig.node.json)
- [Landing app entry](./src/main.tsx)
- [Landing app shell](./src/App.tsx)
- [Landing components](./src/components)
- [Theme hook](./src/hooks)

### Backend

- [Backend package](./backend/package.json)
- [Backend process file](./backend/Procfile)
- [Backend server entry](./backend/src/server.js)
- [Backend app wiring](./backend/src/app.js)
- [Backend env config](./backend/src/config/env.js)
- [Prisma client wrapper](./backend/src/lib/prisma.js)
- [Auth middleware](./backend/src/middleware/requireAuth.js)
- [Realtime services](./backend/src/realtime)
- [API routes](./backend/src/routes)
- [Business services](./backend/src/services)
- [Token helpers](./backend/src/utils/tokens.js)
- [Prisma schema](./backend/prisma/schema.prisma)
- [Chat schema migration helper](./backend/prisma/manual/phase4_chat.sql)

### Frontend

- [Frontend package](./frontend/package.json)
- [Frontend README](./frontend/README.md)
- [Frontend Vite config](./frontend/vite.config.js)
- [Frontend ESLint config](./frontend/eslint.config.js)
- [Frontend HTML entry](./frontend/index.html)
- [Frontend app shell](./frontend/src/App.jsx)
- [Frontend bootstrap](./frontend/src/main.jsx)
- [Global styles](./frontend/src/index.css)
- [Auth state](./frontend/src/state/AuthContext.jsx)
- [Page layer](./frontend/src/pages)
- [UI components](./frontend/src/components)
- [API clients](./frontend/src/lib)
- [Static assets](./frontend/public)

## Project Overview

The repository has three technical surfaces:

1. The root TypeScript/Vite workspace, which currently acts as a polished UI/UX design-system demo.
2. The backend Node.js service, which powers auth, media APIs, realtime sync, chat persistence, and WebRTC signaling.
3. The frontend React application, which consumes the backend and provides the media room experience.

## Tech Stack

### Root demo

- React 18.3
- Vite 5
- TypeScript 5.5
- Framer Motion 11
- Lucide React icons

### Backend

- Node.js 22
- Express 5
- Socket.IO 4
- Prisma 6
- PostgreSQL
- JWT-based auth
- Peer server for WebRTC signaling
- Optional Redis adapter for scale-out realtime state

### Frontend

- React 19
- Vite 8
- React Router
- Axios
- Socket.IO client
- PeerJS
- React Player
- Plyr
- hls.js
- Emoji Mart

## Repository Map

### Root demo files

- [package.json](./package.json)
- [index.html](./index.html)
- [tsconfig.json](./tsconfig.json)
- [tsconfig.node.json](./tsconfig.node.json)
- [vite.config.ts](./vite.config.ts)
- [src/App.tsx](./src/App.tsx)
- [src/main.tsx](./src/main.tsx)
- [src/components/Navbar.tsx](./src/components/Navbar.tsx)
- [src/components/Hero.tsx](./src/components/Hero.tsx)
- [src/components/Features.tsx](./src/components/Features.tsx)
- [src/components/Gallery.tsx](./src/components/Gallery.tsx)
- [src/components/Footer.tsx](./src/components/Footer.tsx)
- [src/components/ThemeToggle.tsx](./src/components/ThemeToggle.tsx)
- [src/hooks/useTheme.tsx](./src/hooks/useTheme.tsx)

### Backend technical files

- [backend/package.json](./backend/package.json)
- [backend/Procfile](./backend/Procfile)
- [backend/src/server.js](./backend/src/server.js)
- [backend/src/app.js](./backend/src/app.js)
- [backend/src/config/env.js](./backend/src/config/env.js)
- [backend/src/lib/prisma.js](./backend/src/lib/prisma.js)
- [backend/src/middleware/requireAuth.js](./backend/src/middleware/requireAuth.js)
- [backend/src/routes/auth.routes.js](./backend/src/routes/auth.routes.js)
- [backend/src/routes/media.routes.js](./backend/src/routes/media.routes.js)
- [backend/src/routes/webrtc.routes.js](./backend/src/routes/webrtc.routes.js)
- [backend/src/realtime/socketServer.js](./backend/src/realtime/socketServer.js)
- [backend/src/realtime/peerServer.js](./backend/src/realtime/peerServer.js)
- [backend/src/realtime/syncStateStore.js](./backend/src/realtime/syncStateStore.js)
- [backend/src/services/chat.service.js](./backend/src/services/chat.service.js)
- [backend/src/services/spotify.service.js](./backend/src/services/spotify.service.js)
- [backend/src/services/storage.service.js](./backend/src/services/storage.service.js)
- [backend/src/services/transcode.service.js](./backend/src/services/transcode.service.js)
- [backend/src/services/webrtc.service.js](./backend/src/services/webrtc.service.js)
- [backend/src/services/youtube.service.js](./backend/src/services/youtube.service.js)
- [backend/src/utils/tokens.js](./backend/src/utils/tokens.js)
- [backend/prisma/schema.prisma](./backend/prisma/schema.prisma)
- [backend/prisma/manual/phase4_chat.sql](./backend/prisma/manual/phase4_chat.sql)

### Frontend technical files

- [frontend/package.json](./frontend/package.json)
- [frontend/README.md](./frontend/README.md)
- [frontend/index.html](./frontend/index.html)
- [frontend/vite.config.js](./frontend/vite.config.js)
- [frontend/eslint.config.js](./frontend/eslint.config.js)
- [frontend/src/App.jsx](./frontend/src/App.jsx)
- [frontend/src/main.jsx](./frontend/src/main.jsx)
- [frontend/src/index.css](./frontend/src/index.css)
- [frontend/src/state/AuthContext.jsx](./frontend/src/state/AuthContext.jsx)
- [frontend/src/pages/LoginPage.jsx](./frontend/src/pages/LoginPage.jsx)
- [frontend/src/pages/RegisterPage.jsx](./frontend/src/pages/RegisterPage.jsx)
- [frontend/src/pages/DashboardPage.jsx](./frontend/src/pages/DashboardPage.jsx)
- [frontend/src/pages/MediaPage.jsx](./frontend/src/pages/MediaPage.jsx)
- [frontend/src/components/ProtectedRoute.jsx](./frontend/src/components/ProtectedRoute.jsx)
- [frontend/src/components/ReactUnifiedPlayer.jsx](./frontend/src/components/ReactUnifiedPlayer.jsx)
- [frontend/src/components/HlsPlyrPlayer.jsx](./frontend/src/components/HlsPlyrPlayer.jsx)
- [frontend/src/components/RoomChatPanel.jsx](./frontend/src/components/RoomChatPanel.jsx)
- [frontend/src/components/SpotifyWebPlaybackPanel.jsx](./frontend/src/components/SpotifyWebPlaybackPanel.jsx)
- [frontend/src/components/VideoCallPanel.jsx](./frontend/src/components/VideoCallPanel.jsx)
- [frontend/src/lib/api.js](./frontend/src/lib/api.js)
- [frontend/src/lib/mediaApi.js](./frontend/src/lib/mediaApi.js)
- [frontend/src/lib/socketSync.js](./frontend/src/lib/socketSync.js)
- [frontend/src/lib/webrtcApi.js](./frontend/src/lib/webrtcApi.js)

## Feature Summary

### Authentication

- Register, login, refresh, logout, and current-user profile flows
- JWT access and refresh token handling
- Cookie-based refresh token storage

### Media playback

- Protected media room route
- Unified playback for YouTube and direct URLs
- HLS playback support through hls.js and Plyr
- Media upload endpoint with local or S3-compatible storage
- Optional ffmpeg transcode pipeline
- Spotify and YouTube search integrations

### Realtime synchronization

- JWT-protected Socket.IO connection
- Room join/leave and state snapshot sync
- Sync events for source, play/pause, seek, buffering, and playback rate
- Presence updates per room
- Redis-backed adapter and sync store when configured

### Realtime chat

- Authenticated chat over Socket.IO
- PostgreSQL persistence through Prisma
- Room history replay on join or snapshot
- Message support for text and GIF content

### WebRTC video calls

- Self-hosted PeerJS signaling endpoint on the backend
- In-room peer announcements over Socket.IO
- Local and remote stream rendering in the frontend panel
- ICE provider support for stun, Twilio, Metered, or custom servers

## Run Locally

### 1. Root demo workspace

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run preview
```

### 2. Backend service

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Backend runs on http://localhost:4000.

Health check:

- GET /api/health

### 3. Frontend app

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173.

Useful commands:

```bash
npm run build
npm run lint
npm run preview
```

## Environment Variables

There are no committed .env example files in this workspace, so the source of truth is the env readers in code:

- [Backend env defaults](./backend/src/config/env.js)
- [Frontend API client defaults](./frontend/src/lib/api.js)
- [Frontend socket defaults](./frontend/src/lib/socketSync.js)

### Backend variables

Minimum required for a real deployment:

- DATABASE_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- CLIENT_ORIGIN

Common optional variables:

- PORT
- NODE_ENV
- ACCESS_TOKEN_TTL
- REFRESH_TOKEN_TTL_DAYS
- MAX_USERS
- YOUTUBE_API_KEY
- SPOTIFY_CLIENT_ID
- SPOTIFY_CLIENT_SECRET
- SPOTIFY_REDIRECT_URI
- MEDIA_STORAGE
- MAX_UPLOAD_MB
- ENABLE_TRANSCODE
- FFMPEG_PATH
- S3_REGION
- S3_ENDPOINT
- S3_BUCKET
- S3_ACCESS_KEY_ID
- S3_SECRET_ACCESS_KEY
- S3_PUBLIC_BASE_URL
- REDIS_URL
- SOCKET_CORS_ORIGIN
- SOCKET_PATH
- SYNC_STATE_TTL_SECONDS
- SYNC_PRESENCE_TTL_SECONDS
- CHAT_HISTORY_LIMIT
- CHAT_MAX_MESSAGE_LENGTH
- PEER_SERVER_PATH
- PEER_SERVER_KEY
- PEER_SERVER_URL
- PEER_SERVER_PROXIED
- PEER_SERVER_ALLOW_DISCOVERY
- PEER_SERVER_CONCURRENT_LIMIT
- PEER_SERVER_ALIVE_TIMEOUT_MS
- PEER_SERVER_EXPIRE_TIMEOUT_MS
- WEBRTC_ICE_PROVIDER
- WEBRTC_STUN_URLS
- WEBRTC_ICE_TTL_SECONDS
- WEBRTC_ICE_SERVERS_JSON
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- METERED_TURN_URLS
- METERED_TURN_USERNAME
- METERED_TURN_CREDENTIAL

### Frontend variables

- VITE_API_URL
- VITE_SOCKET_URL
- VITE_SOCKET_PATH

## API Surface

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
- POST /api/media/upload

### WebRTC

- GET /api/webrtc/config
- GET /api/webrtc/ice-servers

## Realtime Events

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

## Database Notes

If local chat schema setup needs a manual fallback, run:

```sql
backend/prisma/manual/phase4_chat.sql
```

The Prisma schema lives at [backend/prisma/schema.prisma](./backend/prisma/schema.prisma).

## Production Notes

- Set PEER_SERVER_PROXIED=true when running behind a reverse proxy.
- Configure Redis when you need multi-instance Socket.IO state sharing.
- Keep frontend origin, socket origin, and backend CORS values aligned in deployment.
