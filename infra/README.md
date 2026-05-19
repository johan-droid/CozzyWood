# SyncParty - Deployment Configuration

This directory contains infrastructure and deployment configuration files.

## Files

- `database-schema.sql` - PostgreSQL database schema for Supabase/Railway
- `vercel.json` - Vercel deployment configuration (if needed)
- `railway.json` - Railway deployment configuration (if needed)
- `docker-compose.yml` - Local development with Docker (optional)

## Quick Deploy

### Option 1: Automated Script
```bash
./scripts/deploy.sh
```

### Option 2: Manual Steps
1. Set up all services (see DEPLOYMENT_GUIDE.md)
2. Configure environment variables
3. Push to GitHub
4. Connect repositories to Vercel and Railway
5. Deploy!

## Environment Variables

All required environment variables are documented in `.env.example`. Copy this file to `.env.local` and fill in your values.

## Database Setup

Run the database schema on your PostgreSQL instance:
```bash
psql $DATABASE_URL -f infra/database-schema.sql
```

Or apply via Supabase/Railway dashboard SQL editor.

## CI/CD

GitHub Actions workflow is configured in `.github/workflows/ci-cd.yml`. It will:
- Run linting and tests on every push/PR
- Deploy to Vercel (frontend) on main branch push
- Deploy to Railway (backend) on main branch push
- Run database migrations
- Send Slack notification (optional)

## Monitoring

After deployment, monitor your application through:
- Vercel Analytics & Logs
- Railway Metrics & Logs
- Supabase Dashboard
- Upstash Redis Insights
- Cloudflare R2 Analytics

## Troubleshooting

See the TROUBLESHOOTING section in DEPLOYMENT_GUIDE.md for common issues and solutions.
