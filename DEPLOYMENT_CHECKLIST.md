# 🚀 Deployment Checklist - SyncParty

Use this checklist to ensure a smooth deployment process.

## Pre-Deployment

### Environment Setup
- [ ] Copy `.env.example` to `.env.local`
- [ ] Generate strong `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Obtain YouTube API Key from Google Cloud Console
- [ ] Obtain Spotify Client ID & Secret from Spotify Developer Dashboard
- [ ] (Optional) Get Twilio credentials for TURN servers
- [ ] (Optional) Get Giphy API key

### Database & Cache
- [ ] Create Supabase project and get connection string
- [ ] Create Upstash Redis database and get connection URL
- [ ] Run database migrations (`psql $DATABASE_URL -f infra/database-schema.sql`)
- [ ] Verify database connection works

### Storage
- [ ] Create Cloudflare R2 bucket
- [ ] Generate R2 API token with read/write permissions
- [ ] Configure CORS for R2 bucket (allow your domain)
- [ ] Test R2 credentials

### Code Quality
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run build` - builds successfully
- [ ] Review code for hardcoded secrets
- [ ] Update README with current info

### Security
- [ ] All secrets in environment variables (not in code)
- [ ] `.env.local` added to `.gitignore`
- [ ] API keys restricted to necessary domains/IPs
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints

---

## Deployment Day

### GitHub Setup
- [ ] Create repository on GitHub (if not exists)
- [ ] Push code to main branch
- [ ] Protect main branch (require PR reviews)
- [ ] Add repository description and topics

### CI/CD Secrets
Add these to GitHub Repository Settings → Secrets and variables → Actions:
- [ ] `VERCEL_TOKEN` - Vercel API token
- [ ] `VERCEL_ORG_ID` - Vercel organization ID
- [ ] `VERCEL_PROJECT_ID` - Vercel project ID
- [ ] `RAILWAY_TOKEN` - Railway API token
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `REDIS_URL` - Redis connection string
- [ ] `SLACK_WEBHOOK_URL` (optional) - For notifications

### Frontend (Vercel)
- [ ] Connect GitHub repository to Vercel
- [ ] Configure build settings (Next.js auto-detected)
- [ ] Add environment variables:
  - [ ] `NEXT_PUBLIC_APP_URL`
  - [ ] `NEXT_PUBLIC_API_URL`
  - [ ] `ENABLE_YOUTUBE_SYNC`
  - [ ] `ENABLE_SPOTIFY_SYNC`
  - [ ] `ENABLE_FILE_UPLOADS`
  - [ ] `ENABLE_GIF_SEARCH`
- [ ] Deploy to production
- [ ] Note deployment URL

### Backend (Railway)
- [ ] Connect GitHub repository to Railway
- [ ] Add all environment variables from `.env.example`
- [ ] Configure service name
- [ ] Deploy to production
- [ ] Note deployment URL
- [ ] Verify WebSocket support is enabled

### Database (Supabase)
- [ ] Verify schema is applied
- [ ] Check table creation in dashboard
- [ ] Test connection from Railway
- [ ] Enable Row Level Security (RLS) if needed
- [ ] Set up automated backups

### Cache (Upstash)
- [ ] Verify Redis connection from backend
- [ ] Test set/get operations
- [ ] Monitor connection count

### Storage (Cloudflare R2)
- [ ] Test file upload via API
- [ ] Verify public URL access
- [ ] Check bucket storage usage

---

## Post-Deployment Verification

### Functional Testing
- [ ] Homepage loads correctly
- [ ] User registration/login works
- [ ] Create room functionality works
- [ ] Join room with code works
- [ ] Video sync (YouTube) works
- [ ] Video sync (Spotify) works
- [ ] Chat messages send/receive
- [ ] Real-time sync between users
- [ ] File upload works
- [ ] GIF search works (if enabled)
- [ ] Theme toggle works
- [ ] Responsive design on mobile

### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] Video starts within 2 seconds
- [ ] Chat messages appear instantly
- [ ] No console errors in browser
- [ ] Check Vercel Analytics for metrics

### Security Testing
- [ ] HTTPS enforced on all routes
- [ ] Authentication required for protected routes
- [ ] API rate limiting working
- [ ] SQL injection prevention tested
- [ ] XSS prevention tested
- [ ] CSRF protection enabled

### Monitoring Setup
- [ ] Enable Vercel Analytics
- [ ] Set up error tracking (Sentry/LogRocket)
- [ ] Configure uptime monitoring (UptimeRobot)
- [ ] Set up log aggregation
- [ ] Create alerts for critical errors

---

## Optional Enhancements

### Custom Domain
- [ ] Purchase domain name
- [ ] Configure DNS for Vercel (A/CNAME records)
- [ ] Configure DNS for Railway
- [ ] Update `NEXT_PUBLIC_APP_URL` with custom domain
- [ ] Update `NEXT_PUBLIC_API_URL` with custom domain
- [ ] SSL certificate auto-provisioned (wait ~5 min)

### Advanced Features
- [ ] Set up staging environment
- [ ] Configure A/B testing
- [ ] Implement feature flags
- [ ] Set up CI/CD for staging → production
- [ ] Add performance monitoring (New Relic, Datadog)
- [ ] Implement distributed tracing

### Documentation
- [ ] Write API documentation
- [ ] Create user guide
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Add changelog

---

## Maintenance Tasks

### Weekly
- [ ] Check error logs
- [ ] Review performance metrics
- [ ] Monitor resource usage
- [ ] Check for dependency updates

### Monthly
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review and rotate API keys if needed
- [ ] Backup database (if not automated)
- [ ] Review user feedback
- [ ] Update documentation

### Quarterly
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Plan new features
- [ ] Review hosting costs
- [ ] Update dependencies to latest stable versions

---

## Emergency Contacts & Resources

### Service Status Pages
- Vercel: https://www.vercel-status.com/
- Railway: https://status.railway.app/
- Supabase: https://status.supabase.com/
- Upstash: https://status.upstash.com/
- Cloudflare: https://www.cloudflarestatus.com/

### Support Links
- Vercel Support: https://vercel.com/support
- Railway Support: https://railway.app/discord
- Supabase Support: https://supabase.com/docs/support
- Upstash Support: https://upstash.com/docs

### Rollback Procedures
1. **Frontend**: Vercel → Deployments → Previous successful deployment → Promote to Production
2. **Backend**: Railway → Deployments → Previous version → Restore
3. **Database**: Supabase → Settings → Database → Restore from backup

---

## Success Criteria

Your deployment is successful when:
- ✅ All functional tests pass
- ✅ No critical errors in logs
- ✅ Performance metrics are acceptable
- ✅ Security checks pass
- ✅ Monitoring is active
- ✅ Team trained on maintenance procedures

**Congratulations! Your SyncParty app is production-ready! 🎉**

---

## Quick Reference Commands

```bash
# Local development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run linter
npm test                 # Run tests

# Deployment
./scripts/deploy.sh      # Run automated deployment

# Database
psql $DATABASE_URL -f infra/database-schema.sql  # Apply schema

# Environment
cp .env.example .env.local   # Create local env file
openssl rand -base64 32      # Generate JWT secret
```

---

**Last Updated:** $(date)
**Version:** 1.0.0
