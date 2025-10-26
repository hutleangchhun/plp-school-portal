# Automated Server Setup Guide

## Overview

The `setup-server.sh` script automates the entire server setup process including:
- Docker installation
- Docker Compose installation
- Certbot installation
- SSL certificate generation
- Auto-renewal setup
- Docker image building
- Container startup
- GitHub Actions SSH key generation

## Prerequisites

Before running the script, ensure:
- ✅ Server is Ubuntu/Debian-based
- ✅ You have sudo/root access
- ✅ Domain `plp-sms.moeys.gov.kh` points to your server IP
- ✅ Ports 80 and 443 are open
- ✅ Git is installed on server

## Quick Start

### Step 1: Download the Script

```bash
# On your server
cd /tmp
wget https://raw.githubusercontent.com/YOUR_USERNAME/teacher-portal/main/setup-server.sh
# Or copy the file manually via SCP
```

### Step 2: Make it Executable

```bash
chmod +x setup-server.sh
```

### Step 3: Run the Script

```bash
sudo bash setup-server.sh
```

The script will:
1. ✅ Update system packages
2. ✅ Install Docker
3. ✅ Install Docker Compose
4. ✅ Install Certbot
5. ✅ Create deployment directory (`/opt/frontend`)
6. ✅ Get SSL certificate from Let's Encrypt
7. ✅ Setup auto-renewal
8. ✅ Build Docker image
9. ✅ Start Docker container
10. ✅ Verify setup
11. ✅ Generate GitHub Actions SSH key

## Configuration

Before running, you may want to customize these variables in the script:

```bash
DEPLOYMENT_DIR="/opt/frontend"          # Where to deploy
DOMAIN="plp-sms.moeys.gov.kh"           # Your domain
WWW_DOMAIN="www.plp-sms.moeys.gov.kh"   # WWW subdomain
EMAIL="admin@moeys.gov.kh"              # Your email for Let's Encrypt
```

## What Happens During Execution

### System Update Phase
```
ℹ️  Updating system packages...
✅ System updated
```

### Docker Installation
```
ℹ️  Checking Docker installation...
ℹ️  Installing Docker...
✅ Docker installed successfully
```

### Certbot Installation
```
ℹ️  Checking Certbot installation...
ℹ️  Installing Certbot...
✅ Certbot installed successfully
```

### SSL Certificate Generation
```
ℹ️  Getting SSL certificate for plp-sms.moeys.gov.kh...
ℹ️  Requesting SSL certificate from Let's Encrypt...
✅ SSL certificate obtained successfully!
```

### Docker Setup
```
ℹ️  Building Docker image...
✅ Docker image built successfully
ℹ️  Starting Docker container...
✅ Container started
```

### Verification
```
ℹ️  Verifying setup...
✅ HTTP redirect working
✅ HTTPS connection working
```

## What the Script Creates

### Directories
```
/opt/frontend/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── deploy.sh
└── ... (other project files)
```

### SSL Certificates
```
/etc/letsencrypt/live/plp-sms.moeys.gov.kh/
├── fullchain.pem
├── privkey.pem
├── cert.pem
└── chain.pem
```

### SSH Key for GitHub
```
~/.ssh/github_deploy          (private key)
~/.ssh/github_deploy.pub      (public key)
```

## After the Script Completes

### 1. Clone Your Repository

The script will display:
```
Please clone your repository:
  cd /opt/frontend
  git clone <your-repo-url> .
```

Do this manually:
```bash
cd /opt/frontend
git clone https://github.com/YOUR_USERNAME/teacher-portal.git .
```

### 2. Configure GitHub Secrets

Copy the private SSH key:
```bash
cat ~/.ssh/github_deploy
```

Add to GitHub repository Settings → Secrets:
- **SERVER_SSH_KEY**: (paste the entire private key)
- **SERVER_USER**: admin_moeys
- **SERVER_IP**: 192.168.155.122

### 3. Verify Everything Works

```bash
# Check container status
docker compose -f /opt/frontend/docker-compose.yml ps

# View logs
docker compose -f /opt/frontend/docker-compose.yml logs -f

# Test HTTPS
curl https://plp-sms.moeys.gov.kh

# Check certificate
sudo certbot certificates
```

## Troubleshooting

### Script Fails with Permission Denied
```bash
# Make sure you're using sudo
sudo bash setup-server.sh
```

### Port 80/443 Already in Use
```bash
# Find what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Stop the service
sudo systemctl stop nginx  # if nginx is running
```

### DNS Not Resolving
```bash
# Wait 5-10 minutes for DNS propagation
nslookup plp-sms.moeys.gov.kh

# Or use specific DNS server
nslookup plp-sms.moeys.gov.kh 8.8.8.8
```

### Certificate Generation Failed
```bash
# Check if ports are open
telnet localhost 80
telnet localhost 443

# Try manual certificate generation
sudo certbot certonly --standalone \
  -d plp-sms.moeys.gov.kh \
  -d www.plp-sms.moeys.gov.kh \
  --email admin@moeys.gov.kh \
  --agree-tos
```

### Docker Container Won't Start
```bash
# Check logs
docker compose -f /opt/frontend/docker-compose.yml logs

# Try rebuilding
docker compose -f /opt/frontend/docker-compose.yml build --no-cache
docker compose -f /opt/frontend/docker-compose.yml up -d
```

## Manual Setup (If Script Fails)

If the automated script fails, you can run these commands manually:

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# 5. Create directories
sudo mkdir -p /opt/frontend
sudo chown $USER:$USER /opt/frontend

# 6. Get SSL certificate
sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh

# 7. Clone repository
cd /opt/frontend
git clone <your-repo-url> .

# 8. Build and start
docker compose build
docker compose up -d

# 9. Generate SSH key
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "github-actions"
```

## Important Notes

1. **Email Address**: Update the EMAIL variable in the script to receive certificate renewal notifications

2. **Domain**: Change DOMAIN and WWW_DOMAIN if different from the default

3. **Repository**: The script does NOT clone the repository automatically (for safety). You must do this manually

4. **Firewall**: Ensure ports 80, 443, and 22 (SSH) are open on your firewall

5. **Disk Space**: Ensure you have at least 5GB free disk space

6. **VPN**: Make sure your VPN connection is stable while running the script

## Log Output

The script provides colored output:
- 🔵 **ℹ️ Info** - Information messages
- 🟢 **✅ Success** - Successfully completed steps
- 🟡 **⚠️ Warning** - Non-critical issues
- 🔴 **❌ Error** - Critical errors

## What to Do Next

1. ✅ Run the script
2. ✅ Clone your repository
3. ✅ Configure GitHub secrets
4. ✅ Push to main branch (triggers automatic deployment)
5. ✅ Monitor logs: `docker compose -f /opt/frontend/docker-compose.yml logs -f`
6. ✅ Visit: https://plp-sms.moeys.gov.kh

## Support

If you encounter issues:
1. Check the script output for error messages
2. Review the "Troubleshooting" section above
3. Check server logs: `docker compose logs`
4. Check certificate status: `sudo certbot certificates`
5. Review SSL_SETUP_GUIDE.md for more details

## Security Reminders

- ✅ Keep SSH keys private (never share them)
- ✅ Use strong passwords for server access
- ✅ Keep system and Docker updated
- ✅ Monitor certificate expiration (auto-renewal is set up)
- ✅ Review GitHub Actions logs for deployment status

---

**Ready to deploy? Run:** `sudo bash setup-server.sh`
