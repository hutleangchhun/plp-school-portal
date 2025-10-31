# PLP School Portal - Deployment Guide

## 🚀 API Configuration

**API URL:** `https://plp-api.moeys.gov.kh/api/v1/`

The application uses the production API for both local development and production deployment.

---

## ✅ Ready for Deployment

### Quick Deploy
```bash
# Build and lint check
npm run predeploy

# Deploy to Vercel
npm run deploy
```

### Vercel Dashboard Deployment
1. Go to [vercel.com](https://vercel.com)
2. Import your project
3. Framework: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy!

### Environment Variables (Optional)

**Default Configuration**
The application automatically uses `https://plp-api.moeys.gov.kh/api/v1/` by default.

**No environment variables are required for deployment.**

If you need to override the API URL, add these in Vercel Dashboard → Settings → Environment Variables:

```bash
VITE_API_URL=https://plp-api.moeys.gov.kh/api/v1
VITE_STATIC_BASE_URL=https://plp-api.moeys.gov.kh
VITE_PREFER_HTTPS=true
```

---

## 📋 Environment Files

- **`.env.production`** - Production API configuration
- **`.env.example`** - Template file
- **`.env`** - Your local configuration (git-ignored, optional)

All environments use `https://plp-api.moeys.gov.kh/api/v1/` by default.

---

## 🔧 Configuration Details

### Single API Configuration

The application uses the production API for all environments:

| Environment | API URL |
|------------|---------|
| Development (`npm run dev`) | `https://plp-api.moeys.gov.kh/api/v1` |
| Production (`npm run build`) | `https://plp-api.moeys.gov.kh/api/v1` |

Configuration file: `src/utils/api/config.js`

### API Endpoints

- **API Endpoints**: `https://plp-api.moeys.gov.kh/api/v1/*`
- **Static Assets**: `https://plp-api.moeys.gov.kh/*`

---

## ✅ Features Ready
- ✅ Production API configured (`https://plp-api.moeys.gov.kh/api/v1/`)
- ✅ Automatic environment detection
- ✅ HTTPS in production
- ✅ Fallback images
- ✅ Dynamic components
- ✅ Khmer localization
- ✅ ESLint fixed (0 errors)
- ✅ Production build working
- ✅ Reports page with 16 report types

---

## 🧪 Testing Production Build Locally

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

The preview will use production API settings.

---

## 🚨 Important Notes

1. **API CORS**: Ensure `https://plp-api.moeys.gov.kh` allows CORS from your frontend domain
2. **HTTPS Required**: Production API requires HTTPS
3. **Environment Variables**: No environment variables needed for default production setup
4. **Build Check**: Always run `npm run build` before deploying to catch errors

---

## 📞 Troubleshooting

### API Connection Issues

Check if API is accessible:
```bash
curl -I https://plp-api.moeys.gov.kh/api/v1/
```

### Build Fails

```bash
# Clean install
rm -rf node_modules dist
npm install
npm run build
```

### Wrong API URL

Check browser DevTools → Network tab to see which API URL requests are going to.