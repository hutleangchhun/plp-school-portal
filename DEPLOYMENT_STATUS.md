# Teacher Portal - Deployment Status

## ✅ Deployment Completed Successfully

Your Teacher Portal application is now deployed and running on your server!

---

## Current Setup

### Server Details
- **Server IP**: `192.168.155.122`
- **Server User**: `admin_moeys`
- **Deployment Directory**: `/opt/plp-school-portal`

### Application Architecture

```
Browser/Client
    ↓
Reverse Proxy (167.179.43.14) - Managed by MOEYS IT
    ↓
Your Server (192.168.155.122:80)
    ↓
Nginx (Reverse Proxy on port 80)
    ↓
Docker Container (port 3001)
    ↓
React Application (Teacher Portal)
```

---

## How to Access Your Application

### ✅ Working - Local Server Access
```bash
# On the server itself
curl http://127.0.0.1
curl http://127.0.0.1:3001
```

### ✅ Working - From Your Laptop (on VPN)
```bash
# From your laptop while on VPN
curl http://192.168.155.122
```
Open in browser: `http://192.168.155.122`

### ⏳ Pending - Via Domain
```
http://plp-sms.moeys.gov.kh
```
**Status**: Waiting for MOEYS IT to configure the reverse proxy at `167.179.43.14`

---

## Deployment Components

### Docker Container
- **Status**: ✅ Running
- **Port**: `3001`
- **Image**: `plp-school-portal_frontend:latest`
- **Check Status**:
  ```bash
  ssh admin_moeys@192.168.155.122 'docker-compose ps'
  ```

### Nginx Reverse Proxy
- **Status**: ✅ Running
- **Port**: `80`
- **Config**: `/etc/nginx/sites-available/plp-sms`
- **Check Status**:
  ```bash
  sudo systemctl status nginx
  sudo ss -tlnp | grep :80
  ```

### Application
- **Framework**: React (Vite)
- **Language**: Khmer (km.js)
- **Build Output**: `/app/dist`
- **Server**: Nginx inside Docker container

---

## Recent Changes

### Code Updates
- ✅ Khmer language support for AttendanceApprovalPage
- ✅ Removed personal QR code management feature
- ✅ Simplified docker-compose configuration
- ✅ Created nginx-docker.conf for static file serving
- ✅ Updated Dockerfile to use correct nginx config

### Configuration Files
- ✅ `docker-compose.yml` - Docker Compose configuration
- ✅ `Dockerfile` - Multi-stage build (Node.js → Nginx)
- ✅ `nginx-docker.conf` - Simple static file server inside Docker
- ✅ `nginx.conf` - Reverse proxy configuration (for reference)

---

## Useful Commands

### Check Application Status
```bash
# SSH into server
ssh admin_moeys@192.168.155.122

# View Docker container status
docker-compose ps

# View application logs
docker-compose logs -f

# Test local access
curl http://127.0.0.1

# Check nginx status
sudo systemctl status nginx
sudo ss -tlnp | grep :80
```

### Deploy Updates
```bash
# Pull latest code
cd /opt/plp-school-portal
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose down
docker-compose up -d
docker-compose ps
```

### View Logs
```bash
# Application logs
docker-compose logs -f

# Nginx access logs
sudo tail -f /var/log/nginx/plp-sms.access.log

# Nginx error logs
sudo tail -f /var/log/nginx/plp-sms.error.log
```

---

## Next Steps

### 1. **Wait for Reverse Proxy Configuration**
   - Contact MOEYS IT to configure `167.179.43.14` reverse proxy
   - Ensure it forwards traffic to `192.168.155.122:80`
   - Once configured, domain access will work

### 2. **Test from Your Laptop (VPN)**
   ```bash
   curl http://192.168.155.122
   # Open in browser: http://192.168.155.122
   ```

### 3. **Set Up Automatic Deployments (Optional)**
   - Configure GitHub Actions CI/CD pipeline
   - Generate SSH key on server:
     ```bash
     ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "github-actions" -N ""
     cat ~/.ssh/github_deploy
     ```
   - Add to GitHub Secrets: `SERVER_SSH_KEY`
   - Update deploy workflow to automatically deploy on git push

### 4. **Monitor Application**
   - Keep Docker logs running: `docker-compose logs -f`
   - Watch for any errors or issues
   - Scale up if needed in future

### 5. **Backup Configuration**
   ```bash
   # Backup current deployment
   tar -czf ~/plp-deployment-backup-$(date +%Y%m%d).tar.gz /opt/plp-school-portal
   ```

---

## Troubleshooting

### Container Not Starting?
```bash
# Check logs
docker-compose logs

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Nginx Not Responding?
```bash
# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check what's listening on port 80
sudo ss -tlnp | grep :80
```

### Can't Access from Laptop?
1. Verify you're on VPN
2. Verify server is reachable: `ping 192.168.155.122`
3. Verify port 80 is open: `telnet 192.168.155.122 80`
4. Check nginx config: `cat /etc/nginx/sites-available/plp-sms`

### Domain Not Working?
Contact MOEYS IT to verify:
- Reverse proxy (167.179.43.14) is forwarding to 192.168.155.122
- Port 80 is accessible
- DNS is properly configured

---

## System Information

- **OS**: Ubuntu 22.04
- **Docker**: 28.2.2
- **Docker Compose**: 1.29.2
- **Nginx**: 1.18.0 (host), 1.29.2 (container)
- **Node.js**: 18-alpine (build stage)

---

## Important Files

```
/opt/plp-school-portal/
├── docker-compose.yml          # Docker configuration
├── Dockerfile                  # Multi-stage build
├── nginx-docker.conf           # Nginx config inside container
├── nginx.conf                  # Nginx config (reference)
├── deploy-to-server.sh         # Deployment script
├── src/                        # React application source
├── dist/                       # Built application (inside Docker)
└── node_modules/               # Dependencies
```

---

## Support

For issues or questions:
1. Check server logs: `ssh admin_moeys@192.168.155.122 'docker-compose logs'`
2. Test local access: `curl http://192.168.155.122`
3. Verify DNS: `nslookup plp-sms.moeys.gov.kh`
4. Contact MOEYS IT for reverse proxy issues

---

**Deployment Date**: October 26, 2025
**Status**: ✅ Production Ready
**Last Updated**: 2025-10-26 16:52 UTC+7

