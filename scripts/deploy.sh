#!/bin/bash

# ============================================
# DEPLOYMENT SCRIPT FOR SYNCPARTY
# ============================================
# This script automates the deployment process
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# CONFIGURATION
# ============================================

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  SyncParty Deployment Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Warning: .env.local not found${NC}"
    echo "Copying from .env.example..."
    cp .env.example .env.local
    echo -e "${YELLOW}Please edit .env.local with your actual values before continuing${NC}"
    exit 1
fi

# Load environment variables
source .env.local

# ============================================
# FUNCTIONS
# ============================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# ============================================
# PREREQUISITES CHECK
# ============================================

log_info "Checking prerequisites..."

check_command node
check_command npm
check_command git

# Check for Vercel CLI (optional)
if command -v vercel &> /dev/null; then
    log_success "Vercel CLI found"
else
    log_warning "Vercel CLI not found. Install with: npm i -g vercel"
fi

# Check for Railway CLI (optional)
if command -v railway &> /dev/null; then
    log_success "Railway CLI found"
else
    log_warning "Railway CLI not found. Install with: npm i -g @railway/cli"
fi

echo ""

# ============================================
# INSTALL DEPENDENCIES
# ============================================

log_info "Installing dependencies..."
npm ci
log_success "Dependencies installed"

echo ""

# ============================================
# RUN LINTER
# ============================================

log_info "Running linter..."
if npm run lint; then
    log_success "Linting passed"
else
    log_error "Linting failed. Please fix errors before deploying."
    exit 1
fi

echo ""

# ============================================
# RUN TESTS
# ============================================

log_info "Running tests..."
if npm test -- --passWithNoTests; then
    log_success "Tests passed"
else
    log_warning "Some tests failed. Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        exit 1
    fi
fi

echo ""

# ============================================
# BUILD APPLICATION
# ============================================

log_info "Building application..."
if npm run build; then
    log_success "Build completed"
else
    log_error "Build failed. Please check the errors above."
    exit 1
fi

echo ""

# ============================================
# DATABASE MIGRATIONS
# ============================================

log_info "Running database migrations..."

if [ -n "$DATABASE_URL" ]; then
    # Check if psql is available
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -f infra/database-schema.sql > /dev/null 2>&1; then
            log_success "Database schema applied successfully"
        else
            log_warning "Failed to apply database schema. Apply manually via Supabase/Railway dashboard."
        fi
    else
        log_warning "psql not found. Please apply database schema manually via Supabase/Railway dashboard."
    fi
else
    log_warning "DATABASE_URL not set. Skipping database migrations."
fi

echo ""

# ============================================
# DEPLOY TO VERCEL (FRONTEND)
# ============================================

log_info "Deploying to Vercel..."

if command -v vercel &> /dev/null; then
    if [ -n "$VERCEL_TOKEN" ]; then
        vercel --prod --token="$VERCEL_TOKEN"
        log_success "Deployed to Vercel"
    else
        log_warning "VERCEL_TOKEN not set. Deploy manually with: vercel --prod"
        echo "Would you like to deploy interactively? (y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            vercel --prod
            log_success "Deployed to Vercel"
        fi
    fi
else
    log_warning "Vercel CLI not installed. Deploy manually at https://vercel.com"
fi

echo ""

# ============================================
# DEPLOY TO RAILWAY (BACKEND)
# ============================================

log_info "Deploying to Railway..."

if command -v railway &> /dev/null; then
    if [ -n "$RAILWAY_TOKEN" ]; then
        railway up --service your-backend-service --environment production
        log_success "Deployed to Railway"
    else
        log_warning "RAILWAY_TOKEN not set. Deploy manually with: railway up"
        echo "Would you like to deploy interactively? (y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            railway up
            log_success "Deployed to Railway"
        fi
    fi
else
    log_warning "Railway CLI not installed. Deploy manually at https://railway.app"
fi

echo ""

# ============================================
# SUMMARY
# ============================================

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify your deployment at the URLs provided above"
echo "2. Test all features (video sync, chat, file uploads)"
echo "3. Monitor logs in Vercel and Railway dashboards"
echo "4. Set up monitoring and alerts"
echo ""
echo -e "${YELLOW}Important:${NC} Remember to keep your .env.local file secure and never commit it to Git!"
echo ""
