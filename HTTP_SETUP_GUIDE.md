# HTTP Setup Guide (No HTTPS)

Quick guide for running the application with HTTP only (no HTTPS).

## Overview

```
User Browser (HTTP)
    ↓ Port 80
Nginx Reverse Proxy (HTTP)
    ↓ Port 3001
Docker Container
    ↓
React Application
    ↓
Backend API: https://plp-api.moeys.gov.kh/api/v1
```

---

## Step 1: Deploy Application

```bash
bash deploy-to-server.sh
```

This will:
- Connect to server via SSH
- Pull latest code
- Build Docker image
- Start container on port 3001

---

## Step 2: Setup Nginx Reverse Proxy (SSH to Server)

```bash
ssh admin_moeys@192.168.155.122

# Copy Nginx configuration
sudo cp /opt/plp-school-portal/nginx-reverse-proxy.conf /etc/nginx/sites-available/plp-sms

# Enable the site
sudo ln -s /etc/nginx/sites-available/plp-sms /etc/nginx/sites-enabled/plp-sms

# Disable default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 3: Verify It Works

### Test locally on server
```bash
curl http://localhost:3001/health
# Should return: "healthy"
```

### Test from another machine
```bash
curl http://plp-sms.moeys.gov.kh
# Should return HTML content
```

### Or open in browser
```
http://plp-sms.moeys.gov.kh
```

---

## Step 4: Test Application Features

- [ ] Application loads
- [ ] Login form appears
- [ ] Can enter credentials
- [ ] Login button works
- [ ] Dashboard loads
- [ ] Can see data
- [ ] No console errors

---

## Common Commands

### View application logs
```bash
ssh admin_moeys@192.168.155.122
cd /opt/plp-school-portal
docker-compose logs -f
```

### View Nginx logs
```bash
sudo tail -f /var/log/nginx/plp-sms-access.log
sudo tail -f /var/log/nginx/plp-sms-error.log
```

### Check if Nginx is running
```bash
sudo systemctl status nginx
```

### Check Docker container status
```bash
docker-compose ps
```

### Restart Nginx
```bash
sudo systemctl restart nginx
```

### Restart Docker container
```bash
docker-compose restart
```

---

## Troubleshooting

### "Connection refused" when accessing domain

1. Check if Nginx is running:
```bash
sudo systemctl status nginx
```

2. Check if Docker container is running:
```bash
docker ps
```

3. Check Nginx configuration:
```bash
sudo nginx -t
```

4. View Nginx error logs:
```bash
sudo tail -f /var/log/nginx/plp-sms-error.log
```

### "Port 80 already in use"

```bash
# Find what's using port 80
sudo lsof -i :80

# Or find what's using port 3001
sudo lsof -i :3001

# Kill the process (if needed)
sudo kill -9 <PID>

# Then restart services
sudo systemctl restart nginx
docker compose restart
```

### Application loads but doesn't work

1. Check Docker logs:
```bash
docker-compose logs -f
```

2. Open browser console (F12) for frontend errors

3. Check if backend API is reachable:
```bash
curl https://plp-api.moeys.gov.kh/api/v1/health
```

### DNS not resolving

1. Verify domain DNS:
```bash
nslookup plp-sms.moeys.gov.kh
ping plp-sms.moeys.gov.kh
```

2. If DNS not pointing to server IP, contact:
   - Your DNS provider or
   - MOEYS IT department

---

## Adding HTTPS Later

When you're ready to add HTTPS/SSL:

### Step 1: Get SSL Certificate
```bash
sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh
```

### Step 2: Edit Nginx Config
```bash
sudo nano /etc/nginx/sites-available/plp-sms
```

Uncomment the HTTPS section (lines 71-132)

### Step 3: Reload Nginx
```bash
sudo systemctl reload nginx
```

The nginx-reverse-proxy.conf file already has the HTTPS configuration ready to use. Just uncomment it and add your certificate paths.

---

## Configuration Files

**Nginx config location:**
```
/etc/nginx/sites-available/plp-sms
```

**Docker config:**
```
/opt/plp-school-portal/docker-compose.yml
```

**Application location:**
```
/opt/plp-school-portal
```

---

## Monitoring

### Check system resources
```bash
docker stats
free -h
df -h
```

### Monitor logs in real-time
```bash
# Application logs
docker-compose -f /opt/plp-school-portal/docker-compose.yml logs -f

# Nginx access logs
sudo tail -f /var/log/nginx/plp-sms-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/plp-sms-error.log
```

---

## Summary

✅ HTTP (port 80) running
✅ Docker on port 3001
✅ Nginx reverse proxy active
✅ Application accessible via domain
✅ Backend API connected

**No HTTPS** - Use HTTP only for now
**Ready to add HTTPS** - Just uncomment config when needed

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy | `bash deploy-to-server.sh` |
| View logs | `docker-compose logs -f` |
| Restart app | `docker-compose restart` |
| Restart nginx | `sudo systemctl restart nginx` |
| Test health | `curl http://localhost:3001/health` |
| Test domain | `curl http://plp-sms.moeys.gov.kh` |
| Check status | `docker-compose ps` |
| Nginx test | `sudo nginx -t` |

---

**Access your application:** http://plp-sms.moeys.gov.kh
