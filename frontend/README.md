# Cozzywood Frontend

React + Vite client for Cozzywood media rooms.

## Stack

- React 19
- Vite 8
- React Router DOM
- Axios
- Socket.IO client
- PeerJS
- React Player
- Plyr + hls.js
- Emoji Mart

## Scripts

- npm run dev: start local dev server
- npm run build: create production build
- npm run preview: preview production build locally
- npm run lint: run ESLint

## Local Development

```bash
cp .env.example .env
npm install
npm run dev
```

Default app URL: http://localhost:5173

## Environment

Defined in .env.example:

```bash
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
VITE_SOCKET_PATH=/socket.io
```

## Main Routes

- /login
- /register
- /dashboard
- /media

## Key UI Modules

- ProtectedRoute: auth gate for private routes
- ReactUnifiedPlayer and HlsPlyrPlayer: playback components
- RoomChatPanel: realtime room chat UI
- VideoCallPanel: peer video/voice controls and streams
- SpotifyWebPlaybackPanel: Spotify playback integration panel

## Backend Dependency

This frontend expects the backend API and socket server to be running.

For full project setup, see the repository root README.