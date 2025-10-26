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
SERVER_IP="192.168.155.122"
DEPLOYMENT_DIR="/opt/plp-school-portal"
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
log_info "╚══════════════════════════════════════════════════════════╝"
log_info ""

log_info "Connecting to server and pulling latest code..."
ssh ${SERVER_USER}@${SERVER_IP} bash -c "
    set -e
    cd ${DEPLOYMENT_DIR}

    echo 'Pulling latest code...'
    git fetch origin main
    git reset --hard origin/main

    echo 'Building Docker image...'
    docker compose build

    echo 'Stopping old container...'
    docker compose down || true

    echo 'Starting new container...'
    docker compose up -d

    echo 'Container status:'
    docker compose ps
"

log_success "Deployment completed successfully!"
log_info ""
log_info "Next steps:"
log_info "1. Verify the application is running:"
log_info "   curl http://plp-sms.moeys.gov.kh"
log_info ""
log_info "2. Check container logs:"
log_info "   ssh ${SERVER_USER}@${SERVER_IP} 'cd ${DEPLOYMENT_DIR} && docker compose logs -f'"
log_info ""
