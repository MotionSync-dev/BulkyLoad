# Render Deployment Guide for BulkyLoad Backend

## 🚀 **Deploy to Render**

### **Step 1: Connect GitHub Repository**
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select the `MotionSync-dev/BulkyLoad` repository

### **Step 2: Configure Service**
- **Name**: `bulkload-backend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### **Step 3: Environment Variables**
Add these in Render's environment variables section:

```bash
NODE_ENV=production
PORT=10000
GUMROAD_PRODUCT_ID=ihwaqc
GUMROAD_SELLER_ID=your_seller_id_here
JWT_SECRET=your-super-secret-jwt-key-here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bulkload
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

### **Step 4: Deploy**
Click "Create Web Service" and wait for deployment.

## 🌐 **Your Backend URL**
After deployment, you'll get:
```
https://bulkload-backend.onrender.com
```

## 🔗 **Update Frontend Configuration**
Update your frontend's environment variables to point to Render:
```bash
VITE_API_URL=https://bulkload-backend.onrender.com
```

## 🪝 **Gumroad Webhook URL**
Set this in Gumroad:
```
https://bulkload-backend.onrender.com/api/gumroad-webhook
```

## 📊 **Health Check**
Test your deployment:
```
https://bulkload-backend.onrender.com/api/health
```

## 🔒 **Security Notes**
- All environment variables are encrypted in Render
- Your `.env` file is not deployed (excluded by .gitignore)
- JWT_SECRET should be a long, random string
- Use MongoDB Atlas for production database
