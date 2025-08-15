# Vercel Deployment Guide for BulkyLoad Frontend

## 🚀 **Deploy to Vercel**

### **Step 1: Connect GitHub Repository**
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository: `MotionSync-dev/BulkyLoad`
4. Vercel will auto-detect it's a React app

### **Step 2: Configure Project**
- **Framework Preset**: Vite (auto-detected)
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### **Step 3: Environment Variables**
Add these in Vercel's environment variables:

```bash
VITE_API_URL=https://bulkload-backend.onrender.com
VITE_APP_NAME=BulkyLoad
VITE_APP_VERSION=1.0.0
```

### **Step 4: Deploy**
Click "Deploy" and wait for build completion.

## 🌐 **Your Frontend URL**
After deployment, you'll get:
```
https://bulkload.vercel.app
```
(or similar custom domain)

## 🔗 **Update Backend CORS**
In your Render backend, update the CORS_ORIGIN:
```bash
CORS_ORIGIN=https://bulkload.vercel.app
```

## 📱 **Test the Complete Flow**
1. **Frontend**: `https://bulkload.vercel.app`
2. **Backend**: `https://bulkload-backend.onrender.com`
3. **Subscription**: Click subscribe → redirects to Gumroad
4. **Webhook**: Gumroad sends webhook to Render backend
5. **Database**: User subscription updated automatically

## 🔄 **Automatic Deployments**
- Every push to `main` branch triggers automatic deployment
- Preview deployments for pull requests
- Easy rollback to previous versions

## 📊 **Performance Features**
- Global CDN
- Automatic HTTPS
- Edge functions support
- Analytics and monitoring
