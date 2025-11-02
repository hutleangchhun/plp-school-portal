# Deployment Quick Start Guide

## One-Command Deployment

```bash
bash deploy-to-server.sh
```

That's it! The script handles everything.

---

## What the Script Does

1. ✅ Connects to server via SSH
2. ✅ Pulls latest code from GitHub
3. ✅ Builds Docker image
4. ✅ Stops old container
5. ✅ Starts new container on port 3001
6. ✅ Verifies application health

---

## After Deployment (First Time Setup Only)

### Step 1: Setup Nginx Reverse Proxy (SSH to Server)

```bash
ssh admin_moeys@192.168.155.122

# Copy configuration
sudo cp /opt/plp-school-portal/nginx-reverse-proxy.conf /etc/nginx/sites-available/plp-sms

# Enable site
sudo ln -s /etc/nginx/sites-available/plp-sms /etc/nginx/sites-enabled/plp-sms

# Remove default
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Step 2: Setup SSL Certificate

```bash
# If using Let's Encrypt
sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh

# Or if you have existing certificates, update the paths in:
# /etc/nginx/sites-available/plp-sms
```

### Step 3: Verify Everything Works

```bash
# Test locally
curl http://localhost:3001/health

# Test via domain
curl https://plp-sms.moeys.gov.kh

# View logs
docker compose -f /opt/plp-school-portal/docker-compose.yml logs -f
```

---

## Configuration Summary

| Item | Port | URL |
|------|------|-----|
| Docker Container | 3001 | http://localhost:3001 |
| Nginx Proxy | 80/443 | https://plp-sms.moeys.gov.kh |
| Backend API | 443 | https://plp-api.moeys.gov.kh/api/v1 |

---

## Common Commands

```bash
# View logs
docker compose -f /opt/plp-school-portal/docker-compose.yml logs -f

# Restart container
docker compose -f /opt/plp-school-portal/docker-compose.yml restart

# Stop container
docker compose -f /opt/plp-school-portal/docker-compose.yml down

# Check status
docker compose -f /opt/plp-school-portal/docker-compose.yml ps

# View nginx logs
sudo tail -f /var/log/nginx/plp-sms-error.log
```

---

## Troubleshooting

### Can't connect to https://plp-sms.moeys.gov.kh

```bash
# 1. Check if container is running
docker ps | grep teacher-portal

# 2. Check if nginx is running
sudo systemctl status nginx

# 3. Check nginx config
sudo nginx -t

# 4. View nginx error logs
sudo tail -f /var/log/nginx/plp-sms-error.log
```

### Port 3001 already in use

```bash
# Kill process
sudo lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs sudo kill -9

# Or restart docker
docker compose -f /opt/plp-school-portal/docker-compose.yml restart
```

### Certificate errors

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Update certificate paths in nginx config if needed
sudo nano /etc/nginx/sites-available/plp-sms
```

---

## File Reference

| File | Purpose |
|------|---------|
| `deploy-to-server.sh` | Automated deployment script |
| `docker-compose.yml` | Docker configuration |
| `nginx-reverse-proxy.conf` | Nginx reverse proxy configuration |
| `.env.production` | Production environment variables |
| `SERVER_DEPLOYMENT_GUIDE.md` | Detailed deployment documentation |
| `BACKEND_SETUP_GUIDE.md` | Backend configuration guide |

---

## Key Points

✅ **Docker**: Runs on port 3001 internally
✅ **Nginx**: Forwards port 80/443 to Docker port 3001
✅ **Domain**: https://plp-sms.moeys.gov.kh
✅ **Backend**: https://plp-api.moeys.gov.kh/api/v1
✅ **Auto-deploy**: `bash deploy-to-server.sh`

---

## Flow Diagram

```
User Browser
     ↓
https://plp-sms.moeys.gov.kh (Port 443)
     ↓
Nginx Reverse Proxy (Port 80/443)
     ↓
Docker Container (Port 3001)
     ↓
React Application (SPA)
     ↓
Backend API: https://plp-api.moeys.gov.kh/api/v1
```

---

## Need Help?

- **Setup Issues**: See `SERVER_DEPLOYMENT_GUIDE.md`
- **Backend Issues**: See `BACKEND_SETUP_GUIDE.md`
- **General Issues**: Check logs with `docker compose logs -f`
