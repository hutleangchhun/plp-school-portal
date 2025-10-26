# How to Run the Automated Server Setup

## ⚡ Quick Start (5 Minutes)

### On Your Local Machine:

1. **Ensure you have the latest code:**
   ```bash
   git pull origin main
   ```

2. **Copy setup script to your server via SCP:**
   ```bash
   scp setup-server.sh admin_moeys@192.168.155.122:~/setup-server.sh
   ```

   Or if you prefer SSH with key (more secure):
   ```bash
   scp -i ~/.ssh/your_key setup-server.sh admin_moeys@192.168.155.122:~/setup-server.sh
   ```

### On Your Server (via SSH):

```bash
# Connect to server
ssh admin_moeys@192.168.155.122

# Navigate to home directory
cd ~

# Run the setup script with sudo
sudo bash setup-server.sh
```

The script will take **10-15 minutes** to complete.

---

## 📋 Step-by-Step Guide

### Step 1: Prepare Your Local Machine

```bash
# Navigate to project directory
cd /path/to/teacher-portal

# Get latest code
git pull origin main

# Verify setup-server.sh exists
ls -la setup-server.sh
```

### Step 2: Transfer Script to Server

**Option A: Using SCP (Simple)**
```bash
scp setup-server.sh admin_moeys@192.168.155.122:~/
```

**Option B: Using SSH Key (More Secure)**
```bash
scp -i ~/.ssh/your_key setup-server.sh admin_moeys@192.168.155.122:~/
```

**Option C: Manual Download on Server**
```bash
# SSH into server first
ssh admin_moeys@192.168.155.122

# Download the script
# (Ask for the download link or copy from GitHub)
```

### Step 3: Connect to Your Server

```bash
# Using password
ssh admin_moeys@192.168.155.122
# Enter password: testing-123

# Using SSH key (recommended)
ssh -i ~/.ssh/your_key admin_moeys@192.168.155.122
```

### Step 4: Run the Setup Script

```bash
# Move to home directory
cd ~

# Verify script exists
ls -la setup-server.sh

# Run with sudo (required for system-level commands)
sudo bash setup-server.sh
```

### Step 5: Wait for Completion

The script will display progress:
```
ℹ️  Updating system packages...
✅ System updated

ℹ️  Checking Docker installation...
ℹ️  Installing Docker...
✅ Docker installed successfully

... (continues)

✅ SERVER SETUP COMPLETED SUCCESSFULLY
```

### Step 6: Follow Post-Setup Instructions

The script will display:
```
Next Steps:

  1. Clone your repository (if not done yet):
     cd /opt/frontend
     git clone <your-repo-url> .

  2. Configure GitHub Secrets:
     - SERVER_SSH_KEY (copy from: cat ~/.ssh/github_deploy)
     - SERVER_USER: admin_moeys
     - SERVER_IP: 192.168.155.122

  3. Test GitHub Actions:
     - Push to main branch or manually trigger workflow
```

---

## 🔄 Complete Workflow

### Part 1: Server Setup (Run on Server)

```bash
# 1. SSH to server
ssh admin_moeys@192.168.155.122

# 2. Run setup script
sudo bash setup-server.sh

# This will take 10-15 minutes and:
# ✅ Install Docker
# ✅ Install Docker Compose
# ✅ Install Certbot
# ✅ Get SSL certificate
# ✅ Build Docker image
# ✅ Start container
# ✅ Generate SSH key
```

### Part 2: Clone Repository (Run on Server)

After script completes:
```bash
# 1. Verify deployment directory exists
ls -la /opt/frontend

# 2. Clone your repository
cd /opt/frontend
git clone https://github.com/YOUR_USERNAME/teacher-portal.git .

# 3. Check if it cloned correctly
ls -la

# 4. Restart Docker with the new files
docker compose restart

# 5. View logs to make sure it's running
docker compose logs -f
```

### Part 3: Configure GitHub Actions (Run on Your Local Machine)

On GitHub:
1. Go to repository Settings → Secrets and variables → Actions
2. Copy the SSH key from server:
   ```bash
   ssh admin_moeys@192.168.155.122
   cat ~/.ssh/github_deploy
   # Copy the entire output (including BEGIN/END lines)
   ```
3. Add three secrets:
   - **SERVER_SSH_KEY** = (paste the private key from above)
   - **SERVER_USER** = admin_moeys
   - **SERVER_IP** = 192.168.155.122

### Part 4: Test Deployment (Run on Your Local Machine)

```bash
# Push to main branch
git push origin main

# Or manually trigger workflow:
# 1. Go to Actions tab on GitHub
# 2. Select "Deploy Frontend to Physical Server"
# 3. Click "Run workflow"
# 4. Watch the deployment happen

# Verify it worked
curl https://plp-sms.moeys.gov.kh
```

---

## 🆘 Troubleshooting During Setup

### If Script Fails

```bash
# Check what went wrong
sudo cat /var/log/syslog | tail -50

# Or run setup in verbose mode
sudo bash -x setup-server.sh
```

### If Port is In Use

```bash
# Find what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Kill the process
sudo kill -9 <PID>

# Then re-run setup
sudo bash setup-server.sh
```

### If Certificate Generation Fails

```bash
# Try manually
sudo certbot certonly --standalone \
  -d plp-sms.moeys.gov.kh \
  -d www.plp-sms.moeys.gov.kh \
  --email admin@moeys.gov.kh \
  --agree-tos

# Verify certificate exists
sudo certbot certificates
```

---

## ✅ Verification Checklist

After setup completes, verify everything:

### On Server:

```bash
# 1. Check Docker running
docker compose -f /opt/frontend/docker-compose.yml ps

# 2. Check logs
docker compose -f /opt/frontend/docker-compose.yml logs --tail 20

# 3. Check certificate
sudo certbot certificates

# 4. Check SSL auto-renewal
sudo systemctl status certbot.timer

# 5. Check SSH key exists
ls -la ~/.ssh/github_deploy
```

### On Local Machine:

```bash
# 1. Test HTTPS works
curl https://plp-sms.moeys.gov.kh -v

# 2. Test HTTP redirects to HTTPS
curl -I http://plp-sms.moeys.gov.kh

# 3. Check security headers
curl -I https://plp-sms.moeys.gov.kh | grep -i "strict\|content-type\|x-frame"

# 4. Test health endpoint
curl https://plp-sms.moeys.gov.kh/health
```

---

## 📊 What Gets Installed

| Component | Version | Purpose |
|-----------|---------|---------|
| Docker | Latest | Container runtime |
| Docker Compose | Latest | Container orchestration |
| Certbot | Latest | SSL certificate management |
| Node.js 18 | 18-alpine | Build React app |
| Nginx | Alpine | Web server |
| Ubuntu Updates | Latest | System security |

---

## 🕐 Timeline

| Task | Duration | Notes |
|------|----------|-------|
| System update | 2-3 min | Depends on internet speed |
| Docker install | 1-2 min | Download and install |
| Certbot install | 30 sec | Quick package install |
| SSL cert | 2-3 min | Let's Encrypt validation |
| Docker build | 3-5 min | Builds Node → Nginx image |
| Container start | 30 sec | Usually quick |
| Verification | 1 min | Tests and checks |
| **Total** | **10-15 min** | Approximate |

---

## 🔒 Security Notes

- ✅ Script runs with sudo (required for system commands)
- ✅ SSL certificates auto-renew
- ✅ SSH key generated for GitHub Actions
- ✅ Container runs with proper permissions
- ✅ No credentials hardcoded in script

---

## 📞 Need Help?

If something goes wrong:

1. **Check Script Output**: Look for ❌ errors
2. **Read Logs**: `docker compose logs -f`
3. **Review Guides**: See SETUP_SERVER_GUIDE.md
4. **Manual Setup**: Follow setup-server.sh line by line manually

---

## 🎉 After Everything Works

```bash
# Monitor your application
ssh admin_moeys@192.168.155.122
cd /opt/frontend
docker compose logs -f

# Visit your site
https://plp-sms.moeys.gov.kh

# Check it's secure
# Green padlock in browser ✅

# Future deployments
# Just push to main and GitHub Actions handles it!
```

---

**Ready? Run:** `sudo bash setup-server.sh`
