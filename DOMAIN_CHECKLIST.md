# Domain & SSL Setup Checklist

## Pre-Deployment Checklist

### DNS Configuration
- [ ] Domain `plp-sms.moeys.gov.kh` is registered
- [ ] DNS A record points to your server IP: `plp-sms.moeys.gov.kh → YOUR_SERVER_IP`
- [ ] DNS A record for www: `www.plp-sms.moeys.gov.kh → YOUR_SERVER_IP`
- [ ] DNS propagation confirmed: `nslookup plp-sms.moeys.gov.kh`

### Server Preparation
- [ ] Docker installed: `docker --version`
- [ ] Docker Compose installed: `docker compose --version`
- [ ] Port 80 available: `sudo lsof -i :80`
- [ ] Port 443 available: `sudo lsof -i :443`
- [ ] `/opt/frontend` directory created: `sudo mkdir -p /opt/frontend`
- [ ] Repository cloned: `cd /opt/frontend && git clone ...`

### SSL Certificate Setup (Let's Encrypt)
- [ ] Certbot installed: `sudo apt install certbot python3-certbot-nginx`
- [ ] Certificate obtained:
  ```bash
  sudo certbot certonly --standalone \
    -d plp-sms.moeys.gov.kh \
    -d www.plp-sms.moeys.gov.kh
  ```
- [ ] Certificate files exist:
  - [ ] `/etc/letsencrypt/live/plp-sms.moeys.gov.kh/fullchain.pem`
  - [ ] `/etc/letsencrypt/live/plp-sms.moeys.gov.kh/privkey.pem`
- [ ] Certificate verified: `sudo certbot certificates`

### Auto-Renewal Setup
- [ ] Certbot timer enabled: `sudo systemctl enable certbot.timer`
- [ ] Certbot timer started: `sudo systemctl start certbot.timer`
- [ ] Timer status checked: `sudo systemctl status certbot.timer`
- [ ] Dry-run test passed: `sudo certbot renew --dry-run`

### Docker Deployment
- [ ] Dockerfile exists and is correct
- [ ] docker-compose.yml configured for SSL (ports 80, 443)
- [ ] nginx.conf configured with domain and SSL paths
- [ ] Deploy script made executable: `chmod +x deploy.sh`
- [ ] GitHub Actions secrets configured:
  - [ ] `SERVER_SSH_KEY` (private key)
  - [ ] `SERVER_USER` (username)
  - [ ] `SERVER_IP` (server IP/hostname)

### Application Deployment
- [ ] Built Docker image: `docker compose build`
- [ ] Container started: `docker compose up -d`
- [ ] Container running: `docker compose ps`
- [ ] View logs: `docker compose logs -f`

### Testing & Verification

#### HTTP → HTTPS Redirect
```bash
curl -I http://plp-sms.moeys.gov.kh
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://plp-sms.moeys.gov.kh/
```
- [ ] HTTP redirect working

#### HTTPS Connection
```bash
curl https://plp-sms.moeys.gov.kh
# Should return 200 OK
```
- [ ] HTTPS connection working

#### SSL Certificate
```bash
openssl s_client -connect plp-sms.moeys.gov.kh:443 -servername plp-sms.moeys.gov.kh
# Check certificate details
```
- [ ] Certificate valid for domain
- [ ] Certificate chain complete
- [ ] Not expired or self-signed

#### Security Headers
```bash
curl -I https://plp-sms.moeys.gov.kh
```
- [ ] Contains `Strict-Transport-Security` header
- [ ] Contains `X-Content-Type-Options: nosniff`
- [ ] Contains `X-Frame-Options: SAMEORIGIN`
- [ ] Contains `X-XSS-Protection`

#### Website Functionality
- [ ] Home page loads: `https://plp-sms.moeys.gov.kh`
- [ ] Login page works: `https://plp-sms.moeys.gov.kh/login`
- [ ] Dashboard accessible: `https://plp-sms.moeys.gov.kh/dashboard`
- [ ] Static assets loaded (CSS, JS): Check browser console
- [ ] No mixed content warnings: Check browser security tab

#### Application Health
```bash
curl https://plp-sms.moeys.gov.kh/health
# Should return "healthy"
```
- [ ] Health check endpoint working

### SSL Rating
- [ ] Check SSL rating at: https://www.ssllabs.com/ssltest/analyze.html?d=plp-sms.moeys.gov.kh
- [ ] Target rating: **A+** (or minimum A)

### Monitoring & Maintenance

#### Logs Setup
- [ ] View app logs: `docker compose logs -f`
- [ ] View Nginx logs: Check Docker logs for any errors
- [ ] Monitor renewal: `sudo journalctl -u certbot.timer -f`

#### Certificate Monitoring
```bash
# Check when certificate expires
sudo certbot certificates
# Or
echo | openssl s_client -servername plp-sms.moeys.gov.kh -connect plp-sms.moeys.gov.kh:443 2>/dev/null | openssl x509 -noout -dates
```
- [ ] Certificate expiration tracked
- [ ] Renewal reminder set (optional)

#### Automated Renewal Verification
```bash
# Check if renewal is scheduled
sudo systemctl status certbot.timer
# Verify renewal logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```
- [ ] Automatic renewal configured
- [ ] Renewal logs checked

### Post-Deployment

#### GitHub Actions Testing
- [ ] Workflow file exists: `.github/workflows/deploy.yml`
- [ ] Secrets configured in GitHub
- [ ] Manual workflow trigger tested
- [ ] Automatic deployment on push to main tested

#### Backup & Recovery
- [ ] Backup certificate and key:
  ```bash
  sudo tar -czf ~/certs-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt/
  ```
- [ ] Backup location secure and accessible
- [ ] Recovery procedure documented

#### Documentation
- [ ] SSL_SETUP_GUIDE.md reviewed
- [ ] DEPLOYMENT_SETUP.md reviewed
- [ ] DEPLOYMENT_QUICK_START.md bookmarked
- [ ] Troubleshooting section saved

## Quick Verification Script

Save as `verify-setup.sh`:

```bash
#!/bin/bash

echo "🔍 Verifying setup..."

echo -n "DNS Resolution: "
nslookup plp-sms.moeys.gov.kh 2>&1 | grep -q "Address" && echo "✓" || echo "✗"

echo -n "Port 80 Accessible: "
curl -s -o /dev/null -w "%{http_code}\n" http://plp-sms.moeys.gov.kh | grep -q "301\|200" && echo "✓" || echo "✗"

echo -n "HTTPS Working: "
curl -s -k https://plp-sms.moeys.gov.kh | grep -q "html" && echo "✓" || echo "✗"

echo -n "Certificate Valid: "
echo | openssl s_client -servername plp-sms.moeys.gov.kh -connect plp-sms.moeys.gov.kh:443 2>/dev/null | grep -q "Verify return code: 0" && echo "✓" || echo "✗"

echo -n "Docker Container Running: "
docker compose ps | grep -q "Up" && echo "✓" || echo "✗"

echo "✅ Verification complete!"
```

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| DNS not resolving | Check DNS provider settings, wait for propagation (up to 48h) |
| Certificate not found | Run: `sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh` |
| Port 80/443 in use | Run: `sudo lsof -i :80` and `sudo lsof -i :443` |
| HTTP redirect not working | Check nginx.conf, restart: `docker compose restart` |
| HTTPS cert error | Ensure certificate path is correct in nginx.conf |
| Auto-renewal not working | Check: `sudo systemctl status certbot.timer` |
| App not loading | Check: `docker compose logs -f` |

## Important Dates & Deadlines

- Certificate Issue Date: _____________
- Certificate Expiration: _____________
- Auto-Renewal Date (approx 30 days before): _____________
- Last Manual Check: _____________

## Contacts & References

- Let's Encrypt Status: https://letsencrypt.status.io/
- Certbot Docs: https://certbot.eff.org/
- Nginx Docs: https://nginx.org/en/docs/
- SSL Labs: https://www.ssllabs.com/

---

## Notes

```
[Add any custom notes or configuration details here]




```

## Sign-Off

- Setup completed by: ________________
- Date: ________________
- All tests passed: ☐ Yes ☐ No
- Ready for production: ☐ Yes ☐ No
