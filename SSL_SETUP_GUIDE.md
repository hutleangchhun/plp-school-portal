# SSL/TLS Setup Guide for plp-sms.moeys.gov.kh

## Overview

This guide explains how to set up SSL certificates for your domain using Let's Encrypt and Certbot. The nginx configuration is already set up to use HTTPS.

## Prerequisites

- Domain `plp-sms.moeys.gov.kh` pointing to your server IP
- Server with root/sudo access
- Docker and Docker Compose installed
- Port 80 and 443 accessible from the internet

## Step 1: Install Certbot on Your Server

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Certbot and Nginx plugin
sudo apt install certbot python3-certbot-nginx -y
```

## Step 2: Obtain SSL Certificate

### Option A: Using Standalone (Recommended for Docker)

```bash
# Stop Docker container temporarily
docker compose down

# Get certificate with standalone mode
sudo certbot certonly --standalone \
  -d plp-sms.moeys.gov.kh \
  -d www.plp-sms.moeys.gov.kh \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Restart Docker
docker compose up -d
```

### Option B: Using Nginx Plugin (If Nginx is running directly)

```bash
sudo certbot certonly --nginx \
  -d plp-sms.moeys.gov.kh \
  -d www.plp-sms.moeys.gov.kh \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

### Option C: Using DNS Challenge (For any situation)

```bash
sudo certbot certonly --manual \
  --preferred-challenges dns \
  -d plp-sms.moeys.gov.kh \
  -d www.plp-sms.moeys.gov.kh \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

Then add DNS TXT record as instructed.

## Step 3: Verify Certificate Installation

```bash
# List your certificates
sudo certbot certificates

# Check certificate details
openssl x509 -in /etc/letsencrypt/live/plp-sms.moeys.gov.kh/fullchain.pem -text -noout
```

Should show:
```
Subject: CN = plp-sms.moeys.gov.kh
Subject Alternative Name: DNS:plp-sms.moeys.gov.kh, DNS:www.plp-sms.moeys.gov.kh
```

## Step 4: Set Up Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Enable automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check timer status
sudo systemctl status certbot.timer
```

## Step 5: Test Your Setup

```bash
# Rebuild Docker image to use new certificates
docker compose build

# Restart container
docker compose restart

# Test HTTPS
curl https://plp-sms.moeys.gov.kh -v

# Test HTTP redirect to HTTPS
curl -I http://plp-sms.moeys.gov.kh
# Should see: HTTP/1.1 301 Moved Permanently
# Location: https://plp-sms.moeys.gov.kh
```

## Step 6: SSL Configuration Verification

### Check SSL Rating
Visit: https://www.ssllabs.com/ssltest/analyze.html?d=plp-sms.moeys.gov.kh

### Verify Security Headers
```bash
curl -I https://plp-sms.moeys.gov.kh

# Should see headers like:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
```

## SSL Certificate Paths

The certificates are stored on your server at:
```
/etc/letsencrypt/live/plp-sms.moeys.gov.kh/
├── fullchain.pem      # Full certificate chain
├── privkey.pem        # Private key
├── cert.pem           # Certificate
└── chain.pem          # Certificate chain
```

Docker container mounts these as read-only volumes from the host.

## Certificate Renewal

### Automatic Renewal (Recommended)
- Certbot automatically renews certificates 30 days before expiration
- No action needed from you

### Manual Renewal
```bash
# Force renew
sudo certbot renew --force-renewal

# Restart Docker after renewal
docker compose restart
```

## Renewal with Docker Compose Hook

You can add a renewal hook to automatically restart Docker:

```bash
sudo certbot renew --deploy-hook "cd /opt/frontend && docker compose restart"
```

## Troubleshooting

### Certificate Not Found Error
```bash
# Check if certificate exists
sudo ls -la /etc/letsencrypt/live/plp-sms.moeys.gov.kh/

# If missing, re-run certbot
sudo certbot certonly --standalone -d plp-sms.moeys.gov.kh
```

### Port 80/443 Already in Use
```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service
sudo systemctl stop nginx  # if running
```

### DNS Not Resolving
```bash
# Test DNS resolution
nslookup plp-sms.moeys.gov.kh
dig plp-sms.moeys.gov.kh

# Check if DNS points to correct IP
# It should match your server's public IP
```

### Nginx Config Issues
```bash
# Test nginx config inside container
docker compose exec frontend nginx -t

# View logs
docker compose logs frontend

# Reload nginx
docker compose exec frontend nginx -s reload
```

## Certificate Files Structure

```
/etc/letsencrypt/
├── live/
│   └── plp-sms.moeys.gov.kh/
│       ├── fullchain.pem        ← Used in nginx.conf
│       ├── privkey.pem          ← Used in nginx.conf
│       ├── cert.pem
│       └── chain.pem
├── archive/
│   └── plp-sms.moeys.gov.kh/
│       ├── cert*.pem            ← Actual certificate files
│       ├── privkey*.pem         ← Actual private key files
│       └── chain*.pem
└── renewal/
    └── plp-sms.moeys.gov.kh.conf
```

## Advanced: Manual Certificate Management

### If Using Different Certificate Provider

1. Place your certificate files:
   ```bash
   sudo mkdir -p /etc/letsencrypt/live/plp-sms.moeys.gov.kh/
   sudo cp your-cert.pem /etc/letsencrypt/live/plp-sms.moeys.gov.kh/fullchain.pem
   sudo cp your-key.pem /etc/letsencrypt/live/plp-sms.moeys.gov.kh/privkey.pem
   sudo chmod 644 /etc/letsencrypt/live/plp-sms.moeys.gov.kh/fullchain.pem
   sudo chmod 600 /etc/letsencrypt/live/plp-sms.moeys.gov.kh/privkey.pem
   ```

2. Restart Docker:
   ```bash
   docker compose restart
   ```

## Nginx Configuration Already Supports

✅ HTTPS on port 443
✅ HTTP to HTTPS redirect
✅ TLS 1.2 and 1.3
✅ Strong cipher suites
✅ HTTP/2 support
✅ Security headers (HSTS, CSP, X-Frame-Options, etc.)
✅ Session caching
✅ Certificate chain validation

## Testing HTTPS Connection

```bash
# Basic HTTPS test
curl https://plp-sms.moeys.gov.kh

# Verbose HTTPS test (see certificate)
curl -v https://plp-sms.moeys.gov.kh

# Check certificate expiration
openssl s_client -connect plp-sms.moeys.gov.kh:443 -servername plp-sms.moeys.gov.kh | grep -A5 "notAfter"

# Check protocol and ciphers
openssl s_client -connect plp-sms.moeys.gov.kh:443 -servername plp-sms.moeys.gov.kh
```

## Quick Commands

```bash
# View all certificates
sudo certbot certificates

# View certificate expiration date
sudo certbot certificates | grep "Expiry Date"

# Renew all certificates now
sudo certbot renew --force-renewal

# Remove certificate
sudo certbot delete --cert-name plp-sms.moeys.gov.kh

# Check renewal status
sudo certbot renew --dry-run --verbose

# View renewal logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## Security Best Practices

1. **Backup Private Keys**
   ```bash
   sudo tar -czf ~/certs-backup.tar.gz /etc/letsencrypt/
   ```

2. **Monitor Certificate Expiration**
   ```bash
   sudo certbot renew --dry-run --verbose
   ```

3. **Keep System Updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Monitor Renewal Logs**
   ```bash
   sudo journalctl -u certbot.timer -f
   ```

## Getting Help

- Let's Encrypt Documentation: https://letsencrypt.org/docs/
- Certbot Documentation: https://certbot.eff.org/docs/
- Nginx SSL Documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html

---

**Certificate Status:** Ready to use
**Renewal:** Automatic with Certbot
**Expiration:** 90 days after issuance (auto-renewed at 30 days before)
