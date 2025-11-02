# Deployment Checklist

## Pre-Deployment (Local Machine)

### Before Running Deploy Script
- [ ] Code committed and pushed to main branch
- [ ] .env.production file exists with correct backend URL
- [ ] SSH key configured for server access
- [ ] Git repository URL accessible

### Files to Verify
- [ ] `deploy-to-server.sh` - Deployment script exists and is executable
- [ ] `docker-compose.yml` - Updated with environment variables
- [ ] `nginx-reverse-proxy.conf` - Ready for server setup
- [ ] `Dockerfile` - Multi-stage build configured
- [ ] `package.json` - Build scripts configured

## Deployment Execution

### Step 1: Run Deployment Script
```bash
bash deploy-to-server.sh
```

✓ Script executes successfully
✓ Code pulled from GitHub
✓ Docker image built
✓ Container starts on port 3001
✓ Health check passes

### Step 2: Verify Container Running
```bash
ssh admin_moeys@192.168.155.122 'docker compose ps'
```

- [ ] Container status: "Up"
- [ ] Port: "3001:80"
- [ ] Health: "healthy"

## Server-Side Setup (SSH to Server)

### Step 3: Copy Nginx Configuration
```bash
sudo cp /opt/plp-school-portal/nginx-reverse-proxy.conf /etc/nginx/sites-available/plp-sms
```

- [ ] File copied successfully
- [ ] Permissions correct

### Step 4: Enable Nginx Site
```bash
sudo ln -s /etc/nginx/sites-available/plp-sms /etc/nginx/sites-enabled/plp-sms
sudo rm -f /etc/nginx/sites-enabled/default
```

- [ ] Symlink created
- [ ] Default site disabled

### Step 5: Test Nginx Configuration
```bash
sudo nginx -t
```

- [ ] Output: "test is successful"
- [ ] No errors or warnings

### Step 6: Restart Nginx
```bash
sudo systemctl restart nginx
```

- [ ] Nginx restarted successfully
- [ ] Service is active (running)

### Step 7: Setup SSL Certificate
```bash
sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh
```

- [ ] Certificate obtained successfully
- [ ] Paths updated in nginx config if needed
- [ ] Certificate valid for 90 days

### Step 8: Reload Nginx for SSL
```bash
sudo systemctl reload nginx
```

- [ ] Nginx reloaded with SSL config
- [ ] HTTPS port 443 now active

## Post-Deployment Verification

### Step 9: Test Local Connectivity
```bash
curl http://localhost:3001/health
```

- [ ] Response: "healthy"
- [ ] HTTP 200 status

### Step 10: Test Domain Connectivity (HTTPS)
```bash
curl https://plp-sms.moeys.gov.kh
```

- [ ] Returns HTML (React app)
- [ ] HTTP 200 status
- [ ] HTTPS working

### Step 11: Test Application Features
- [ ] Login page loads
- [ ] Can submit login form
- [ ] Redirects after authentication
- [ ] Dashboard loads
- [ ] API calls work
- [ ] Data displays correctly

### Step 12: Check Logs
```bash
docker compose -f /opt/plp-school-portal/docker-compose.yml logs --tail=50
sudo tail -f /var/log/nginx/plp-sms-error.log
sudo tail -f /var/log/nginx/plp-sms-access.log
```

- [ ] No critical errors
- [ ] Requests being logged
- [ ] Application running smoothly

## Security Verification

### SSL/TLS
- [ ] HTTPS enforced (HTTP → HTTPS redirect)
- [ ] SSL certificate valid
- [ ] No mixed content warnings
- [ ] Security headers present

### Application
- [ ] JWT tokens working
- [ ] Authentication required for protected routes
- [ ] CORS errors (if any) acceptable
- [ ] No sensitive data in logs

### Server
- [ ] Only ports 80/443 publicly exposed
- [ ] SSH key-based access configured
- [ ] Docker container isolated

## Monitoring Setup

### Enable Auto-Renewal for SSL
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

- [ ] Certbot timer enabled
- [ ] Auto-renewal scheduled

### Docker Health Checks
```bash
docker ps
```

- [ ] HEALTHCHECK status: "healthy"
- [ ] Container auto-restarting on failure

### Log Rotation (Optional)
- [ ] Nginx logs rotated
- [ ] Docker logs managed

## Performance Checks

### Response Times
- [ ] Home page loads < 2 seconds
- [ ] API responses < 1 second
- [ ] No timeout errors

### Resource Usage
```bash
docker stats
free -h
df -h
```

- [ ] CPU usage reasonable
- [ ] Memory usage < 80%
- [ ] Disk space available

## Backup & Recovery

### Create Backups
```bash
tar -czf plp-portal-backup-$(date +%Y%m%d).tar.gz /opt/plp-school-portal
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt
```

- [ ] Application backed up
- [ ] Certificates backed up
- [ ] Backups stored safely

## Post-Deployment Tasks

### Documentation
- [ ] Update deployment notes
- [ ] Document any custom configurations
- [ ] Create runbook for operations team

### Communication
- [ ] Notify stakeholders of deployment
- [ ] Provide access credentials (if new users)
- [ ] Share documentation links

### Monitoring
- [ ] Set up alerts (if available)
- [ ] Configure log aggregation (optional)
- [ ] Schedule health checks

## Rollback Plan (If Issues)

### If Deployment Fails
```bash
# Stop container
docker compose -f /opt/plp-school-portal/docker-compose.yml down

# Revert code
git reset --hard HEAD~1

# Rebuild and restart
docker compose build
docker compose up -d
```

- [ ] Rollback procedure documented
- [ ] Previous version available
- [ ] Recovery tested

## Final Checklist

### Before Going Live
- [ ] All deployment steps completed
- [ ] Application tested and verified
- [ ] SSL/HTTPS working
- [ ] Logs clean (no errors)
- [ ] Backups created
- [ ] Monitoring enabled
- [ ] Team trained on deployment
- [ ] Documentation updated

### Status Summary
- [ ] **Deployment**: COMPLETE
- [ ] **Testing**: PASSED
- [ ] **Security**: VERIFIED
- [ ] **Monitoring**: ACTIVE
- [ ] **Backups**: CREATED
- [ ] **Documentation**: UPDATED

---

## Quick Reference Commands

### View Application Status
```bash
docker compose -f /opt/plp-school-portal/docker-compose.yml ps
```

### View Logs
```bash
docker compose -f /opt/plp-school-portal/docker-compose.yml logs -f
```

### Restart Application
```bash
docker compose -f /opt/plp-school-portal/docker-compose.yml restart
```

### Check Nginx
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Check SSL Certificate
```bash
sudo certbot certificates
```

### Test Connectivity
```bash
curl -I https://plp-sms.moeys.gov.kh
```

---

## Deployment Date & Notes

**Deployment Date:** _______________
**Deployed By:** _______________
**Version:** _______________
**Notes:** 
```


```

---

## Support Contacts

**System Administrator:** _______________
**DevOps Contact:** _______________
**Emergency Contact:** _______________

---

## Additional Resources

- Detailed Guide: `SERVER_DEPLOYMENT_GUIDE.md`
- Quick Start: `QUICK_START.md`
- Architecture: `ARCHITECTURE.md`
- Backend Setup: `BACKEND_SETUP_GUIDE.md`
- Summary: `DEPLOYMENT_SUMMARY.md`

---

**Remember:** Always test in staging before production deployment!
