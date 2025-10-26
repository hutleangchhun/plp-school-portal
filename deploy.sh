#!/bin/bash
set -e

echo "🚀 Starting deployment..."

cd /opt/frontend

echo "📦 Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "🐳 Building Docker image..."
docker compose build

echo "🔁 Restarting container..."
docker compose up -d

echo "✅ Deployment complete."
