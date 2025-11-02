# Backend Configuration & Deployment Guide

This guide explains how to configure the PLP School Portal frontend to work with different backend environments.

## Quick Start

### For Local Development (Port 8080)

1. **Ensure your local backend is running on `http://localhost:8080`**

2. **The frontend is already configured for local development:**
   - `.env.development` file is set up with `http://localhost:8080/api/v1`
   - Run: `npm run dev`
   - Frontend will automatically use local backend on port 8080

### For Server Deployment (Production)

1. **Backend must be running at:** `https://plp-api.moeys.gov.kh/api/v1`

2. **Build for production:**
   ```bash
   npm run build
   ```

3. **Deploy using Docker:**
   ```bash
   docker compose build
   docker compose up -d
   ```

---

## Configuration Files

### `.env.development` (Local Development)
Used when running `npm run dev`

```env
VITE_API_URL=http://localhost:8080/api/v1
VITE_STATIC_BASE_URL=http://localhost:8080
VITE_PREFER_HTTPS=false
NODE_ENV=development
```

**When to use:** Local development with backend on port 8080

### `.env.production` (Server Deployment)
Used when running `npm run build` for production

```env
VITE_API_URL=https://plp-api.moeys.gov.kh/api/v1
VITE_STATIC_BASE_URL=https://plp-api.moeys.gov.kh
VITE_PREFER_HTTPS=true
NODE_ENV=production
```

**When to use:** Production deployment to server

---

## Environment-Based Configuration

The application automatically selects the correct backend URL based on the environment:

### Development Mode (`npm run dev`)
- Reads from `.env.development`
- Uses: `http://localhost:8080/api/v1`
- HTTP protocol (no HTTPS)
- Fallback disabled

### Production Build (`npm run build`)
- Reads from `.env.production`
- Uses: `https://plp-api.moeys.gov.kh/api/v1`
- HTTPS protocol only
- Fallback enabled

### How It Works

**File:** `src/utils/api/config.js`

```javascript
const getApiBaseUrl = () => {
  // 1. Check VITE_API_URL environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 2. Default based on build environment
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:8080/api/v1';
  }

  // 3. Production default
  return 'https://plp-api.moeys.gov.kh/api/v1';
};
```

Priority order:
1. **Environment variable** (`VITE_API_URL`) - highest priority
2. **Build mode default** (development or production)
3. **Hardcoded fallback** - lowest priority

---

## Switching Backends

### Switch to Local Backend

```bash
# The frontend automatically uses local backend in development mode
npm run dev

# Frontend will connect to: http://localhost:8080/api/v1
```

### Switch to Production Backend

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Frontend will connect to: https://plp-api.moeys.gov.kh/api/v1
```

### Custom Backend URL (If Needed)

Edit `.env.production` or `.env.development` and change:

```env
VITE_API_URL=https://your-custom-backend.com/api/v1
```

Then rebuild the application.

---

## Deployment Steps

### 1. Local Development Setup

```bash
# Install dependencies
npm install

# Start development server (connects to localhost:8080)
npm run dev
```

The application will be available at `http://localhost:3001` and will connect to your backend at `http://localhost:8080`.

### 2. Production Build

```bash
# Build the application
npm run build

# Output is in dist/ directory
```

The built application will use `https://plp-api.moeys.gov.kh/api/v1` as the backend URL.

### 3. Docker Deployment

```bash
# Build Docker image
docker compose build

# Start container
docker compose up -d

# View logs
docker compose logs -f

# Stop container
docker compose down
```

The Docker container will:
- Build the frontend with production settings
- Run Nginx on port 3001
- Use `https://plp-api.moeys.gov.kh/api/v1` as the backend

### 4. Server Deployment

```bash
# SSH into server
ssh admin_moeys@192.168.155.122

# Navigate to deployment directory
cd /opt/plp-school-portal

# Pull latest code
git fetch origin
git reset --hard origin/main

# Build and deploy
docker compose build
docker compose up -d

# Verify
docker compose ps
docker compose logs frontend
```

---

## Troubleshooting

### "Cannot connect to backend"

**Check 1:** Verify backend is running
```bash
# For local development
curl http://localhost:8080/api/v1/health

# For production
curl https://plp-api.moeys.gov.kh/api/v1/health
```

**Check 2:** Verify correct environment file is being used
- Development: `.env.development` should have `VITE_API_URL=http://localhost:8080/api/v1`
- Production: `.env.production` should have `VITE_API_URL=https://plp-api.moeys.gov.kh/api/v1`

**Check 3:** Check frontend logs
```bash
# Browser console (F12)
# Look for network requests and API errors

# Local development
npm run dev
# Watch console for errors

# Docker logs
docker compose logs -f frontend
```

**Check 4:** CORS Issues
If you see CORS errors in the browser console, the backend needs to allow requests from the frontend domain:
- Local: `http://localhost:3001`
- Server: `https://plp-sms.moeys.gov.kh` (or `http://192.168.155.122`)

Backend CORS configuration should include these origins.

### Port 3001 Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or let Vite use another port
npm run dev
# Vite will auto-select a free port
```

### Backend URL Not Updating After .env Change

When you change `.env.development` or `.env.production`:

**For development:**
- Stop `npm run dev` (Ctrl+C)
- Start it again: `npm run dev`

**For production:**
- Rebuild: `npm run build`
- Redeploy Docker: `docker compose up -d --build`

---

## API Endpoints Reference

All endpoints are defined in `src/utils/api/config.js` and use the base URL configured above.

Examples:
- Login: `{BASE_URL}/auth/login`
- User Profile: `{BASE_URL}/users/my-account`
- Schools: `{BASE_URL}/schools`
- Students: `{BASE_URL}/students`
- Classes: `{BASE_URL}/classes`
- Grades: `{BASE_URL}/grades`

Full endpoint list in `src/utils/api/config.js` lines 31-147.

---

## Key Files

| File | Purpose |
|------|---------|
| `.env.development` | Local development environment variables |
| `.env.production` | Production environment variables |
| `.env.example` | Template showing all available options |
| `src/utils/api/config.js` | API configuration and endpoint definitions |
| `src/utils/api/client.js` | Axios HTTP client setup |
| `vite.config.js` | Build and development server configuration |
| `Dockerfile` | Docker image configuration |
| `docker-compose.yml` | Docker container orchestration |

---

## Summary

- **Local Development:** Auto-connects to `http://localhost:8080` via `.env.development`
- **Server Deployment:** Auto-connects to `https://plp-api.moeys.gov.kh/api/v1` via `.env.production`
- **No manual switching needed:** The frontend automatically uses the correct backend based on the build environment
- **Easy to customize:** Edit the `.env` files to use any custom backend URL
