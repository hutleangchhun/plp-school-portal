# Server Deployment Guide - PLP School Portal

Complete guide for deploying the application to production server with subdomain `plp-sms.moeys.gov.kh`.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   DNS Resolution     │
                    │  plp-sms.moeys...    │
                    └──────────────┬───────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
        ┌──────────────────────┐    ┌──────────────────────┐
        │  Production Reverse  │    │ Corporate Firewall   │
        │     Proxy (MOEYS)    │    │   (Port Forwarding)  │
        │  167.179.43.14       │    │   192.168.155.122:80 │
        └──────────────┬───────┘    └──────────────────────┘
                       │                     ▲
                       └─────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Nginx Reverse Proxy │
                    │  Port 80 (HTTP)      │
                    │  Port 443 (HTTPS)    │
                    └──────────────┬───────┘
                                   │
                                   ▼
                    ┌──────────────────────┐
                    │  Docker Container    │
                    │  Port 3001           │
                    │  React Application   │
                    │  + Nginx (internal)  │
                    └──────────────┬───────┘
                                   │
                                   ▼
                    ┌──────────────────────┐
                    │  Backend API         │
                    │  https://plp-api...  │
                    │  moeys.gov.kh/api/v1 │
                    └──────────────────────┘
```

## Prerequisites

### Server Requirements
- Ubuntu 20.04 or later
- Docker & Docker Compose installed
- Nginx installed
- Git installed
- SSH access with key authentication
- Sudo privileges

### Domain & DNS
- Domain: `plp-sms.moeys.gov.kh`
- DNS A record pointing to your server IP
- SSL certificate (Let's Encrypt or self-signed)

## Step-by-Step Deployment

### 1. Initial Server Setup (One-time)

```bash
# Connect to server
ssh admin_moeys@192.168.155.122

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y docker.io docker-compose nginx git curl certbot python3-certbot-nginx

# Start services
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl start nginx
sudo systemctl enable nginx

# Add current user to docker group (optional, for sudo-less docker)
sudo usermod -aG docker $USER

# Clone repository
git clone https://github.com/hutleangchhun/plp-school-portal.git /opt/plp-school-portal
cd /opt/plp-school-portal

# Verify .env.production exists
ls -la .env.production
```

### 2. Deploy Application (Using Script)

```bash
# From your local machine
bash deploy-to-server.sh
```

This script will:
- Pull latest code from main branch
- Build Docker image
- Start container on port 3001
- Verify application health

### 3. Manual Deployment (If Script Fails)

```bash
# SSH into server
ssh admin_moeys@192.168.155.122

# Navigate to project
cd /opt/plp-school-portal

# Pull latest code
git fetch origin main
git reset --hard origin/main

# Build and start Docker
docker compose build
docker compose down || true
docker compose up -d

# Verify
docker compose ps
docker compose logs -f
```

### 4. Setup Nginx Reverse Proxy

The reverse proxy forwards port 80 to Docker port 3001 and handles SSL/TLS.

```bash
# SSH to server
ssh admin_moeys@192.168.155.122

# Copy nginx configuration
sudo cp /opt/plp-school-portal/nginx-reverse-proxy.conf /etc/nginx/sites-available/plp-sms

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable site
sudo ln -s /etc/nginx/sites-available/plp-sms /etc/nginx/sites-enabled/plp-sms

# Test nginx configuration
sudo nginx -t

# If test passes, restart nginx
sudo systemctl restart nginx
```

### 5. Setup SSL Certificate

```bash
# SSH to server
ssh admin_moeys@192.168.155.122

# Option A: Using Let's Encrypt (Automatic)
sudo certbot certonly --standalone \
  -d plp-sms.moeys.gov.kh \
  -d www.plp-sms.moeys.gov.kh \
  --agree-tos \
  --email admin@moeys.gov.kh \
  --non-interactive

# Option B: If you already have certificates
# Copy your certificates to:
# /etc/letsencrypt/live/plp-sms.moeys.gov.kh/fullchain.pem
# /etc/letsencrypt/live/plp-sms.moeys.gov.kh/privkey.pem

# Verify certificates
sudo ls -la /etc/letsencrypt/live/plp-sms.moeys.gov.kh/

# Update nginx config with certificate paths (if different)
sudo nano /etc/nginx/sites-available/plp-sms
# Update lines:
# ssl_certificate /path/to/fullchain.pem;
# ssl_certificate_key /path/to/privkey.pem;

# Reload nginx
sudo systemctl reload nginx
```

### 6. Verify Deployment

```bash
# Check Docker container
ssh admin_moeys@192.168.155.122 'docker compose -f /opt/plp-school-portal/docker-compose.yml ps'

# Check if listening on port 3001
ssh admin_moeys@192.168.155.122 'curl -I http://localhost:3001'

# Check if health endpoint works
ssh admin_moeys@192.168.155.122 'curl http://localhost:3001/health'

# Check nginx status
ssh admin_moeys@192.168.155.122 'sudo systemctl status nginx'

# Test SSL/domain
curl -I https://plp-sms.moeys.gov.kh
```

## Configuration Files

### Docker Compose (`docker-compose.yml`)

```yaml
# Container runs on port 3001
ports:
  - "3001:80"

# Environment variables for production
environment:
  - NODE_ENV=production
  - VITE_API_URL=https://plp-api.moeys.gov.kh/api/v1
  - VITE_STATIC_BASE_URL=https://plp-api.moeys.gov.kh
```

### Nginx Reverse Proxy (`nginx-reverse-proxy.conf`)

```nginx
# Forwards traffic from port 80 → Docker port 3001
upstream plp_frontend {
    server 127.0.0.1:3001;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name plp-sms.moeys.gov.kh;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name plp-sms.moeys.gov.kh;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/plp-sms.moeys.gov.kh/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/plp-sms.moeys.gov.kh/privkey.pem;

    # Proxy to Docker
    location / {
        proxy_pass http://plp_frontend;
        # ... headers and settings
    }
}
```

## Port Configuration

| Component | Port | Protocol | Notes |
|-----------|------|----------|-------|
| Public Internet | 80, 443 | HTTP/HTTPS | User access through domain |
| Nginx (Reverse Proxy) | 80, 443 | HTTP/HTTPS | Receives public traffic |
| Docker Container | 3001 | HTTP | Internal only |
| Backend API | 443 | HTTPS | External API calls |

**Flow:** Browser → Port 80/443 (Nginx) → Port 3001 (Docker) → Backend API

## Troubleshooting

### Application not accessible via domain

```bash
# 1. Check DNS resolution
nslookup plp-sms.moeys.gov.kh

# 2. Check if Docker is running
docker ps | grep teacher-portal

# 3. Check if Docker is listening on 3001
netstat -tlnp | grep 3001

# 4. Check nginx status
sudo systemctl status nginx

# 5. Check nginx logs
sudo tail -f /var/log/nginx/plp-sms-error.log

# 6. Check docker logs
docker compose -f /opt/plp-school-portal/docker-compose.yml logs -f
```

### Port already in use

```bash
# Find process on port 3001
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>

# Or restart Docker
docker compose -f /opt/plp-school-portal/docker-compose.yml restart
```

### Nginx certificate errors

```bash
# Test nginx config
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Renew certificate
sudo certbot renew --force-renewal

# Check certificate validity
sudo certbot certificates
```

### Docker build fails

```bash
# View full build logs
docker compose -f /opt/plp-school-portal/docker-compose.yml build --no-cache

# Free up disk space
docker system prune -a

# Rebuild
docker compose -f /opt/plp-school-portal/docker-compose.yml build
```

## Monitoring & Maintenance

### View Logs

```bash
# Application logs
docker compose -f /opt/plp-school-portal/docker-compose.yml logs -f --tail=100

# Nginx access logs
sudo tail -f /var/log/nginx/plp-sms-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/plp-sms-error.log

# System logs
sudo journalctl -u docker -f
```

### Check Health

```bash
# Docker health
docker compose -f /opt/plp-school-portal/docker-compose.yml ps

# Application endpoint
curl https://plp-sms.moeys.gov.kh

# Backend connection
curl https://plp-api.moeys.gov.kh/api/v1/health
```

### Restart Services

```bash
# Restart Docker container
docker compose -f /opt/plp-school-portal/docker-compose.yml restart

# Restart Nginx
sudo systemctl restart nginx

# Full restart
docker compose -f /opt/plp-school-portal/docker-compose.yml down
docker compose -f /opt/plp-school-portal/docker-compose.yml up -d
sudo systemctl restart nginx
```

## Update Application

To deploy a new version:

```bash
# Option 1: Using deployment script (Recommended)
bash deploy-to-server.sh

# Option 2: Manual update
ssh admin_moeys@192.168.155.122 'cd /opt/plp-school-portal && git pull && docker compose build && docker compose up -d'
```

## Backup & Disaster Recovery

### Backup Application Code

```bash
# Create backup
tar -czf plp-school-portal-$(date +%Y%m%d).tar.gz /opt/plp-school-portal

# Copy to safe location
scp plp-school-portal-*.tar.gz backup-server:/backups/
```

### Backup Certificates

```bash
# Backup SSL certificates
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt

# Copy to safe location
sudo cp letsencrypt-backup-*.tar.gz /opt/plp-school-portal/backups/
```

## SSL Certificate Renewal

Let's Encrypt certificates expire after 90 days. Set up auto-renewal:

```bash
# Check renewal
sudo certbot renew --dry-run

# Enable auto-renewal (check if already enabled)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check timer status
sudo systemctl status certbot.timer

# Manually renew if needed
sudo certbot renew --force-renewal
```

## Firewall Configuration (If Applicable)

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check rules
sudo ufw status
```

## Summary

✅ **Setup Steps:**
1. Clone repository to `/opt/plp-school-portal`
2. Run `bash deploy-to-server.sh`
3. Configure Nginx reverse proxy
4. Setup SSL certificate
5. Verify access via domain

✅ **Result:**
- Docker running on port 3001
- Nginx forwarding port 80 → 3001
- HTTPS enabled via SSL certificate
- Access via `https://plp-sms.moeys.gov.kh`

✅ **Key Files:**
- `docker-compose.yml` - Container configuration
- `nginx-reverse-proxy.conf` - Reverse proxy setup
- `deploy-to-server.sh` - Automated deployment
- `.env.production` - Environment variables

✅ **Monitoring:**
- View logs: `docker compose logs -f`
- Check health: `curl https://plp-sms.moeys.gov.kh`
- Monitor Nginx: `sudo tail -f /var/log/nginx/plp-sms-*.log`
