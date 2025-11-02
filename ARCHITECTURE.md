# System Architecture

## Overall Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         INTERNET (Users)                         │
└────────────────────────────────────┬─────────────────────────────┘
                                      │
                                      │ Browser Request
                                      │ https://plp-sms.moeys.gov.kh
                                      │
                    ┌─────────────────▼──────────────────┐
                    │    DNS Resolution                  │
                    │ plp-sms.moeys.gov.kh → IP:port 80 │
                    └─────────────────┬──────────────────┘
                                      │
                                      │ Port 80/443 (HTTP/HTTPS)
                                      │
    ┌─────────────────────────────────▼──────────────────────────────┐
    │                                                                  │
    │  ┌──────────────────────────────────────────────────────────┐  │
    │  │          SERVER: 192.168.155.122                         │  │
    │  │                                                           │  │
    │  │  ┌────────────────────────────────────────────────────┐  │  │
    │  │  │  Nginx Reverse Proxy                               │  │  │
    │  │  │  ├─ Listen: Port 80 (HTTP)                         │  │  │
    │  │  │  ├─ Listen: Port 443 (HTTPS/SSL)                  │  │  │
    │  │  │  ├─ Server Name: plp-sms.moeys.gov.kh             │  │  │
    │  │  │  ├─ SSL Certificate: Let's Encrypt                │  │  │
    │  │  │  ├─ Redirect: HTTP → HTTPS                        │  │  │
    │  │  │  └─ Proxy Pass: http://127.0.0.1:3001            │  │  │
    │  │  └──────────────────┬─────────────────────────────────┘  │  │
    │  │                     │ Port 3001 (HTTP)                    │  │
    │  │                     │                                     │  │
    │  │  ┌──────────────────▼─────────────────────────────────┐  │  │
    │  │  │ Docker Container: teacher-portal-frontend          │  │  │
    │  │  │                                                    │  │  │
    │  │  │ ┌──────────────────────────────────────────────┐  │  │  │
    │  │  │ │ Nginx Inside Container (Port 80)             │  │  │  │
    │  │  │ │ - Serves React built application             │  │  │  │
    │  │  │ │ - SPA routing (index.html fallback)          │  │  │  │
    │  │  │ │ - Gzip compression enabled                   │  │  │  │
    │  │  │ │ - Static asset caching (1 year)              │  │  │  │
    │  │  │ │ - Health check endpoint (/health)            │  │  │  │
    │  │  │ └──────────────────────────────────────────────┘  │  │  │
    │  │  │                     │                               │  │  │
    │  │  │ ┌──────────────────▼─────────────────────────────┐  │  │  │
    │  │  │ │ React Application (Built SPA)                  │  │  │  │
    │  │  │ │ - index.html                                   │  │  │  │
    │  │  │ │ - JavaScript bundles                           │  │  │  │
    │  │  │ │ - CSS stylesheets                              │  │  │  │
    │  │  │ │ - Static assets                                │  │  │  │
    │  │  │ └──────────────────┬─────────────────────────────┘  │  │  │
    │  │  │                    │                                 │  │  │
    │  │  └────────────────────┼─────────────────────────────────┘  │  │
    │  │                       │                                    │  │
    │  │                       │ API Calls (HTTPS)                 │  │
    │  └───────────────────────┼────────────────────────────────────┘  │
    │                          │                                      │
    └──────────────────────────┼──────────────────────────────────────┘
                               │
                               │ HTTPS Egress
                               │
                    ┌──────────▼─────────────────┐
                    │   Backend API Server       │
                    │ plp-api.moeys.gov.kh       │
                    │ https://.../api/v1         │
                    │                            │
                    │ - Authentication           │
                    │ - Data Management          │
                    │ - Business Logic           │
                    │ - Database Access          │
                    └────────────────────────────┘
```

## Component Overview

### Nginx Reverse Proxy (Host)
- Accepts HTTP/HTTPS on ports 80/443
- Forwards traffic to Docker on port 3001
- Handles SSL/TLS termination
- Adds security headers

### Docker Container
- Runs on port 3001
- Contains React SPA + Nginx
- Auto-restart on failure
- Health checks enabled

### React Application
- Single Page Application (SPA)
- Client-side routing
- API calls via Axios
- JWT authentication

### Backend API
- External service
- HTTPS endpoint
- All business logic

## Port Configuration

| Component | Port | Protocol |
|-----------|------|----------|
| Public (Users) | 80/443 | HTTP/HTTPS |
| Nginx Reverse Proxy | 80/443 | HTTP/HTTPS |
| Docker Container | 3001 | HTTP |
| Nginx (inside Docker) | 80 | HTTP |
| Backend API | 443 | HTTPS |

## Data Flow

1. User accesses `https://plp-sms.moeys.gov.kh`
2. DNS resolves to server IP on port 80/443
3. Nginx reverse proxy receives request
4. SSL/TLS decryption
5. Request forwarded to `http://localhost:3001`
6. Docker Nginx serves React files
7. React makes API calls via Axios
8. Requests go to `https://plp-api.moeys.gov.kh/api/v1`
9. Response returned to client

This architecture ensures security, scalability, and maintainability.
