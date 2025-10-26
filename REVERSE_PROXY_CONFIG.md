# Reverse Proxy Configuration for MOEYS IT

## Summary
The Teacher Portal application is now hosted on your internal server and needs the reverse proxy to be configured to route traffic properly.

## Current Status
- ✅ Application is running and fully functional
- ✅ Server IP: `192.168.155.122`
- ✅ Application Port: `80` (HTTP)
- ✅ Domain: `plp-sms.moeys.gov.kh`
- ✅ Reverse Proxy IP: `167.179.43.14`

## What Needs to Be Done

### Configure Reverse Proxy at 167.179.43.14

The reverse proxy at `167.179.43.14` needs to be configured to forward traffic to the application server:

**Configuration Details:**
```
Domain: plp-sms.moeys.gov.kh
Forward to: 192.168.155.122:80
Protocol: HTTP
```

**Nginx Configuration Example:**
```nginx
server {
    listen 80;
    server_name plp-sms.moeys.gov.kh;

    location / {
        proxy_pass http://192.168.155.122:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Testing

After configuring the reverse proxy, test with:

```bash
curl -I http://plp-sms.moeys.gov.kh
curl http://plp-sms.moeys.gov.kh
```

Expected response: HTTP 200 OK with HTML content

## Current Access Points

### ✅ Working - Direct Server Access (via VPN)
```
http://192.168.155.122
```
Users on the internal network can access the application directly using the server IP.

### ⏳ Pending - Domain Access (via Reverse Proxy)
```
http://plp-sms.moeys.gov.kh
```
Requires reverse proxy configuration at `167.179.43.14`

## Server Details

- **Server Hostname**: plp-server
- **Server IP**: 192.168.155.122
- **Operating System**: Ubuntu 22.04
- **Web Server**: Nginx 1.18.0
- **Application**: React Teacher Portal (Docker container on port 3001)
- **SSH User**: admin_moeys

## Application Health

The application is currently:
- ✅ Running and operational
- ✅ Serving requests successfully
- ✅ Processing API calls correctly
- ✅ Accessible to authorized users

## Support

For questions or issues with the reverse proxy configuration, contact the system administrator at `admin_moeys@192.168.155.122`

---

**Document Date**: October 26, 2025
**Last Updated**: 2025-10-26
**Status**: Awaiting Reverse Proxy Configuration

