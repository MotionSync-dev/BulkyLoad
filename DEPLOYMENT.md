# 🚀 BulkyLoad Deployment Guide

## 📋 Overview
This guide covers deploying BulkyLoad with a **monorepo structure**:
- **Frontend (React)** → Vercel
- **Backend (Express)** → Render

## 🎯 Why This Setup?

### ✅ **Vercel for Frontend:**
- Perfect SEO optimization
- Global CDN for fast loading
- Automatic HTTPS
- Built-in analytics
- Unlimited free deployments

### ✅ **Render for Backend:**
- Better for Node.js/Express APIs
- More generous free tier (750 hours/month)
- Easy database integration
- Automatic scaling

## 🛠️ Step 1: Prepare Backend (Render)

### 1.1 Create Render Account
- Go to [render.com](https://render.com)
- Sign up with GitHub

### 1.2 Deploy Backend
1. **Connect Repository:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Select the repository

2. **Configure Service:**
   ```
   Name: bulkload-backend
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Environment Variables:**
   ```
   PORT=3001
   MONGODB_URI=mongodb+srv://your-mongo-uri
   JWT_SECRET=your-super-secret-key
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment
   - Copy the URL (e.g., `https://bulkload-backend.onrender.com`)

## 🛠️ Step 2: Prepare Frontend (Vercel)

### 2.1 Create Vercel Account
- Go to [vercel.com](https://vercel.com)
- Sign up with GitHub

### 2.2 Deploy Frontend
1. **Import Project:**
   - Click "New Project"
   - Import your GitHub repo
   - Set root directory to `frontend`

2. **Configure Build:**
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   ```

3. **Environment Variables:**
   ```
   VITE_API_URL=https://bulkload-backend.onrender.com
   VITE_APP_NAME=BulkyLoad
   VITE_APP_DESCRIPTION=Bulk Image Downloader from URL Lists
   ```

4. **Deploy:**
   - Click "Deploy"
   - Wait for deployment
   - Get your URL (e.g., `https://bulkload.vercel.app`)

## 🔧 Step 3: Update CORS Configuration

### 3.1 Update Backend CORS
In `backend/server.js`, update the CORS origin:

```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
```

### 3.2 Update Frontend API Calls
The frontend now uses environment variables for API calls, so no changes needed.

## 🔄 Step 4: Update URLs

### 4.1 Update Vercel Configuration
In `frontend/vercel.json`, update the backend URL:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://bulkload-backend.onrender.com/api/$1"
    }
  ]
}
```

### 4.2 Update Environment Variables
- **Render Dashboard:** Update `CORS_ORIGIN` with your Vercel URL
- **Vercel Dashboard:** Update `VITE_API_URL` with your Render URL

## 🎯 Step 5: SEO Optimization

### 5.1 Add Meta Tags
Update `frontend/index.html`:

```html
<head>
  <title>BulkyLoad – Bulk Image Downloader from URL Lists</title>
  <meta name="description" content="Download multiple images quickly and securely with BulkyLoad. Perfect for designers, developers, and content creators.">
  <meta name="keywords" content="bulk image downloader, image download, multiple images, URL downloader">
  <meta property="og:title" content="BulkyLoad – Bulk Image Downloader">
  <meta property="og:description" content="Download multiple images quickly and securely">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://bulkload.vercel.app">
</head>
```

### 5.2 Add Sitemap
Create `frontend/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bulkload.vercel.app/</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bulkload.vercel.app/pricing</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## 🚀 Step 6: Final Deployment

### 6.1 Test Everything
1. **Frontend:** Visit your Vercel URL
2. **Backend:** Test API endpoints
3. **Integration:** Try downloading images

### 6.2 Monitor Performance
- **Vercel Analytics:** Track frontend performance
- **Render Logs:** Monitor backend health
- **SEO Tools:** Check Google PageSpeed Insights

## 📊 Benefits of This Setup

### ✅ **SEO Advantages:**
- Fast loading times (Vercel CDN)
- Automatic HTTPS
- Mobile-optimized
- Global availability

### ✅ **Cost Benefits:**
- **Vercel:** Unlimited free deployments
- **Render:** 750 hours/month free
- **Total Cost:** $0/month for small apps

### ✅ **Scalability:**
- Automatic scaling on both platforms
- Easy to upgrade when needed
- Separate scaling for frontend/backend

## 🔧 Troubleshooting

### Common Issues:
1. **CORS Errors:** Check environment variables
2. **Build Failures:** Verify Node.js version
3. **API Timeouts:** Check Render service limits
4. **Environment Variables:** Ensure all are set correctly

### Support:
- **Vercel Docs:** https://vercel.com/docs
- **Render Docs:** https://render.com/docs
- **GitHub Issues:** For code-specific problems

---

## 🎉 Success!
Your BulkyLoad app is now deployed with:
- ✅ **Frontend:** Vercel (SEO optimized)
- ✅ **Backend:** Render (API optimized)
- ✅ **HTTPS:** Automatic on both platforms
- ✅ **CDN:** Global content delivery
- ✅ **Analytics:** Built-in performance tracking

**Your app is ready for production! 🚀** 