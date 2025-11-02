# 🚀 PLP School Portal - Deployment Guide

Complete deployment configuration for local development and production server with subdomain.

---

## ⚡ Quick Deploy

### One-Command Deployment
```bash
bash deploy-to-server.sh
```

**What it does:**
- Connects to server via SSH
- Pulls latest code from GitHub
- Builds Docker image
- Starts container on port 3001
- Verifies health

**Then SSH to server and run:**
```bash
ssh admin_moeys@192.168.155.122
sudo cp /opt/plp-school-portal/nginx-reverse-proxy.conf /etc/nginx/sites-available/plp-sms
sudo ln -s /etc/nginx/sites-available/plp-sms /etc/nginx/sites-enabled/plp-sms
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh
```

---

## 📋 Configuration Overview

### What's Been Setup

✅ **Environment Configuration**
- `.env.development` - Local backend (port 8080)
- `.env.production` - Production backend (plp-api.moeys.gov.kh)
- Auto-detection based on build mode

✅ **Docker**
- Multi-stage build for optimization
- Port 3001 with auto-restart
- Health checks enabled
- Production environment variables

✅ **Nginx Reverse Proxy**
- Port 80/443 forwarding to Docker 3001
- HTTP → HTTPS redirect
- SSL/TLS ready
- Security headers included

✅ **API Configuration**
- Environment-aware URL selection
- Development: http://localhost:8080/api/v1
- Production: https://plp-api.moeys.gov.kh/api/v1

✅ **Deployment Script**
- Automated SSH deployment
- Comprehensive logging
- Error handling

---

## 🌍 Access Points

| Component | URL/Port | Environment |
|-----------|----------|-------------|
| Public Domain | https://plp-sms.moeys.gov.kh | Production |
| Local Dev | http://localhost:3001 | Development |
| Docker Container | port 3001 | Both |
| Dev Backend | http://localhost:8080 | Development Only |
| Prod Backend | https://plp-api.moeys.gov.kh | Production Only |

---

## 🔄 Development Workflow

### Local Development
```bash
# Start local backend on port 8080
# Then...

npm run dev
# Frontend runs on port 3001
# Automatically connects to http://localhost:8080/api/v1
```

### Production Build
```bash
npm run build
docker compose build
docker compose up -d
# Docker runs on port 3001
# Nginx forwards port 80/443
# Connects to https://plp-api.moeys.gov.kh/api/v1
```

---

## 📁 Key Files

### Configuration Files
| File | Purpose |
|------|---------|
| `.env.development` | Local dev environment |
| `.env.production` | Production environment |
| `.env.example` | Template |

### Docker Files
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Container config |
| `Dockerfile` | Image build |
| `nginx-docker.conf` | Container Nginx |

### Deployment Files
| File | Purpose |
|------|---------|
| `deploy-to-server.sh` | Automated deployment |
| `nginx-reverse-proxy.conf` | Host Nginx config |

### API Configuration
| File | Purpose |
|------|---------|
| `src/utils/api/config.js` | API URLs & endpoints |
| `src/utils/api/client.js` | HTTP client |

---

## 📖 Documentation Map

```
DEPLOYMENT_README.md (This file - Quick Start)
│
├─ QUICK_START.md
│  └─ Fast reference for deployment
│
├─ SERVER_DEPLOYMENT_GUIDE.md
│  ├─ Step-by-step setup instructions
│  ├─ Nginx configuration details
│  ├─ SSL certificate setup
│  ├─ Troubleshooting guide
│  └─ Monitoring & maintenance
│
├─ BACKEND_SETUP_GUIDE.md
│  ├─ Local development backend
│  ├─ Environment file setup
│  ├─ API configuration
│  └─ Endpoint reference
│
├─ DEPLOYMENT_SUMMARY.md
│  ├─ Configuration overview
│  ├─ Port mapping
│  ├─ Architecture diagram
│  └─ Common operations
│
├─ ARCHITECTURE.md
│  ├─ System architecture
│  ├─ Component details
│  ├─ Data flow
│  └─ Security features
│
└─ DEPLOYMENT_CHECKLIST.md
   ├─ Pre-deployment checks
   ├─ Deployment steps
   ├─ Verification tests
   ├─ Security verification
   └─ Post-deployment tasks
```

---

## ✨ Key Features

### Automatic Environment Detection
```javascript
// Automatically selects correct backend URL
if (development) → http://localhost:8080/api/v1
if (production) → https://plp-api.moeys.gov.kh/api/v1
```

### One-Command Deployment
```bash
bash deploy-to-server.sh
# Handles everything from code pull to container start
```

### Port Configuration
```
Users (Port 80/443)
  ↓
Nginx Reverse Proxy (Port 80/443)
  ↓
Docker Container (Port 3001)
  ↓
React SPA
  ↓
Backend API (HTTPS)
```

### SSL/HTTPS Ready
- Let's Encrypt integration
- HTTP → HTTPS redirect
- Security headers
- Auto-renewal setup

### Health Checks
- Docker container health check
- Application health endpoint
- Nginx monitoring

---

## 🔧 Common Commands

### Deploy
```bash
bash deploy-to-server.sh
```

### View Logs
```bash
docker compose logs -f
docker compose -f /opt/plp-school-portal/docker-compose.yml logs -f
```

### Restart Container
```bash
docker compose restart
docker compose -f /opt/plp-school-portal/docker-compose.yml restart
```

### Check Status
```bash
docker compose ps
sudo systemctl status nginx
```

### Test Connectivity
```bash
curl http://localhost:3001/health
curl https://plp-sms.moeys.gov.kh
```

### View Nginx Config
```bash
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/plp-sms
```

### Renew SSL Certificate
```bash
sudo certbot renew
sudo certbot certificates
```

---

## 🐛 Troubleshooting Quick Links

### Application Not Loading
- Check Docker: `docker ps`
- Check Nginx: `sudo systemctl status nginx`
- View logs: `docker compose logs -f`
- See: `SERVER_DEPLOYMENT_GUIDE.md` → Troubleshooting

### Port Conflicts
- Port 3001: `lsof -i :3001`
- Port 80: `sudo lsof -i :80`
- See: `SERVER_DEPLOYMENT_GUIDE.md` → Port Issues

### Certificate Errors
- Check cert: `sudo certbot certificates`
- Renew cert: `sudo certbot renew`
- See: `SERVER_DEPLOYMENT_GUIDE.md` → SSL Issues

### Backend Not Responding
- Check API: `curl https://plp-api.moeys.gov.kh/api/v1/health`
- Check network: `ping plp-api.moeys.gov.kh`
- See: `BACKEND_SETUP_GUIDE.md`

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│         Internet (Users)            │
│    https://plp-sms.moeys.gov.kh     │
└──────────────┬──────────────────────┘
               │
               ▼ (Port 80/443)
    ┌──────────────────────────┐
    │  Nginx Reverse Proxy     │
    │  (SSL/TLS Termination)   │
    └──────────────┬───────────┘
                   │
                   ▼ (Port 3001)
        ┌──────────────────────┐
        │  Docker Container    │
        │  React SPA + Nginx   │
        │  (Port 3001)         │
        └──────────────┬───────┘
                       │
                       ▼ (HTTPS API Calls)
            ┌──────────────────────────┐
            │  Backend API             │
            │  plp-api.moeys.gov.kh    │
            │  /api/v1                 │
            └──────────────────────────┘
```

**Flow:**
1. User accesses domain via HTTPS
2. Nginx reverse proxy handles SSL
3. Request forwarded to Docker on 3001
4. React app served from Docker
5. App makes API calls to backend
6. Data displayed to user

---

## 📋 Deployment Steps Summary

### Pre-Deployment (Local)
1. Push code to main branch
2. Verify .env.production exists
3. Check SSH access to server

### Deployment (Local)
```bash
bash deploy-to-server.sh
```

### Post-Deployment (Server SSH)
```bash
sudo cp /opt/plp-school-portal/nginx-reverse-proxy.conf /etc/nginx/sites-available/plp-sms
sudo ln -s /etc/nginx/sites-available/plp-sms /etc/nginx/sites-enabled/plp-sms
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh
```

### Verification
```bash
curl https://plp-sms.moeys.gov.kh
```

---

## 🔒 Security Features

✅ HTTPS/TLS encryption
✅ HTTP → HTTPS redirect
✅ Security headers included
✅ JWT authentication
✅ CORS enforcement
✅ Docker isolation
✅ Port access control

---

## 📞 Support & Resources

**Quick Start:** `QUICK_START.md`
**Detailed Guide:** `SERVER_DEPLOYMENT_GUIDE.md`
**Troubleshooting:** `SERVER_DEPLOYMENT_GUIDE.md` → Troubleshooting
**Architecture:** `ARCHITECTURE.md`
**Backend Setup:** `BACKEND_SETUP_GUIDE.md`
**Checklist:** `DEPLOYMENT_CHECKLIST.md`

---

## 🎯 Next Steps

1. **First Time Setup:**
   - Run `bash deploy-to-server.sh`
   - SSH to server and configure Nginx
   - Setup SSL certificate
   - Test via domain

2. **Local Development:**
   - Run local backend on port 8080
   - Run `npm run dev`
   - Frontend connects automatically

3. **Production Updates:**
   - Push code to main branch
   - Run `bash deploy-to-server.sh`
   - Verify via domain

---

## ✅ Checklist Before Going Live

- [ ] Code pushed to main branch
- [ ] Docker container running on port 3001
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] HTTPS working (port 443)
- [ ] Application accessible via domain
- [ ] Login functionality working
- [ ] API calls successful
- [ ] No console errors
- [ ] Logs look clean

---

## 📝 Summary

Your application is fully configured for:
- ✅ Local development with port 8080 backend
- ✅ Production deployment with subdomain
- ✅ Docker containerization (port 3001)
- ✅ Nginx reverse proxy (port 80/443)
- ✅ SSL/HTTPS ready
- ✅ Automated deployment script
- ✅ Comprehensive documentation

**Domain:** https://plp-sms.moeys.gov.kh
**Backend:** https://plp-api.moeys.gov.kh/api/v1
**Docker Port:** 3001
**Public Port:** 80/443

---

**Last Updated:** November 2, 2024
**Status:** ✅ Ready for Production Deployment
