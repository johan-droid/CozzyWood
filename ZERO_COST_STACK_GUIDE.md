# 🆓 Cozzywood — Zero-Cost Tech Stack Guide

> **Build a fully-featured watch party platform for $0/month** using carefully selected free-tier services and smart API alternatives.

## 🎯 Overview

This guide outlines the **completely free** technology stack for Cozzywood, a real-time synchronized media viewing platform. Every service listed has a generous free tier sufficient for personal use or small-scale deployments (2-10 concurrent users).

### 💰 Total Monthly Cost: **$0.00**

| Service | Provider | Free Tier Limit | Cost |
|---------|----------|-----------------|------|
| Frontend Hosting | Vercel | 100GB bandwidth/mo | $0 |
| Backend Hosting | Railway | $1 credit/mo (no sleep) | $0 |
| Database + Auth | Supabase | 500MB DB, 50k MAU | $0 |
| Cache/Sync | Upstash Redis | 500K commands/mo | $0 |
| File Storage | Cloudflare R2 | 10GB + 10M reads/mo | $0 |
| Video Calls | Metered.ca TURN | 20GB/mo | $0 |
| YouTube Access | InnerTube (unofficial) | No limits | $0 |
| Music Search | Spotify Web API | 180 req/min | $0 |
| Images | Pexels API | 200 req/hour | $0 |

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  Socket.IO   │  │   WebRTC     │      │
│  │  (Vercel)    │  │   Client     │  │  (PeerJS)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │ HTTPS              │ WebSocket          │ P2P
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    VERCEL       │  │    RAILWAY      │  │   METERED.CA    │
│  (Frontend)     │  │   (Backend)     │  │  (TURN Server)  │
│  - Static files │  │  - Node.js      │  │  - Free 20GB    │
│  - Auto SSL     │  │  - Socket.IO    │  │  - No CC needed │
│  - 100GB/mo     │  │  - Express      │  └─────────────────┘
└─────────────────┘  │  - Never sleeps │
         │           └────────┬────────┘
         │                    │
         │            ┌───────┴────────┐
         │            │                │
         ▼            ▼                ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    SUPABASE     │  │  UPSTASH REDIS  │  │  CLOUDFLARE R2  │
│  (PostgreSQL)   │  │   (Cache/Sync)  │  │   (Storage)     │
│  - 500MB DB     │  │  - 500K cmd/mo  │  │  - 10GB storage │
│  - Built-in Auth│  │  - Serverless   │  │  - 10M reads    │
│  - REST API     │  │  - No mgmt      │  │  - No egress $  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 🔑 Critical Design Decisions

### 1. **YouTube: Skip the Official API** ❌→✅

**Problem:** YouTube Data API v3 has a strict **10,000 unit daily quota**. Simple searches cost 100 units each → only ~100 searches/day before hitting limits. Quota increases require paid billing history.

**Solution:** Use **InnerTube** or **surfyt-api** — open-source libraries that mimic browser requests to YouTube.

- ✅ No API key required
- ✅ No quota limits
- ✅ Full search, metadata, and video URL access
- ✅ Used by many production apps

**Implementation:**
```bash
npm install innertube
# or
npm install surfyt-api
```

```javascript
import { Innertube } from 'innertube';

const youtube = await Innertube.create();
const search = await youtube.search('your query');
// No API key, no limits!
```

**Resources:**
- [InnerTube GitHub](https://github.com/LuanRT/YouTube.js)
- [surfyt-api](https://github.com/zerodytrash/YouTube-Internal-Clients)

---

### 2. **Spotify: Search & Preview Only** ⚠️

**Problem:** Spotify Web Playback SDK requires **Premium subscription** for all users. Direct full-track playback in browsers is locked behind paywall.

**Solution:** Build around **search and 30-second previews** using the free Spotify Web API.

**What You CAN Do (Free):**
- ✅ Search tracks, albums, artists
- ✅ View album art, playlists, metadata
- ✅ Play 30-second preview clips (if available)
- ✅ 180 requests/minute rate limit (generous!)

**What You CANNOT Do (Requires Premium):**
- ❌ Full-track playback in browser
- ❌ Control user's Spotify app (unless they have Premium)

**Implementation Strategy:**
- Use Spotify for discovery and browsing
- Show album art and track info
- Play preview clips when available
- Provide "Open in Spotify" links for full tracks

```javascript
// Get preview URL from Spotify API
const track = await spotifyApi.getTrack(trackId);
const previewUrl = track.body.preview_url; // 30-second clip
// Play previewUrl with HTML5 Audio
```

**Resources:**
- [Spotify Web API Docs](https://developer.spotify.com/documentation/web-api/)
- [Spotify for Developers](https://developer.spotify.com/dashboard)

---

### 3. **Database + Auth: Supabase** 🎉

**Why Supabase over self-hosted PostgreSQL?**

- ✅ Managed database (no server maintenance)
- ✅ Built-in authentication system
- ✅ Real-time subscriptions included
- ✅ REST API auto-generated
- ✅ 500MB storage free (plenty for metadata)
- ✅ 50,000 monthly active users free

**Replaces:**
- Self-managed PostgreSQL on Railway ($5+/mo)
- Separate auth system (Auth0, Clerk, etc.)
- Custom API endpoints for CRUD operations

**Setup:**
```bash
npm install @supabase/supabase-js
```

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Auth
const { user, error } = await supabase.auth.signInWithPassword({
  email, password
});

// Database
const { data } = await supabase
  .from('rooms')
  .select('*')
  .eq('id', roomId);
```

**Resources:**
- [Supabase Free Tier](https://supabase.com/pricing)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

---

### 4. **Real-Time Sync: Upstash Redis + Socket.IO** ⚡

**Why Upstash?**
- ✅ Serverless (no server management)
- ✅ 500,000 commands/month free (huge upgrade!)
- ✅ Global edge locations
- ✅ Perfect for sync state, room metadata, presence

**Socket.IO Hosting Warning:** ⚠️

**Render.com** free tier spins down after 15 minutes of inactivity → **kills WebSocket connections**. Not suitable for real-time features.

**Railway.app** is the solution:
- ✅ $1 credit/month (enough for lightweight Node.js app)
- ✅ **Never sleeps** (critical for WebSockets)
- ✅ Easy deployment from GitHub
- ✅ Built-in PostgreSQL option (but we use Supabase)

**Setup:**
```bash
npm install socket.io socket.io-client ioredis
```

```javascript
// Backend (Railway)
import { Server } from 'socket.io';
import Redis from 'ioredis';

const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const redis = new Redis(process.env.UPSTASH_REDIS_REST_URL);

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    // Sync state from Redis
  });
  
  socket.on('sync-event', (data) => {
    // Broadcast to room
    socket.to(data.roomId).emit('sync-event', data);
    // Update Redis cache
  });
});
```

**Resources:**
- [Upstash Free Tier](https://upstash.com/pricing)
- [Railway Pricing](https://railway.app/pricing)
- [Socket.IO Docs](https://socket.io/docs/v4/)

---

### 5. **Video Calls: PeerJS + Metered.ca TURN** 📹

**Why not Twilio?**
- ❌ Requires credit card
- ❌ Complex setup
- ❌ Can get expensive with usage

**Metered.ca Open Relay Project:**
- ✅ Completely free
- ✅ 20 GB/month usage
- ✅ No credit card required
- ✅ Highly reliable
- ✅ Simple credentials

**Setup:**
```bash
npm install peerjs
```

```javascript
// Frontend
import Peer from 'peerjs';

const peer = new Peer({
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'cozzywood_user',
        credential: 'your_turn_password'
      }
    ]
  }
});

peer.on('call', (call) => {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      call.answer(stream);
    });
});
```

**Alternative:** Self-host coturn on Railway if you need more control (uses your $1 credit).

**Resources:**
- [Metered.ca Open Relay](https://www.metered.ca/products/open-relay/)
- [PeerJS Docs](https://peerjs.com/docs/)

---

### 6. **Images: Pexels > Unsplash** 🖼️

**Why switch from Unsplash?**
- ❌ Unsplash: 50 requests/hour (too limiting for dev/testing)
- ✅ Pexels: 200 requests/hour (4x better!)
- ✅ Similar quality and variety
- ✅ Free commercial use

**Setup:**
```bash
npm install node-pexels
```

```javascript
import Pexels from 'node-pexels';

const client = Pexels.createClient('your_pexels_api_key');

const photos = await client.photos.search('party background', {
  page: 1,
  per_page: 10
});

photos.forEach(photo => {
  console.log(photo.src.large); // High-res URL
});
```

**Resources:**
- [Pexels API](https://www.pexels.com/api/)
- [Pexels vs Unsplash Comparison](https://www.pexels.com/api/documentation/)

---

## 🚀 Deployment Strategy

### Frontend: Vercel
- Automatic deployments from Git
- 100GB bandwidth/month
- 6,000 build minutes/month
- Automatic HTTPS
- Edge network optimization

### Backend: Railway
- Connect GitHub repo
- Auto-deploy on push
- $1 credit/month (sufficient for 24/7 lightweight Node.js)
- **Does NOT sleep** (critical for WebSockets)
- Easy environment variable management

### Database: Supabase
- Create project at supabase.com
- Get connection details from dashboard
- Run migrations via SQL editor or CLI
- Built-in auth handles user management

### Cache: Upstash Redis
- Create database at upstash.com
- Get REST URL and token
- Use as Socket.IO adapter for multi-instance scaling (future)

### Storage: Cloudflare R2
- Create bucket in Cloudflare dashboard
- Get S3-compatible credentials
- Use AWS SDK with custom endpoint
- **No egress fees** (major advantage over S3!)

---

## 📋 Environment Variables Checklist

Copy `.env.example` to `.env.local` and fill in:

```bash
# Required (6 keys total)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
PEXELS_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
TURN_SERVER_USERNAME=
TURN_SERVER_PASSWORD=
JWT_SECRET=

# Optional
GIPHY_API_KEY=
```

**Total: 6-8 API keys needed** (down from 8+ in paid version)

---

## 🔒 Security Considerations

Even on free tiers, maintain security best practices:

1. **Never commit `.env` files** to Git
2. **Rotate secrets regularly** (especially JWT_SECRET)
3. **Use CORS properly** (restrict to your domains)
4. **Rate limit API endpoints** (protect free tier limits)
5. **Validate all user input** (prevent injection attacks)
6. **Use HTTPS everywhere** (automatic with Vercel/Railway)
7. **Sanitize file uploads** (scan for malware)

---

## 📊 Free Tier Limits & Monitoring

### Track Your Usage

| Service | Free Limit | Monitor Via | Alert Threshold |
|---------|-----------|-------------|-----------------|
| Supabase | 500MB DB | Dashboard | 400MB |
| Upstash | 500K cmd/mo | Dashboard | 400K |
| Cloudflare R2 | 10GB storage | Dashboard | 8GB |
| Railway | $1 credit | Dashboard | $0.80 |
| Vercel | 100GB bandwidth | Dashboard | 80GB |
| Metered.ca | 20GB/mo | Dashboard | 15GB |
| Pexels | 200 req/hr | Self-track | 150 |
| Spotify | 180 req/min | Self-track | 150 |

### Set Up Alerts

- **Supabase:** Email alerts in dashboard
- **Upstash:** Slack/Discord webhooks
- **Railway:** Usage alerts in settings
- **Cloudflare:** Email notifications

---

## 🛠️ Development Workflow

### Local Development

```bash
# 1. Clone repo
git clone https://github.com/yourusername/cozzywood.git
cd cozzywood

# 2. Install dependencies
npm install

# 3. Copy env template
cp .env.example .env.local

# 4. Fill in your keys
nano .env.local

# 5. Start dev server
npm run dev
```

### Production Deployment

```bash
# 1. Push to GitHub
git add .
git commit -m "feat: awesome new feature"
git push origin main

# 2. Vercel auto-deploys frontend
# 3. Railway auto-deploys backend
# 4. Run database migrations
npx prisma migrate deploy

# 5. Verify deployment
curl https://your-app.vercel.app
```

---

## 🐛 Troubleshooting

### Common Issues

**1. "Quota exceeded" for YouTube**
- ✅ Solution: Switch to InnerTube (remove YOUTUBE_API_KEY)

**2. WebSocket disconnects after 15 min**
- ✅ Solution: Move from Render to Railway (doesn't sleep)

**3. Spotify playback fails**
- ✅ Expected: Only 30-sec previews work without Premium
- ✅ Solution: Show message requiring Premium for full tracks

**4. TURN server connection fails**
- ✅ Check credentials from Metered.ca
- ✅ Verify firewall allows port 443

**5. Supabase auth errors**
- ✅ Check Row Level Security policies
- ✅ Verify anon key is correct

---

## 📈 Scaling Beyond Free Tiers

When you outgrow free tiers (congrats!), here's the upgrade path:

| Service | Free Tier | Paid Upgrade | Cost/mo |
|---------|-----------|--------------|---------|
| Supabase | 500MB | Pro (2GB) | $25 |
| Upstash | 500K cmd | Plus (5M) | $10 |
| Railway | $1 credit | Starter | $5 |
| Cloudflare R2 | 10GB | Pay-as-you-go | ~$2 |
| Metered.ca | 20GB | Standard | $10 |

**Total for modest scale: ~$52/month**

---

## 🎓 Learning Resources

- [Supabase Crash Course](https://supabase.com/docs/tutorial)
- [Socket.IO Getting Started](https://socket.io/get-started/chat)
- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [WebRTC for the Curious](https://webrtcforthecurious.com/)

---

## 🤝 Community & Support

- **GitHub Issues:** Report bugs and request features
- **Discord:** Join developer community
- **Twitter:** Follow @cozzywood for updates

---

## 📝 License

This guide is part of the Cozzywood project. See main repository for license details.

---

**Built with ❤️ using 100% free technologies**

*Last updated: May 2024*
