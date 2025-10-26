# MOEYS IT - Reverse Proxy Configuration Request

**Date**: October 26, 2025
**Priority**: High
**Action Required**: Configure reverse proxy for Teacher Portal domain

---

## Summary

The Teacher Portal application has been successfully deployed to an internal server. We need the reverse proxy at `167.179.43.14` to be configured to forward traffic from the domain `plp-sms.moeys.gov.kh` to our application server.

---

## Current Status

- ✅ Application is deployed and running
- ✅ Internal users can access via: `http://192.168.155.122`
- ❌ External users getting 504 error via domain `plp-sms.moeys.gov.kh`
- ⏳ **Requires**: Reverse proxy configuration

---

## What We Need

Configure the reverse proxy at `167.179.43.14` to forward traffic as follows:

```
Request:  plp-sms.moeys.gov.kh:80
Forward:  192.168.155.122:80
```

---

## Nginx Configuration

Please add or update the following configuration on the reverse proxy:

```nginx
server {
    listen 80;
    server_name plp-sms.moeys.gov.kh www.plp-sms.moeys.gov.kh;

    location / {
        proxy_pass http://192.168.155.122:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## Alternative Configuration (If Using Apache/Other Web Server)

```apache
<VirtualHost *:80>
    ServerName plp-sms.moeys.gov.kh
    ServerAlias www.plp-sms.moeys.gov.kh

    ProxyPreserveHost On
    ProxyPass / http://192.168.155.122:80/
    ProxyPassReverse / http://192.168.155.122:80/

    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Real-IP "%{REMOTE_ADDR}s"
</VirtualHost>
```

---

## Testing After Configuration

After making the changes, please test with:

```bash
# Test from any machine
curl -v http://plp-sms.moeys.gov.kh

# Expected response: HTTP 200 OK with HTML content
```

---

## Server Details

| Item | Value |
|------|-------|
| **Application Server IP** | 192.168.155.122 |
| **Application Port** | 80 |
| **Domain** | plp-sms.moeys.gov.kh |
| **Protocol** | HTTP |
| **SSL** | Not required (handled by proxy) |
| **SSH User** | admin_moeys |

---

## Verification Checklist

Once configured, please verify:

- [ ] DNS resolves `plp-sms.moeys.gov.kh` to `167.179.43.14`
- [ ] Reverse proxy can reach `192.168.155.122:80`
- [ ] `curl http://plp-sms.moeys.gov.kh` returns HTTP 200
- [ ] Web page loads in browser
- [ ] API endpoints respond correctly

---

## Contact

If you have questions or need clarification:

- **Technical Contact**: admin_moeys@192.168.155.122
- **Server IP**: 192.168.155.122
- **SSH Access**: `ssh admin_moeys@192.168.155.122`

---

## Timeline

- **Request Date**: October 26, 2025
- **Urgency**: High (users waiting for domain access)
- **Expected Completion**: ASAP

---

## Additional Notes

1. The application server is running and operational
2. All ports (80, 3001, 22) are open on the firewall
3. The reverse proxy just needs to forward traffic
4. No SSL/HTTPS configuration needed at this stage
5. Application will handle all HTTP requests properly

---

**Thank you for your assistance!**

