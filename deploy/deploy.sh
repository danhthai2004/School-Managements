#!/bin/bash

# ============================================
# EC2 Deployment Script
# ============================================
# Run this script on EC2 to deploy the backend

set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd ~/School-Managements

# Pull latest code from main branch
echo "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "⚠️ Warning: .env file not found"
fi

# Rebuild and restart containers
echo "🐳 Rebuilding Docker containers..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Clean up
echo "🧹 Cleaning up old images..."
docker image prune -f

# Check status
echo "📊 Container status:"
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed at $(date)"
