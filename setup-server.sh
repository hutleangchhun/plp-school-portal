#!/bin/bash

#############################################################################
#                   TEACHER PORTAL SERVER SETUP SCRIPT                      #
#                                                                           #
# This script automates the complete setup for deployment on your server   #
# Usage: bash setup-server.sh                                              #
#                                                                           #
# Prerequisites:                                                            #
# - Ubuntu/Debian based system                                             #
# - Internet connection                                                    #
# - Sudo access                                                            #
# - Domain pointing to this server's IP                                    #
#############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_DIR="/opt/frontend"
DOMAIN="plp-sms.moeys.gov.kh"
WWW_DOMAIN="www.plp-sms.moeys.gov.kh"
EMAIL="hutleangchhun@gmail.com"  # Change this to your email

# Functions
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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        echo "Run: sudo bash setup-server.sh"
        exit 1
    fi
}

# Update system
update_system() {
    log_info "Updating system packages..."
    apt update
    apt upgrade -y
    log_success "System updated"
}

# Install Docker
install_docker() {
    log_info "Checking Docker installation..."

    if command -v docker &> /dev/null; then
        log_success "Docker already installed: $(docker --version)"
    else
        log_info "Installing Docker..."

        # Install Docker dependencies
        apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

        # Add Docker GPG key
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

        # Add Docker repository
        echo \
            "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
            $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

        # Install Docker
        apt update
        apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

        # Start Docker
        systemctl start docker
        systemctl enable docker

        log_success "Docker installed successfully"
    fi
}

# Install Docker Compose
install_docker_compose() {
    log_info "Checking Docker Compose installation..."

    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose already installed: $(docker-compose --version)"
    else
        log_info "Installing Docker Compose..."

        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose

        log_success "Docker Compose installed successfully"
    fi
}

# Install Certbot
install_certbot() {
    log_info "Checking Certbot installation..."

    if command -v certbot &> /dev/null; then
        log_success "Certbot already installed: $(certbot --version)"
    else
        log_info "Installing Certbot..."
        apt install -y certbot python3-certbot-nginx
        log_success "Certbot installed successfully"
    fi
}

# Create deployment directory
setup_deployment_dir() {
    log_info "Setting up deployment directory: $DEPLOYMENT_DIR"

    if [ -d "$DEPLOYMENT_DIR" ]; then
        log_warning "Directory $DEPLOYMENT_DIR already exists"
    else
        mkdir -p "$DEPLOYMENT_DIR"
        log_success "Created $DEPLOYMENT_DIR"
    fi

    cd "$DEPLOYMENT_DIR"
}

# Clone or update repository
setup_repository() {
    log_info "Setting up repository..."

    if [ -d "$DEPLOYMENT_DIR/.git" ]; then
        log_info "Repository already exists, updating..."
        cd "$DEPLOYMENT_DIR"
        git fetch origin main
        git reset --hard origin/main
        log_success "Repository updated"
    else
        log_info "Cloning repository (you'll need to provide the URL)"
        echo ""
        echo "Please clone your repository:"
        echo "  cd $DEPLOYMENT_DIR"
        echo "  git clone <your-repo-url> ."
        echo ""
        log_warning "Skipping clone - please do this manually"
    fi
}

# Check DNS resolution
check_dns() {
    log_info "Checking DNS resolution for $DOMAIN..."

    if nslookup "$DOMAIN" &> /dev/null; then
        IP=$(nslookup "$DOMAIN" | grep -oP 'Address: \K.*' | head -1)
        log_success "Domain $DOMAIN resolves to: $IP"
    else
        log_error "Domain $DOMAIN does not resolve!"
        log_warning "Please configure DNS before continuing"
        return 1
    fi
}

# Get SSL certificate
get_ssl_certificate() {
    log_info "Getting SSL certificate for $DOMAIN..."

    # Check if certificate already exists
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        log_success "SSL certificate already exists for $DOMAIN"
        log_info "Certificate details:"
        certbot certificates
    else
        log_info "Requesting SSL certificate from Let's Encrypt..."

        # Make sure ports 80 and 443 are available
        if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_error "Port 80 is in use. Please stop the service using it."
            lsof -i :80
            return 1
        fi

        if lsof -Pi :443 -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_error "Port 443 is in use. Please stop the service using it."
            lsof -i :443
            return 1
        fi

        # Request certificate with standalone mode
        certbot certonly --standalone \
            -d "$DOMAIN" \
            -d "$WWW_DOMAIN" \
            --email "$EMAIL" \
            --agree-tos \
            --non-interactive \
            --preferred-challenges http

        if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
            log_success "SSL certificate obtained successfully!"
            log_info "Certificate location: /etc/letsencrypt/live/$DOMAIN/"
        else
            log_error "Failed to obtain SSL certificate"
            return 1
        fi
    fi
}

# Setup auto-renewal
setup_auto_renewal() {
    log_info "Setting up automatic certificate renewal..."

    # Enable certbot timer
    systemctl enable certbot.timer
    systemctl start certbot.timer

    log_success "Automatic renewal configured"
    log_info "Renewal status:"
    systemctl status certbot.timer

    # Test renewal
    log_info "Testing renewal process (dry-run)..."
    certbot renew --dry-run
    log_success "Renewal test passed"
}

# Build Docker image
build_docker_image() {
    log_info "Building Docker image..."

    cd "$DEPLOYMENT_DIR"

    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found in $DEPLOYMENT_DIR"
        log_warning "Please ensure you've cloned the repository correctly"
        return 1
    fi

    docker compose build

    log_success "Docker image built successfully"
}

# Start Docker container
start_docker_container() {
    log_info "Starting Docker container..."

    cd "$DEPLOYMENT_DIR"
    docker compose up -d

    log_success "Container started"
    log_info "Container status:"
    docker compose ps
}

# Verify setup
verify_setup() {
    log_info "Verifying setup..."

    sleep 5  # Wait for container to start

    # Test HTTP redirect
    log_info "Testing HTTP redirect..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "http://$DOMAIN" || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        log_success "HTTP redirect working (got status $HTTP_STATUS)"
    else
        log_warning "HTTP request returned status: $HTTP_STATUS"
    fi

    # Test HTTPS
    log_info "Testing HTTPS connection..."
    HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" --insecure || echo "000")
    if [ "$HTTPS_STATUS" = "200" ]; then
        log_success "HTTPS connection working (status $HTTPS_STATUS)"
    else
        log_warning "HTTPS request returned status: $HTTPS_STATUS"
    fi

    # Check container logs
    log_info "Container logs (last 10 lines):"
    docker compose logs --tail 10
}

# Setup GitHub Actions SSH key
setup_github_ssh() {
    log_info "Setting up SSH key for GitHub Actions..."

    SSH_KEY_PATH="/home/admin_moeys/.ssh/github_deploy"

    if [ -f "$SSH_KEY_PATH" ]; then
        log_warning "SSH key already exists"
    else
        log_info "Generating new SSH key..."
        ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -C "github-actions-deploy" -N ""

        # Add to authorized_keys
        cat "$SSH_KEY_PATH.pub" >> "/home/admin_moeys/.ssh/authorized_keys"
        chmod 600 "/home/admin_moeys/.ssh/authorized_keys"

        log_success "SSH key generated"
        log_info "SSH key location: $SSH_KEY_PATH"
    fi

    log_info ""
    log_info "To use this key in GitHub Actions:"
    log_info "1. Copy the private key:"
    log_info "   cat $SSH_KEY_PATH"
    log_info "2. Add to GitHub Secrets as SERVER_SSH_KEY"
    log_info ""
}

# Print summary
print_summary() {
    log_info ""
    log_info "╔══════════════════════════════════════════════════════════╗"
    log_info "║         ✅ SERVER SETUP COMPLETED SUCCESSFULLY           ║"
    log_info "╚══════════════════════════════════════════════════════════╝"
    log_info ""
    log_success "Setup Summary:"
    echo "
  Domain:              $DOMAIN
  Deployment Dir:      $DEPLOYMENT_DIR
  SSL Certificate:     /etc/letsencrypt/live/$DOMAIN/
  Docker Status:       Running
  Auto-Renewal:        Enabled

Next Steps:

  1. Clone your repository (if not done yet):
     cd $DEPLOYMENT_DIR
     git clone <your-repo-url> .

  2. Configure GitHub Secrets:
     - SERVER_SSH_KEY (copy from: cat ~/.ssh/github_deploy)
     - SERVER_USER: admin_moeys
     - SERVER_IP: 192.168.155.122

  3. Test GitHub Actions:
     - Push to main branch or manually trigger workflow

  4. Monitor logs:
     docker compose logs -f

  5. View certificate info:
     certbot certificates

  6. Check HTTPS:
     curl https://$DOMAIN

Commands to Remember:

  # View logs
  docker compose -f $DEPLOYMENT_DIR/docker-compose.yml logs -f

  # Restart container
  docker compose -f $DEPLOYMENT_DIR/docker-compose.yml restart

  # Check certificate renewal
  sudo certbot renew --dry-run

  # View all certificates
  sudo certbot certificates
    "
    log_info ""
}

# Main execution
main() {
    log_info "╔══════════════════════════════════════════════════════════╗"
    log_info "║      TEACHER PORTAL SERVER SETUP - Starting...          ║"
    log_info "╚══════════════════════════════════════════════════════════╝"
    log_info ""

    check_root

    # Execution steps
    update_system
    install_docker
    install_docker_compose
    install_certbot
    setup_deployment_dir
    setup_repository
    check_dns || log_warning "DNS check failed, but continuing..."
    get_ssl_certificate
    setup_auto_renewal
    build_docker_image
    start_docker_container
    verify_setup
    setup_github_ssh
    print_summary

    log_success "All setup steps completed!"
    log_info ""
}

# Run main function
main "$@"
