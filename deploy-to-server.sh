#!/bin/bash

#############################################################################
#                    DEPLOY TO SERVER SCRIPT                              #
#############################################################################

set -e

# Configuration
SERVER_USER="admin_moeys"
SERVER_IP="192.168.155.115"
DEPLOYMENT_DIR="/home/admin_moeys/plp-school-portal"
GIT_SSH_KEY="~/.ssh/plp-sms-key"
REPO_URL="git@github.com:hutleangchhun/plp-school-portal.git"
DOCKER_PORT=3001

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }

log_info "╔══════════════════════════════════════════════════════════╗"
log_info "║         DEPLOYING TO SERVER: ${SERVER_IP}               ║"
log_info "║         Docker Port: ${DOCKER_PORT} → Public Port: 80    ║"
log_info "╚══════════════════════════════════════════════════════════╝"

ssh ${SERVER_USER}@${SERVER_IP} bash -c "
    set -e

    cd ${DEPLOYMENT_DIR}

    # Use specific SSH key for GitHub
    export GIT_SSH_COMMAND='ssh -i ${GIT_SSH_KEY} -o StrictHostKeyChecking=no'

    # Check port
    if sudo lsof -i:${DOCKER_PORT} > /dev/null 2>&1; then
        echo '⚠️  Port ${DOCKER_PORT} is in use. Stopping any processes.'
        sudo lsof -ti:${DOCKER_PORT} | xargs -r sudo kill -9
    else
        echo '✅ Port ${DOCKER_PORT} is free.'
    fi

    log_step() {
        echo \"\"
        echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"
        echo \"📦 \$1\"
        echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"
    }

    log_step 'Pulling latest code'
    git fetch origin main
    git reset --hard origin/main

    log_step 'Stopping old containers'
    docker compose down || true

    log_step 'Building Docker image'
    docker compose build

    log_step 'Starting new container'
    docker compose up -d

    log_step 'Verifying container status'
    docker compose ps

    log_step 'Last 20 container logs'
    docker compose logs --tail=20

    log_step 'Checking application health'
    attempts=5
    until curl -s http://localhost:${DOCKER_PORT}/health || [ \$attempts -eq 0 ]; do
        echo 'Waiting for application to start...'
        attempts=\$((attempts-1))
        sleep 5
    done
    curl -s http://localhost:${DOCKER_PORT}/health || echo 'Health check pending...'
"

log_success "Deployment completed successfully!"
