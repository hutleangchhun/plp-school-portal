# Deployment Quick Start Guide

## 🚀 5-Minute Setup

### On Your Physical Server:

```bash
# 1. Create deployment directory
sudo mkdir -p /opt/frontend
sudo chown $USER:$USER /opt/frontend
cd /opt/frontend

# 2. Clone repository
git clone https://github.com/YOUR_USERNAME/teacher-portal.git .

# 3. Make deploy script executable
chmod +x deploy.sh

# 4. Test Docker setup
docker compose build
docker compose up -d
docker compose logs -f

# 5. Generate SSH key for GitHub
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "github-actions-deploy"
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
```

### On GitHub:

1. Go to **Settings → Secrets and variables → Actions**
2. Add three secrets:
   - `SERVER_SSH_KEY` = contents of `~/.ssh/github_deploy` (entire file)
   - `SERVER_USER` = your username (e.g., `raizo`)
   - `SERVER_IP` = your server IP or hostname

### Test Deployment:

1. Go to **Actions** tab
2. Select **Deploy Frontend to Physical Server**
3. Click **Run workflow**
4. Watch it deploy!

## 📋 Files Overview

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | GitHub Actions automation |
| `deploy.sh` | Server-side deployment script |
| `Dockerfile` | Docker image builder |
| `docker-compose.yml` | Docker container configuration |
| `nginx.conf` | Web server setup |
| `DEPLOYMENT_SETUP.md` | Full detailed guide |

## 🔄 Deployment Flow

```
You push to main branch
         ↓
GitHub Actions triggers
         ↓
SSH into your server
         ↓
Run deploy.sh
         ↓
Git pull latest code
         ↓
Docker build image
         ↓
Docker restart container
         ↓
✅ New version live!
```

## 🐳 Common Docker Commands

```bash
# View logs
docker compose logs -f

# Check status
docker compose ps

# Stop container
docker compose down

# Start container
docker compose up -d

# Rebuild image
docker compose build --no-cache

# Restart container
docker compose restart
```

## ✅ Verify Everything Works

```bash
# Check container is running
docker compose ps

# Test web server
curl http://localhost

# Check health endpoint
curl http://localhost/health
# Should return: "healthy"
```

## 🔐 Security Notes

- Keep SSH private key safe, never commit it
- Use the exact key format from `ssh-keygen`
- Rotate SSH keys every 6 months
- Keep Docker and system updated

## 📞 Troubleshooting

**SSH Connection fails:**
```bash
ssh -i ~/.ssh/github_deploy $USER@$SERVER_IP
```

**Docker won't start:**
```bash
docker compose logs
docker compose build --no-cache
```

**Check GitHub Actions logs:**
- Go to Actions tab → See detailed error messages

## 📖 For More Information

See **DEPLOYMENT_SETUP.md** for:
- Detailed troubleshooting
- Advanced configuration
- Monitoring setup
- Rollback procedures

---

**You're done!** 🎉 Your CI/CD pipeline is ready. Push to main and watch it deploy automatically!
