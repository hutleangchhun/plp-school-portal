#!/bin/bash

#############################################################################
#                    DEPLOY TO SERVER SCRIPT                              #
#                                                                          #
# This script deploys the application to the server via SSH               #
# Usage: bash deploy-to-server.sh                                         #
#############################################################################

set -e

# Configuration
SERVER_USER="admin_moeys"
SERVER_IP="192.168.155.115"
DEPLOYMENT_DIR="/home/admin_moeys/plp-school-portal"
REPO_URL="https://github.com/hutleangchhun/plp-school-portal.git"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Main deployment
log_info "╔══════════════════════════════════════════════════════════╗"
log_info "║         DEPLOYING TO SERVER: ${SERVER_IP}          ║"
log_info "║         Domain: plp-sms.moeys.gov.kh                     ║"
log_info "║         Docker Port: 3001 → Public Port: 80              ║"
log_info "╚══════════════════════════════════════════════════════════╝"
log_info ""

log_info "Connecting to server and pulling latest code..."
ssh ${SERVER_USER}@${SERVER_IP} bash -c "
    set -e

    # Change to deployment directory
    cd ${DEPLOYMENT_DIR}

    # Check if port 3001 is in use before starting
    echo 'Pre-deployment check: Checking port 3001 status...'
    if sudo lsof -i:3001 > /dev/null 2>&1; then
        echo '⚠️  Port 3001 is currently in use. Will clean up before deployment.'
    else
        echo '✅ Port 3001 is free.'
    fi

    log_step() {
        echo \"\"
        echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"
        echo \"📦 \$1\"
        echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"
    }

    log_step 'Pulling latest code from repository'
    git fetch origin main
    git reset --hard origin/main

    log_step 'Stopping old container (if any)'
    docker-compose down || true

    log_step 'Building Docker image (this may take a few minutes)'
    docker-compose build

    log_step 'Starting new container on port 3001'
    docker-compose up -d

    log_step 'Verifying container status'
    docker-compose ps

    log_step 'Container logs'
    docker-compose logs --tail=20

    log_step 'Checking application health'
    sleep 5
    curl -s http://localhost:3001/health || echo 'Health check pending...'
"

log_success "Deployment completed successfully!"
log_info ""
log_info "╔══════════════════════════════════════════════════════════╗"
log_info "║                    DEPLOYMENT SUMMARY                    ║"
log_info "╚══════════════════════════════════════════════════════════╝"
log_info ""
log_info "✅ Application deployed to: ${SERVER_IP}"
log_info "✅ Docker container running on port: 3001"
log_info "✅ Backend API: https://plp-api.moeys.gov.kh/api/v1"
log_info ""
log_info "📋 Next steps to complete deployment:"
log_info ""
log_info "1️⃣  SET UP NGINX REVERSE PROXY (HTTP Only):"
log_info "   sudo cp /home/admin_moeys/nginx-reverse-proxy.conf /etc/nginx/sites-available/plp-sms"
log_info "   sudo ln -s /etc/nginx/sites-available/plp-sms /etc/nginx/sites-enabled/plp-sms"
log_info "   sudo rm -f /etc/nginx/sites-enabled/default"
log_info "   sudo nginx -t"
log_info "   sudo systemctl restart nginx"
log_info ""
log_info "2️⃣  VERIFY DEPLOYMENT:"
log_info "   curl http://localhost:3001/health"
log_info "   curl http://plp-sms.moeys.gov.kh"
log_info ""
log_info "3️⃣  ADD HTTPS LATER (Optional):"
log_info "   sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh"
log_info "   Then uncomment HTTPS section in nginx-reverse-proxy.conf"
log_info "   sudo systemctl reload nginx"
log_info ""
log_info "4️⃣  VIEW LOGS:"
log_info "   ssh ${SERVER_USER}@${SERVER_IP} 'cd ${DEPLOYMENT_DIR} && docker compose logs -f'"
log_info "   ssh ${SERVER_USER}@${SERVER_IP} 'sudo tail -f /var/log/nginx/plp-sms-access.log'"
log_info ""
log_info "╔══════════════════════════════════════════════════════════╗"
log_info "║         🚀 HTTP Deployment Ready for Testing             ║"
log_info "╚══════════════════════════════════════════════════════════╝"
log_info ""
