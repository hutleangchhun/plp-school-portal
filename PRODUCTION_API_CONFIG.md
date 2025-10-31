# API Configuration Summary

## ✅ Configuration Complete

The PLP School Portal uses the production API for both local development and production deployment.

### API Details

**Base URL:** `https://plp-api.moeys.gov.kh/api/v1/`

**Static Assets URL:** `https://plp-api.moeys.gov.kh`

**Environment:** All (Development & Production)

---

## Changes Made

### 1. API Configuration File
**File:** `src/utils/api/config.js`

- ✅ Updated `getApiBaseUrl()` to use production URL for all environments
- ✅ Updated `getStaticAssetBaseUrl()` to use production URL
- ✅ Updated `getBestApiUrl()` to use production URL
- ✅ Removed old development server references (`http://157.10.73.52:8085`)
- ✅ Set `enableHttpFallback: false` (HTTPS only)

### 2. Environment Files

**File:** `.env.example`
- ✅ Updated with production API URL only
- ✅ Removed old development server references

**File:** `.env.production`
- ✅ Updated to use production API for all environments
- ✅ Set `VITE_API_URL=https://plp-api.moeys.gov.kh/api/v1`
- ✅ Set `VITE_STATIC_BASE_URL=https://plp-api.moeys.gov.kh`

### 3. Deployment Documentation
**File:** `DEPLOYMENT.md`
- ✅ Added comprehensive deployment instructions
- ✅ Documented environment variables
- ✅ Added troubleshooting section

---

## How It Works

### All Environments
Both development and production modes use the same API:

**Development Mode** (`npm run dev`):
- Uses: `https://plp-api.moeys.gov.kh/api/v1`
- Same as production for consistency

**Production Mode** (`npm run build`):
- Uses: `https://plp-api.moeys.gov.kh/api/v1`
- No environment variables needed
- Can override with `.env` or hosting platform env vars

---

## Deployment Checklist

- [x] API configuration updated
- [x] Environment files created
- [x] Build tested successfully
- [x] Documentation updated
- [ ] Deploy to hosting platform
- [ ] Verify API connectivity in production
- [ ] Test login and main features

---

## Quick Deployment Commands

### Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
```bash
vercel --prod
```

---

## Environment Variables (Optional)

If deploying to Vercel, Netlify, or other platforms, you can optionally set:

```bash
VITE_API_URL=https://plp-api.moeys.gov.kh/api/v1
VITE_STATIC_BASE_URL=https://plp-api.moeys.gov.kh
VITE_PREFER_HTTPS=true
NODE_ENV=production
```

**Note:** These are optional as the application uses these values by default in production mode.

---

## Verification

### Check Configuration in Browser

After deployment:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Login or perform any action
4. Check API requests - they should go to: `https://plp-api.moeys.gov.kh/api/v1/*`

### Check in Console

```javascript
// In browser console, you can check:
console.log('API URL:', import.meta.env.VITE_API_URL);
```

---

## Important Notes

1. **No proxy needed** - Direct API calls to `https://plp-api.moeys.gov.kh`
2. **HTTPS required** - Production API only accepts HTTPS
3. **CORS must be enabled** - API must allow requests from your frontend domain
4. **Build before deploy** - Always run `npm run build` to verify

---

## Support

For issues or questions:
- Check `DEPLOYMENT.md` for detailed instructions
- Review `src/utils/api/config.js` for configuration details
- Check browser console and network tab for errors

---

## Related Files

- `src/utils/api/config.js` - Main API configuration
- `.env.example` - Environment template
- `.env.production` - Production environment
- `DEPLOYMENT.md` - Full deployment guide
