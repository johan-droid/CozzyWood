# SyncParty - Complete Setup & Deployment Guide

Welcome to SyncParty! This guide will help you set up and deploy the application from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [API Keys & Services Setup](#api-keys--services-setup)
4. [Deployment](#deployment)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** v20+ ([Download](https://nodejs.org/))
- **npm** or **yarn** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **psql** (optional, for database management)

### Required Accounts (Free Tiers Available)
- **GitHub** - Code hosting & CI/CD
- **Vercel** - Frontend hosting
- **Railway** or **Render** - Backend hosting
- **Supabase** - PostgreSQL database
- **Upstash** - Redis cache
- **Cloudflare** - File storage (R2)

### API Keys Needed
- YouTube Data API v3 (Google Cloud)
- Spotify Developer credentials
- (Optional) Twilio for TURN servers
- (Optional) Giphy API

---

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/syncparty.git
cd syncparty
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit with your values (use your favorite editor)
nano .env.local
# or
code .env.local
```

**Minimum required for local development:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/syncparty
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_local_dev_secret_change_in_production
NODE_ENV=development
PORT=3000
```

### 4. Set Up Local Database (Optional)
```bash
# Using Docker (recommended)
docker-compose up -d postgres redis

# Or install PostgreSQL locally and run:
psql -U postgres -c "CREATE DATABASE syncparty;"
psql -U postgres -d syncparty -f infra/database-schema.sql
```

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see your app!

---

## API Keys & Services Setup

### YouTube Data API v3

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **YouTube Data API v3**
4. Go to **Credentials → Create Credentials → API Key**
5. Copy the key to `.env.local`:
   ```env
   YOUTUBE_API_KEY=your_key_here
   ```

### Spotify Developer

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Copy **Client ID** and **Client Secret**:
   ```env
   SPOTIFY_CLIENT_ID=your_id_here
   SPOTIFY_CLIENT_SECRET=your_secret_here
   ```

### Supabase (Database)

1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Wait for provisioning
4. Go to **Settings → Database**
5. Copy **Connection String** (URI mode):
   ```env
   DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres
   ```
6. Run the schema:
   ```bash
   psql "$DATABASE_URL" -f infra/database-schema.sql
   ```

### Upstash (Redis)

1. Go to [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Choose region close to your backend
4. Copy **REDIS_URL**:
   ```env
   REDIS_URL=redis://default:[password]@[host]:[port]
   ```

### Cloudflare R2 (Storage)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Storage**
3. Create a bucket
4. Create API token with Read/Write permissions
5. Add to `.env.local`:
   ```env
   R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=your-bucket-name
   ```

---

## Deployment

### Quick Deploy Script

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

This script will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Run linter and tests
- ✅ Build the application
- ✅ Run database migrations
- ✅ Deploy to Vercel (frontend)
- ✅ Deploy to Railway (backend)

### Manual Deployment

#### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### Step 2: Deploy Frontend to Vercel

1. Go to [Vercel](https://vercel.com/)
2. Click **Add New → Project**
3. Import your GitHub repository
4. Configure build settings (auto-detected for Next.js)
5. Add environment variables:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_API_URL`
   - Feature flags
6. Click **Deploy**

#### Step 3: Deploy Backend to Railway

1. Go to [Railway](https://railway.app/)
2. Click **New Project → Deploy from GitHub**
3. Select your repository
4. Add all environment variables from `.env.example`
5. Railway auto-deploys

#### Step 4: Run Database Migrations

Via Supabase SQL Editor or locally:
```bash
psql "$DATABASE_URL" -f infra/database-schema.sql
```

---

## Post-Deployment

### Verify Deployment

1. **Frontend**: Visit your Vercel URL
2. **Backend**: Test API endpoints
3. **Database**: Check Supabase dashboard
4. **Redis**: Verify Upstash connection
5. **Storage**: Test file upload to R2

### Set Up Custom Domain (Optional)

**Vercel:**
1. Project Settings → Domains
2. Add your domain
3. Update DNS records

**Railway:**
1. Project Settings → Networking
2. Generate domain or add custom
3. Update DNS records

### Configure CI/CD Secrets

In GitHub Repository Settings → Secrets and variables → Actions:

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
RAILWAY_TOKEN
DATABASE_URL
SLACK_WEBHOOK_URL (optional)
```

### Monitoring Setup

- **Vercel Analytics**: Enable in project settings
- **Railway Metrics**: Available in dashboard
- **Error Tracking**: Consider Sentry or similar
- **Uptime Monitoring**: UptimeRobot, Pingdom, etc.

---

## Troubleshooting

### Build Fails on Vercel

**Problem:** Build error during deployment

**Solutions:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility
- Try clearing build cache: Vercel → Settings → Git → Ignored Build Step

### Database Connection Errors

**Problem:** Cannot connect to database

**Solutions:**
- Verify `DATABASE_URL` format
- Check if database allows connections from Railway/Vercel IPs
- Ensure database user has correct permissions
- Test connection locally first

### WebSocket Connection Fails

**Problem:** Real-time features not working

**Solutions:**
- Ensure Railway plan supports WebSockets
- Check CORS settings in backend
- Verify `REDIS_URL` is correct
- Check firewall rules

### Environment Variables Not Working

**Problem:** App can't access env vars

**Solutions:**
- For frontend: Must prefix with `NEXT_PUBLIC_`
- Redeploy after adding new env vars
- Check for typos in variable names
- Verify secrets are set in correct platform (Vercel vs Railway)

### File Upload Fails

**Problem:** Can't upload files to R2

**Solutions:**
- Verify R2 credentials
- Check bucket permissions
- Ensure CORS is configured for R2
- Check file size limits

---

## Cost Estimates (Free Tiers)

| Service | Free Tier | Paid When |
|---------|-----------|-----------|
| Vercel | 100GB/mo bandwidth | >100GB or team features |
| Railway | $5 credit/mo | >$5 usage |
| Supabase | 500MB DB, 50k MAU | >500MB or >50k users |
| Upstash | 10k commands/day | >10k/day |
| Cloudflare R2 | 10GB storage | >10GB |

**Estimated Monthly Cost: $0** for small-medium usage

---

## Security Checklist

- [ ] All API keys in environment variables (not in code)
- [ ] Strong `JWT_SECRET` generated
- [ ] Database credentials secure
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (automatic)
- [ ] Input validation on all endpoints
- [ ] Regular dependency updates (`npm audit`)
- [ ] `.env.local` in `.gitignore`

---

## Support & Resources

- **Documentation**: `/DEPLOYMENT_GUIDE.md`
- **Database Schema**: `/infra/database-schema.sql`
- **Environment Template**: `/.env.example`
- **CI/CD Config**: `/.github/workflows/ci-cd.yml`
- **Deployment Script**: `/scripts/deploy.sh`

### Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Supabase Documentation](https://supabase.com/docs)
- [Upstash Documentation](https://upstash.com/docs)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

---

## Next Steps

After successful deployment:

1. ✅ Test all features end-to-end
2. ✅ Set up monitoring and alerts
3. ✅ Configure automated backups
4. ✅ Implement error tracking
5. ✅ Set up analytics
6. ✅ Create staging environment
7. ✅ Document API endpoints
8. ✅ Plan scaling strategy

**Congratulations! Your SyncParty app is live! 🎉**
