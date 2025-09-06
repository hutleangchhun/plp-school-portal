# Simple Deployment Guide

## ✅ Ready for Vercel Deployment

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
```
VITE_API_URL=https://157.10.73.52:8085/api/v1
VITE_PREFER_HTTPS=true
```

## Features Ready
- ✅ Fallback images
- ✅ Dynamic components  
- ✅ HTTPS handling
- ✅ Khmer localization
- ✅ ESLint fixed (0 errors)
- ✅ Production build working