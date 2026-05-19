# 🚀 Cozzywood Quick Start Guide

> **Get your zero-cost watch party platform running in 30 minutes**

## Prerequisites

- Node.js 18+ installed
- Git installed
- GitHub account
- 15 minutes to set up services

---

## Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/yourusername/cozzywood.git
cd cozzywood

# Install dependencies
npm install
```

---

## Step 2: Set Up Free Services (15 minutes)

### 2.1 Supabase (Database + Auth) - 3 minutes

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Create a new project:
   - Name: `cozzywood`
   - Database password: (save this!)
   - Region: Choose closest to you
3. Wait for project to initialize (~2 minutes)
4. Go to **Settings → API**:
   - Copy **Project URL** → `SUPABASE_URL`
   - Copy **anon public key** → `SUPABASE_ANON_KEY`
   - Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
5. Go to **SQL Editor** and run the schema:
   - Open `infra/database-schema.sql`
   - Copy entire contents
   - Paste into SQL Editor and run

✅ **Done!** You now have a database and auth system.

### 2.2 Upstash Redis (Cache/Sync) - 2 minutes

1. Go to [upstash.com](https://upstash.com) and sign up (free)
2. Click **Create Database**:
   - Name: `cozzywood-redis`
   - Region: Choose closest to you
   - TLS: Enabled
3. Copy credentials:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST Token** → `UPSTASH_REDIS_REST_TOKEN`

✅ **Done!** Real-time sync is ready.

### 2.3 Cloudflare R2 (File Storage) - 3 minutes

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Sign up/login (free)
3. Go to **R2** in left sidebar
4. Click **Create bucket**:
   - Name: `cozzywood-media`
   - Location: Choose closest to you
5. Go to **Manage R2 API Tokens**:
   - Click **Create API token**
   - Select **Admin Read & Write**
   - Copy **Access Key ID** → `R2_ACCESS_KEY_ID`
   - Copy **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
6. Get your Account ID from the URL or dashboard → use in `R2_ENDPOINT`:
   - Format: `https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com`

✅ **Done!** File uploads ready.

### 2.4 Spotify Developer (Music Search) - 3 minutes

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Login with your Spotify account (free tier works!)
3. Click **Create app**:
   - App name: `Cozzywood`
   - Description: `Watch party platform`
   - Redirect URI: `http://localhost:3000/auth/spotify/callback`
   - Check **Web Playback SDK** (optional)
4. Accept terms and create
5. Copy credentials:
   - **Client ID** → `SPOTIFY_CLIENT_ID`
   - Click **Show client secret** → `SPOTIFY_CLIENT_SECRET`

⚠️ **Note:** Only 30-second previews work without Premium subscription.

✅ **Done!** Music search ready.

### 2.5 Pexels API (Images) - 2 minutes

1. Go to [Pexels API](https://www.pexels.com/api/)
2. Sign up (free)
3. Go to **Your Apps** → **Create New App**
4. Fill in:
   - App name: `Cozzywood`
   - Description: `Watch party platform`
5. Copy **API Key** → `PEXELS_API_KEY`

✅ **Done!** Background images ready.

### 2.6 Metered.ca TURN (Video Calls) - 2 minutes

1. Go to [Metered.ca Open Relay](https://www.metered.ca/products/open-relay/)
2. No signup needed! Just get credentials:
   - **TURN Server:** `turn:openrelay.metered.ca:443`
   - **Username:** `cozzywood_user` (or choose your own)
   - **Password:** Generate one on the page → `TURN_SERVER_PASSWORD`

✅ **Done!** Video calls ready.

---

## Step 3: Configure Environment (3 minutes)

```bash
# Copy the template
cp .env.example .env.local

# Edit with your favorite editor
nano .env.local
# or
code .env.local
# or
vim .env.local
```

Fill in the values you copied:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Cloudflare R2
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=cozzywood-media

# Spotify
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Pexels
PEXELS_API_KEY=your_pexels_key

# TURN Server
TURN_SERVER_URL=turn:openrelay.metered.ca:443
TURN_SERVER_USERNAME=cozzywood_user
TURN_SERVER_PASSWORD=your_turn_password

# JWT Secret (generate a random one)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# App URLs (for local dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

Save and close the file.

---

## Step 4: Run Locally (1 minute)

```bash
# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

🎉 **Congratulations!** Cozzywood is running locally!

---

## Step 5: Deploy to Production (10 minutes)

### 5.1 Push to GitHub (2 minutes)

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Cozzywood setup"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/cozzywood.git
git branch -M main
git push -u origin main
```

### 5.2 Deploy Frontend to Vercel (3 minutes)

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click **Add New Project**
3. Import your GitHub repository: `cozzywood`
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add environment variables (copy from `.env.local`):
   - All `NEXT_PUBLIC_*` variables
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - `PEXELS_API_KEY`
   - `SPOTIFY_CLIENT_ID`
6. Click **Deploy**

✅ Vercel will give you a URL like: `https://cozzywood.vercel.app`

### 5.3 Deploy Backend to Railway (5 minutes)

1. Go to [railway.app](https://railway.app) and sign up (free $1 credit)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `cozzywood` repository
4. Configure service:
   - **Service Name:** `cozzywood-backend`
   - **Start Command:** `node server/index.js` (or your backend entry point)
5. Add environment variables (all from `.env.local`):
   - All variables (not just `NEXT_PUBLIC_*`)
   - Especially: `SUPABASE_SERVICE_ROLE_KEY`, `R2_SECRET_ACCESS_KEY`, etc.
6. Click **Deploy**

✅ Railway will give you a URL like: `https://cozzywood-production.up.railway.app`

### 5.4 Update Environment Variables (2 minutes)

Update your Vercel project with the Railway URL:

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Update:
   - `NEXT_PUBLIC_API_URL=https://cozzywood-production.up.railway.app`
   - `NEXT_PUBLIC_WS_URL=wss://cozzywood-production.up.railway.app`
3. Redeploy

---

## Step 6: Test Your Deployment (2 minutes)

### Test Checklist

- [ ] Visit your Vercel URL
- [ ] Create an account (Supabase Auth)
- [ ] Create a room
- [ ] Share room code with a friend
- [ ] Test YouTube video sync (no API key needed!)
- [ ] Test Spotify search (should show previews)
- [ ] Test chat messages
- [ ] Test video call (PeerJS + Metered.ca TURN)
- [ ] Upload a file (should go to R2)

### Troubleshooting

**Issue:** WebSocket disconnects
- ✅ Ensure Railway app is running (check logs)
- ✅ Verify `NEXT_PUBLIC_WS_URL` uses `wss://` not `ws://`

**Issue:** Can't connect to database
- ✅ Check Supabase URL and keys
- ✅ Verify RLS policies are set up correctly

**Issue:** Spotify search fails
- ✅ Verify Client ID and Secret are correct
- ✅ Check rate limits (180 req/min)

**Issue:** Video call fails
- ✅ Verify TURN credentials from Metered.ca
- ✅ Check browser permissions for camera/mic

---

## 📊 Monitor Your Free Tier Usage

Set up alerts to avoid hitting limits:

| Service | Dashboard | Alert Threshold |
|---------|-----------|-----------------|
| Supabase | supabase.com/dashboard | 400MB / 500MB |
| Upstash | upstash.com/dashboard | 400K / 500K commands |
| Railway | railway.app/dashboard | $0.80 / $1.00 |
| Cloudflare R2 | dash.cloudflare.com | 8GB / 10GB |
| Vercel | vercel.com/dashboard | 80GB / 100GB |

---

## 🎓 Next Steps

### Customize Your App

- Modify `tailwind.config.js` for custom colors
- Update branding in `src/components/`
- Add new features using the existing architecture

### Learn More

- [ZERO_COST_STACK_GUIDE.md](./ZERO_COST_STACK_GUIDE.md) - Deep dive into free-tier architecture
- [Supabase Docs](https://supabase.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [Vercel Docs](https://vercel.com/docs)

### Join the Community

- Report bugs on GitHub Issues
- Share your deployment on Twitter
- Contribute improvements via PRs

---

## 💰 Total Cost: $0.00/month

You're now running a fully-featured watch party platform with:
- ✅ Real-time video sync
- ✅ Chat and reactions
- ✅ Video calls
- ✅ File uploads
- ✅ User authentication
- ✅ Music integration

**All on 100% free infrastructure!**

---

**Questions?** Check the [ZERO_COST_STACK_GUIDE.md](./ZERO_COST_STACK_GUIDE.md) for detailed explanations of each service choice.

**Need help?** Open an issue on GitHub or join our Discord.

Happy building! 🎉
