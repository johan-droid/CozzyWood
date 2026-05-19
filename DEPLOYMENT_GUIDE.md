# ============================================
# DEPLOYMENT GUIDE
# ============================================

This guide covers deployment to Vercel (Frontend), Railway (Backend), Supabase (Database), Upstash (Redis), and Cloudflare R2 (Storage).

## PREREQUISITES

- GitHub account
- Vercel account (free tier): https://vercel.com/signup
- Railway account (free tier): https://railway.app/
- Supabase account (free tier): https://supabase.com/
- Upstash account (free tier): https://upstash.com/
- Cloudflare account (free tier): https://www.cloudflare.com/

---

## STEP 1: GITHUB REPOSITORY SETUP

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit - Phase 7 Deployment Setup"

# Create repository on GitHub and push
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main
```

---

## STEP 2: DATABASE SETUP (SUPABASE)

1. Go to https://supabase.com and create a new project
2. Choose your region and set a strong database password
3. Once created, go to **Settings → Database**
4. Copy the **Connection String** (URI mode)
5. Go to **Settings → API** and copy:
   - Project URL
   - anon/public key
   - service_role key (keep this secret!)

6. Run migrations:
```bash
# Connect to your Supabase database
psql $DATABASE_URL -f infra/database-schema.sql
```

---

## STEP 3: REDIS SETUP (UPSTASH)

1. Go to https://upstash.com and create a new Redis database
2. Choose your region (close to your backend for better performance)
3. Copy the **REST API** or **Redis CLI** connection string
4. Store the `REDIS_URL` in your environment variables

---

## STEP 4: STORAGE SETUP (CLOUDFLARE R2)

1. Go to https://dash.cloudflare.com and sign up/login
2. Navigate to **R2 Storage**
3. Create a new bucket (e.g., `your-app-uploads`)
4. Go to **R2 → API Tokens** and create a token with:
   - Object Read & Write permissions
   - Select your bucket
5. Copy the credentials:
   - Endpoint URL
   - Access Key ID
   - Secret Access Key

---

## STEP 5: API KEYS SETUP

### YouTube Data API v3
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable **YouTube Data API v3**
4. Go to **Credentials → Create Credentials → API Key**
5. Restrict your API key to YouTube Data API only

### Spotify Developer Dashboard
1. Go to https://developer.spotify.com/dashboard
2. Create a new app
3. Copy **Client ID** and **Client Secret**
4. Add redirect URIs in app settings

### Twilio (Optional - for TURN servers)
1. Go to https://www.twilio.com/console
2. Sign up for a free account
3. Copy **Account SID** and **Auth Token**
4. Alternative: Use free TURN servers from https://www.metered.ca/stun-turn

### Giphy API (Optional)
1. Go to https://developers.giphy.com/dashboard
2. Create an app
3. Copy your **API Key**

---

## STEP 6: BACKEND DEPLOYMENT (RAILWAY)

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your repository
4. Add environment variables in Railway dashboard:
   ```
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   JWT_SECRET=your_secure_secret
   YOUTUBE_API_KEY=...
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   R2_ENDPOINT=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=...
   ```
5. Railway will auto-detect Node.js and deploy
6. Copy your Railway deployment URL

---

## STEP 7: FRONTEND DEPLOYMENT (VERCEL)

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New → Project**
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add environment variables:
   ```
   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ENABLE_YOUTUBE_SYNC=true
   ENABLE_SPOTIFY_SYNC=true
   ```
6. Click **Deploy**
7. Vercel will provide a live URL (e.g., `https://your-project.vercel.app`)

---

## STEP 8: CUSTOM DOMAIN (OPTIONAL)

### Vercel
1. Go to your project settings in Vercel
2. Navigate to **Domains**
3. Add your custom domain
4. Update DNS records as instructed

### Railway
1. Go to your project settings in Railway
2. Navigate to **Settings → Domains**
3. Generate a domain or add custom domain
4. Update DNS records

---

## STEP 9: CI/CD SECRETS SETUP

Add these secrets to your GitHub repository:
1. Go to **Repository Settings → Secrets and variables → Actions**
2. Add the following secrets:

```
VERCEL_TOKEN          # From Vercel account settings
VERCEL_ORG_ID         # From Vercel project settings
VERCEL_PROJECT_ID     # From Vercel project settings
RAILWAY_TOKEN         # From Railway account settings
DATABASE_URL          # Your Supabase connection string
SLACK_WEBHOOK_URL     # Optional: For deployment notifications
```

---

## STEP 10: VERIFICATION

After deployment, verify:

1. **Frontend**: Visit your Vercel URL
2. **Backend**: Test API endpoints at Railway URL
3. **Database**: Check Supabase dashboard for data
4. **Redis**: Verify Upstash dashboard for connections
5. **Storage**: Upload a test file to R2 bucket

---

## TROUBLESHOOTING

### Common Issues

**Build fails on Vercel:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

**Database connection errors:**
- Check DATABASE_URL format
- Ensure IP allowlist includes Railway/Vercel IPs
- Verify database user permissions

**WebSocket connection fails:**
- Ensure Railway plan supports WebSockets
- Check CORS settings in backend
- Verify REDIS_URL is correct

**File upload fails:**
- Verify R2 credentials
- Check bucket permissions
- Ensure CORS is configured for R2 bucket

---

## MONITORING & LOGS

- **Vercel**: Analytics and function logs in dashboard
- **Railway**: Real-time logs and metrics
- **Supabase**: Query performance and usage stats
- **Upstash**: Redis metrics and slow log
- **Cloudflare**: R2 usage and bandwidth stats

---

## COST ESTIMATES (FREE TIERS)

| Service       | Free Tier Limits                          | Estimated Cost |
|---------------|-------------------------------------------|----------------|
| Vercel        | 100GB bandwidth, 100k function invocations | $0             |
| Railway       | $5 credit/month (~500 hours)              | $0-$5          |
| Supabase      | 500MB database, 50k MAU                   | $0             |
| Upstash       | 10k commands/day, 256MB memory            | $0             |
| Cloudflare R2 | 10GB storage, 10M operations/month        | $0             |

**Total Monthly Cost: $0** (within free tier limits)

---

## SECURITY CHECKLIST

- [ ] All API keys stored in environment variables
- [ ] JWT_SECRET is a strong random string
- [ ] Database credentials not committed to Git
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (automatic via hosting)
- [ ] Input validation on all endpoints
- [ ] Regular dependency updates

---

## NEXT STEPS

1. Set up monitoring alerts
2. Configure automated backups for database
3. Set up error tracking (e.g., Sentry)
4. Implement analytics (e.g., Google Analytics, Plausible)
5. Create staging environment for testing
