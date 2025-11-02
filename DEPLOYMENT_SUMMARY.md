# Deployment Configuration Summary

## ✅ What Has Been Setup

Your PLP School Portal application is now fully configured for:

1. **Local Development** - Connect to local backend on port 8080
2. **Server Deployment** - Deploy to production with subdomain `plp-sms.moeys.gov.kh`
3. **Docker** - Runs on port 3001 with automatic port forwarding
4. **Nginx Reverse Proxy** - Forwards port 80 → 3001
5. **SSL/HTTPS** - Ready for Let's Encrypt or custom certificates

---

## 📁 Configuration Files Created/Updated

### Environment Files
- ✅ `.env.development` - Local backend (port 8080)
- ✅ `.env.production` - Production backend (https://plp-api.moeys.gov.kh)
- ✅ `.env.example` - Template for reference

### Backend Configuration
- ✅ `src/utils/api/config.js` - Environment-aware API configuration
- ✅ Auto-detects development vs production mode
- ✅ Supports custom backend URLs via environment variables

### Docker Configuration
- ✅ `docker-compose.yml` - Container on port 3001 with production env vars
- ✅ `Dockerfile` - Multi-stage build (unchanged)
- ✅ `nginx-docker.conf` - Internal Nginx config (unchanged)

### Server Configuration
- ✅ `nginx-reverse-proxy.conf` - Reverse proxy for port 80/443 → 3001
- ✅ Includes SSL/TLS configuration
- ✅ Includes security headers
- ✅ Ready for Let's Encrypt certificates

### Deployment Scripts
- ✅ `deploy-to-server.sh` - One-command automated deployment
- ✅ Pulls latest code, builds, and starts container
- ✅ Includes comprehensive setup instructions

### Documentation
- ✅ `QUICK_START.md` - Fast reference guide
- ✅ `SERVER_DEPLOYMENT_GUIDE.md` - Detailed setup instructions
- ✅ `BACKEND_SETUP_GUIDE.md` - Backend configuration reference
- ✅ `DEPLOYMENT_SUMMARY.md` - This file

---

## 🚀 Quick Deployment Steps

### First Time Setup

```bash
# 1. Deploy application to server
bash deploy-to-server.sh

# 2. SSH to server and setup nginx reverse proxy
ssh admin_moeys@192.168.155.122
sudo cp /opt/plp-school-portal/nginx-reverse-proxy.conf /etc/nginx/sites-available/plp-sms
sudo ln -s /etc/nginx/sites-available/plp-sms /etc/nginx/sites-enabled/plp-sms
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 3. Setup SSL certificate (Let's Encrypt)
sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh

# 4. Verify
curl https://plp-sms.moeys.gov.kh
```

### Subsequent Deployments

```bash
# Just run the deployment script
bash deploy-to-server.sh
```

---

## 🔌 Port Configuration

```
┌─────────────────────────────────────────────────────┐
│ Public Internet (Users)                             │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼ (Port 80, 443)
        ┌─────────────────────────────┐
        │ Nginx Reverse Proxy         │
        │ (Forwards traffic)          │
        └─────────────────┬───────────┘
                          │
                          ▼ (Port 3001)
                ┌─────────────────────────┐
                │ Docker Container        │
                │ (React Application)     │
                │ (Port 3001)             │
                └─────────────────┬───────┘
                                  │
                                  ▼ (HTTPS)
                    ┌──────────────────────────┐
                    │ Backend API              │
                    │ plp-api.moeys.gov.kh    │
                    │ /api/v1                  │
                    └──────────────────────────┘
```

---

## 🌍 Domain & Access

| Component | URL | Port |
|-----------|-----|------|
| Public Domain | `https://plp-sms.moeys.gov.kh` | 443 (HTTPS) |
| Local Docker | `http://localhost:3001` | 3001 |
| Local Dev Backend | `http://localhost:8080/api/v1` | 8080 |
| Production Backend | `https://plp-api.moeys.gov.kh/api/v1` | 443 |

---

## 🔄 How It Works

### Development (Local)
```
npm run dev (port 3001)
    ↓
.env.development loaded
    ↓
Connects to http://localhost:8080/api/v1
```

### Production (Server)
```
npm run build
    ↓
docker compose build
    ↓
docker compose up -d (port 3001)
    ↓
Nginx reverse proxy (port 80/443)
    ↓
Connects to https://plp-api.moeys.gov.kh/api/v1
```

---

## 📋 Configuration Reference

### Docker-Compose Environment Variables
```yaml
environment:
  - NODE_ENV=production
  - VITE_API_URL=https://plp-api.moeys.gov.kh/api/v1
  - VITE_STATIC_BASE_URL=https://plp-api.moeys.gov.kh
```

### Nginx Reverse Proxy
```nginx
upstream plp_frontend {
    server 127.0.0.1:3001;  # Docker container
}

server {
    listen 80;              # HTTP port
    listen 443 ssl http2;   # HTTPS port
    server_name plp-sms.moeys.gov.kh;

    location / {
        proxy_pass http://plp_frontend;  # Forward to Docker
    }
}
```

### API Configuration
```javascript
// Automatic selection based on environment
if (development) → http://localhost:8080/api/v1
if (production) → https://plp-api.moeys.gov.kh/api/v1
```

---

## 🔒 SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)
```bash
sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh
# Certificates auto-placed in: /etc/letsencrypt/live/plp-sms.moeys.gov.kh/
```

### Option 2: Custom Certificates
```bash
# Update paths in nginx-reverse-proxy.conf:
ssl_certificate /path/to/fullchain.pem;
ssl_certificate_key /path/to/privkey.pem;
```

### Auto-Renewal
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🐛 Troubleshooting Quick Links

**Application not loading?**
- Check Docker: `docker ps`
- Check Nginx: `sudo systemctl status nginx`
- View logs: `docker compose logs -f`

**Port conflicts?**
- Check port 3001: `lsof -i :3001`
- Check port 80/443: `sudo lsof -i :80`

**Certificate issues?**
- Check cert: `sudo certbot certificates`
- Renew cert: `sudo certbot renew`

**Backend not responding?**
- Check API URL: `curl https://plp-api.moeys.gov.kh/api/v1/health`
- Check network: `ping plp-api.moeys.gov.kh`

---

## 📚 Documentation Map

```
DEPLOYMENT_SUMMARY.md (This file)
├── Quick overview and configuration reference
│
├── QUICK_START.md
│   └── Fast reference for deployment
│
├── SERVER_DEPLOYMENT_GUIDE.md
│   ├── Detailed step-by-step setup
│   ├── Nginx configuration
│   ├── SSL setup
│   ├── Troubleshooting
│   └── Monitoring & maintenance
│
├── BACKEND_SETUP_GUIDE.md
│   ├── Local development setup
│   ├── Backend configuration
│   ├── Environment files
│   └── API endpoint reference
│
└── Configuration Files
    ├── deploy-to-server.sh (Automated deployment)
    ├── docker-compose.yml (Docker config)
    ├── nginx-reverse-proxy.conf (Reverse proxy)
    ├── .env.development (Local dev)
    ├── .env.production (Server production)
    └── .env.example (Template)
```

---

## ✨ Key Features

✅ **Automatic Environment Detection**
- Development mode → Uses local backend (8080)
- Production mode → Uses server backend (plp-api.moeys.gov.kh)

✅ **One-Command Deployment**
- `bash deploy-to-server.sh` handles everything

✅ **Port Forwarding**
- Docker: Port 3001
- Nginx: Port 80/443 → 3001

✅ **SSL/TLS Ready**
- HTTPS enforced in production
- Easy Let's Encrypt integration

✅ **Health Checks**
- Docker health checks enabled
- Application monitoring ready

✅ **Comprehensive Documentation**
- Quick start guide
- Detailed setup guide
- Troubleshooting guide

---

## 🔧 Common Operations

### Deploy New Version
```bash
bash deploy-to-server.sh
```

### View Application Logs
```bash
docker compose -f /opt/plp-school-portal/docker-compose.yml logs -f
```

### Restart Application
```bash
docker compose -f /opt/plp-school-portal/docker-compose.yml restart
```

### Update Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/plp-sms
sudo nginx -t
sudo systemctl reload nginx
```

### Renew SSL Certificate
```bash
sudo certbot renew --force-renewal
```

---

## 📞 Support Resources

| Issue | Documentation |
|-------|-----------------|
| Setup questions | `SERVER_DEPLOYMENT_GUIDE.md` |
| Backend configuration | `BACKEND_SETUP_GUIDE.md` |
| Quick reference | `QUICK_START.md` |
| Port/proxy issues | `SERVER_DEPLOYMENT_GUIDE.md` → Troubleshooting |
| SSL/Certificate | `SERVER_DEPLOYMENT_GUIDE.md` → Step 5 |
| Local development | `BACKEND_SETUP_GUIDE.md` |

---

## 🎯 Summary

Your application is now ready for:

1. ✅ **Local Development** - `npm run dev` connects to localhost:8080
2. ✅ **Server Production** - `bash deploy-to-server.sh` deploys to plp-sms.moeys.gov.kh
3. ✅ **Docker Containerization** - Runs on port 3001 with auto-restart
4. ✅ **Reverse Proxy** - Nginx forwards port 80/443 to Docker
5. ✅ **SSL/HTTPS** - Ready for Let's Encrypt certificates
6. ✅ **Automated Deployment** - One-command deployment script
7. ✅ **Comprehensive Documentation** - Setup guides and troubleshooting

**Next Steps:**
1. Run `bash deploy-to-server.sh` from your local machine
2. SSH to server and run the Nginx setup commands
3. Setup SSL certificate
4. Test via `https://plp-sms.moeys.gov.kh`

---

**Last Updated:** November 2, 2024
**Backend:** https://plp-api.moeys.gov.kh/api/v1
**Frontend Domain:** https://plp-sms.moeys.gov.kh
**Docker Port:** 3001
**Public Port:** 80/443
