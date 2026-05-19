# Cozzywood

Phase 1 scaffold is now set up with:

- `frontend`: React + React Router + Axios + Tailwind CSS
- `backend`: Express + Prisma + PostgreSQL + bcrypt + JWT + cookie-parser

## Run Locally

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

Backend runs on `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Phase 1 Auth Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Phase 2 Media

Implemented features:

- React media room at `/media` (protected route)
- `ReactPlayer` unified playback for YouTube and direct URLs
- `Plyr.js` + `hls.js` player mode for HLS (`.m3u8`) and file URLs
- YouTube Data API search endpoint
- Spotify Web API search endpoint (client credentials)
- Spotify auth/token helpers + Web Playback SDK panel (premium user token required)
- Media upload endpoint with `multer`
- Storage adapters:
  - Local filesystem (`MEDIA_STORAGE=local`)
  - S3-compatible (AWS S3 / Cloudflare R2) (`MEDIA_STORAGE=s3`)
- Optional FFmpeg transcode on video upload

## Phase 3 Realtime Sync

Implemented features:

- Socket.IO v4 server attached to the backend HTTP server
- JWT-protected socket authentication (same access token flow as API)
- Room join/leave + room snapshot sync
- Sync events for:
  - `sync:source-change`
  - `sync:play`
  - `sync:pause`
  - `sync:seek`
  - `sync:buffer`
  - `sync:rate-change`
- Realtime room presence updates (`presence:update`)
- Redis adapter + Redis-backed state store when `REDIS_URL` is configured
- Automatic in-memory fallback when Redis is unavailable

### Phase 3 Env

Backend (`backend/.env`):

```bash
REDIS_URL=
SOCKET_CORS_ORIGIN=http://localhost:5173
SOCKET_PATH=/socket.io
SYNC_STATE_TTL_SECONDS=86400
SYNC_PRESENCE_TTL_SECONDS=3600
```

Frontend (`frontend/.env`):

```bash
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
VITE_SOCKET_PATH=/socket.io
```

## Phase 4 Realtime Chat

Implemented features:

- Chat runs on the same authenticated Socket.IO connection as sync.
- Room chat history is loaded from PostgreSQL on join/snapshot.
- New chat messages are persisted via Prisma and broadcast in real time.
- Message types supported:
  - `TEXT`
  - `GIF` (URL-based, optional Giphy API integration can be added later)
- Frontend custom chat panel includes:
  - Emoji picker via Emoji Mart
  - Timestamp formatting via `date-fns`
  - Message history + live updates in each room

### Phase 4 Socket Events

- `chat:send`
- `chat:new`
- `chat:history-request`
- `chat:history`

### Phase 4 Env

Backend (`backend/.env`):

```bash
CHAT_HISTORY_LIMIT=50
CHAT_MAX_MESSAGE_LENGTH=1200
```

### DB Note (Phase 4)

If `prisma db push` fails in your local setup, run the manual SQL script:

`backend/prisma/manual/phase4_chat.sql`

## Phase 5 Video Call (WebRTC)

Implemented features:

- Self-hosted PeerJS signaling server mounted inside backend Node server
- Native WebRTC media capture with `navigator.mediaDevices.getUserMedia`
- Browser compatibility guard for `RTCPeerConnection`
- Room-aware peer announcement using the existing authenticated Socket.IO room
- Frontend video/voice panel with:
  - Join/leave call
  - Mute/unmute
  - Camera on/off
  - Local preview + remote streams
- Dynamic ICE server config API with provider support:
  - `stun` (default, Google STUN)
  - `twilio` (Twilio Network Traversal Service tokens)
  - `metered` (static Metered TURN credentials)
  - `custom` (JSON-configured ICE servers)

### Phase 5 API Endpoints

- `GET /api/webrtc/config`
- `GET /api/webrtc/ice-servers`

### Phase 5 Socket Events

- `webrtc:announce`
- `webrtc:update-media`
- `webrtc:clear`
- `webrtc:peer-announced`
- `webrtc:peer-cleared`

### Phase 5 Env

Backend (`backend/.env`):

```bash
PEER_SERVER_PATH=/peerjs
PEER_SERVER_KEY=peerjs
PEER_SERVER_URL=
PEER_SERVER_PROXIED=true
PEER_SERVER_ALLOW_DISCOVERY=false
PEER_SERVER_CONCURRENT_LIMIT=5000
PEER_SERVER_ALIVE_TIMEOUT_MS=60000
PEER_SERVER_EXPIRE_TIMEOUT_MS=5000
WEBRTC_ICE_PROVIDER=stun
WEBRTC_STUN_URLS=stun:stun.l.google.com:19302
WEBRTC_ICE_TTL_SECONDS=3600
WEBRTC_ICE_SERVERS_JSON=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
METERED_TURN_URLS=
METERED_TURN_USERNAME=
METERED_TURN_CREDENTIAL=
```

### Phase 2 API Endpoints

- `GET /api/media/youtube/search?q=...`
- `GET /api/media/spotify/search?q=...`
- `GET /api/media/spotify/config`
- `GET /api/media/spotify/auth-url`
- `POST /api/media/spotify/token`
- `POST /api/media/spotify/refresh`
- `POST /api/media/upload` (form-data key: `media`)

### Backend Env (Phase 2)

Add these to `backend/.env`:

```bash
YOUTUBE_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:5173/media
MEDIA_STORAGE=local
MAX_UPLOAD_MB=200
ENABLE_TRANSCODE=false
FFMPEG_PATH=ffmpeg
S3_REGION=auto
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
```

### Storage Notes

- For local uploads, files are served from `backend/uploads` via `/uploads/*`.
- For Cloudflare R2, use S3-compatible values:
  - `S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com`
  - `S3_BUCKET=<bucket-name>`
  - `S3_ACCESS_KEY_ID=<r2-key>`
  - `S3_SECRET_ACCESS_KEY=<r2-secret>`
  - Optional public base URL via `S3_PUBLIC_BASE_URL`

## Voice/Socket Hosting on Heroku

If you want voice-chat signaling sockets to stay active, deploy the socket backend on Heroku using a **Basic or higher** web dyno type (not Eco).

### Deploy backend to Heroku (from `backend` directory)

```bash
cd backend
heroku login
heroku create cozzywood-socket
heroku config:set NODE_ENV=production
heroku config:set CLIENT_ORIGIN=https://your-frontend-domain
heroku config:set DATABASE_URL=your_postgres_url
heroku config:set JWT_ACCESS_SECRET=your_access_secret
heroku config:set JWT_REFRESH_SECRET=your_refresh_secret
heroku config:set PEER_SERVER_PROXIED=true
heroku config:set PEER_SERVER_PATH=/peerjs
heroku config:set WEBRTC_ICE_PROVIDER=twilio
heroku config:set TWILIO_ACCOUNT_SID=your_twilio_sid
heroku config:set TWILIO_AUTH_TOKEN=your_twilio_auth_token
git init
git add .
git commit -m "Initial backend deploy"
heroku git:remote -a cozzywood-socket
git push heroku main
```

Then in Heroku Dashboard:

- Set dyno type to **Basic** (or Standard/Performance)
- Scale `web` to `1+`

### Socket reliability notes

- Send heartbeat pings on your socket connection to avoid idle disconnects.
- If you scale to multiple dynos later, use Redis pub/sub adapter for Socket.IO.
