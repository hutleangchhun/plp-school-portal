# Deployment Setup Guide

This document explains how to set up the CI/CD pipeline for automated deployment to your physical server.

## Prerequisites

### On Your Physical Server
- Docker and Docker Compose installed
- SSH access configured
- Git installed
- A user account with sudo privileges (optional, recommended)

### On GitHub
- Access to repository settings
- Admin permissions to add secrets

## Setup Instructions

### Step 1: Prepare Your Physical Server

1. **Create deployment directory:**
   ```bash
   sudo mkdir -p /opt/frontend
   sudo chown $USER:$USER /opt/frontend
   cd /opt/frontend
   ```

2. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/teacher-portal.git .
   ```

3. **Ensure deploy.sh is executable:**
   ```bash
   chmod +x deploy.sh
   ```

4. **Test Docker setup:**
   ```bash
   docker compose build
   docker compose up -d
   # Check if running
   docker compose ps
   # View logs
   docker compose logs -f
   ```

### Step 2: Generate SSH Key for GitHub Actions

1. **On your physical server, generate an SSH key:**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "github-actions-deploy"
   ```

2. **Add the public key to authorized_keys:**
   ```bash
   cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **Get the private key content:**
   ```bash
   cat ~/.ssh/github_deploy
   ```
   (Copy the entire output, including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines)

### Step 3: Configure GitHub Secrets

1. **Go to your GitHub repository**
2. **Navigate to Settings → Secrets and variables → Actions**
3. **Add the following secrets:**

   - **SERVER_SSH_KEY**
     - Value: Paste the entire private key from Step 2

   - **SERVER_USER**
     - Value: Your username on the physical server (e.g., `raizo`)

   - **SERVER_IP**
     - Value: Your server's IP address or hostname (e.g., `192.168.1.100` or `your-server.com`)

### Step 4: Test the Workflow

1. **Trigger a manual deployment:**
   - Go to Actions tab in GitHub
   - Select "Deploy Frontend to Physical Server" workflow
   - Click "Run workflow"
   - Select `main` branch
   - Click "Run workflow"

2. **Monitor the deployment:**
   - Watch the job execution in real-time
   - Check logs for any errors

3. **Verify on your server:**
   ```bash
   docker compose ps
   docker compose logs -f
   ```

### Step 5: Automatic Deployments

Once everything is working:
- Any push to the `main` branch will automatically trigger deployment
- The workflow will:
  1. SSH into your server
  2. Navigate to `/opt/frontend`
  3. Run `deploy.sh` which:
     - Fetches latest code from GitHub
     - Builds the Docker image
     - Restarts the container with the new build

## File Structure

```
teacher-portal/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow
├── Dockerfile                  # Multi-stage build for production
├── docker-compose.yml          # Docker Compose configuration
├── nginx.conf                  # Nginx web server configuration
├── deploy.sh                   # Deployment script (runs on server)
└── ... (other project files)
```

## Configuration Files Explained

### deploy.yml (GitHub Actions Workflow)
- Triggered on push to `main` branch or manual dispatch
- Sets up SSH connection using the private key
- Executes `deploy.sh` on the remote server

### deploy.sh (Deployment Script)
- Pulls latest code from GitHub
- Rebuilds Docker image
- Restarts Docker container

### Dockerfile (Docker Build Configuration)
- **Stage 1 (Builder):** Builds the React application
- **Stage 2 (Production):** Uses Nginx Alpine image with the built app
- Includes health check and proper signal handling

### docker-compose.yml (Docker Compose)
- Defines the frontend service
- Port mapping (80:80)
- Health checks
- Restart policy

### nginx.conf (Web Server Configuration)
- Gzip compression for better performance
- Static asset caching (1 year expiry)
- SPA routing (all routes serve index.html)
- Security headers and configuration
- Health check endpoint at `/health`

## Troubleshooting

### SSH Connection Issues
```bash
# Test SSH connection
ssh -i ~/.ssh/github_deploy YOUR_USER@YOUR_SERVER_IP

# Check SSH permissions
ls -la ~/.ssh/
# Should be: drwx------ (700) for .ssh and -rw------- (600) for authorized_keys
```

### Docker Issues
```bash
# View Docker logs
docker compose logs -f

# Rebuild image
docker compose build --no-cache

# Stop and restart
docker compose down
docker compose up -d

# Check container status
docker compose ps
```

### GitHub Actions Issues
- Check the Actions tab for detailed logs
- Verify secrets are correctly set
- Ensure the SSH key format is correct (including BEGIN/END lines)

### Nginx Configuration Issues
```bash
# Test Nginx config inside container
docker compose exec frontend nginx -t

# View Nginx logs
docker compose logs frontend
```

## Security Best Practices

1. **SSH Key Management:**
   - Use ed25519 keys for better security
   - Never share the private key
   - Rotate keys periodically

2. **Server Setup:**
   - Use a dedicated deployment user (optional)
   - Restrict SSH access to GitHub Actions IPs if possible
   - Keep Docker and system updated

3. **Repository:**
   - Keep secrets in GitHub, not in code
   - Use branch protection on `main`
   - Require pull request reviews before merge

## Monitoring

### View Application Logs
```bash
docker compose logs -f
```

### Check Health Status
```bash
curl http://YOUR_SERVER_IP/health
# Should return: "healthy"
```

### Monitor Server Resources
```bash
docker stats
```

## Rollback (If Needed)

```bash
cd /opt/frontend

# View git history
git log --oneline

# Revert to previous version
git reset --hard COMMIT_HASH

# Rebuild and restart
docker compose build
docker compose up -d
```

## Next Steps

1. Test the entire pipeline end-to-end
2. Set up monitoring/alerting for the deployment
3. Consider adding email notifications on deployment failure
4. Document any custom configurations specific to your setup

For questions or issues, refer to:
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nginx Documentation](https://nginx.org/en/docs/)
