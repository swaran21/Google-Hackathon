# ResQNet Vercel Deployment Fix

## Problem
After deploying to Vercel, your frontend is making API calls to itself (`https://google-hackathon-eight.vercel.app/api`) instead of your backend. This is because Vercel doesn't use the Vite proxy config.

## Files Fixed
1. `client/src/services/api.js` - Now uses `import.meta.env.VITE_API_URL`
2. `client/src/services/socket.js` - Now uses `import.meta.env.VITE_SOCKET_URL`

## What You Need To Do

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Fix API and Socket URLs for production"
git push
```

Vercel will automatically rebuild.

### Step 2: Set Environment Variables in Vercel Dashboard

1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** > **Environment Variables**
4. Add these variables:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://YOUR_BACKEND_URL.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://YOUR_BACKEND_URL.onrender.com` |

**Replace `YOUR_BACKEND_URL.onrender.com` with your actual Render backend URL!**

5. Click **Save**
6. Go to **Deployments** and click **Redeploy** on the latest deployment

### Step 3: Update Your Backend URL in Vercel

In your `server/.env` on Render (or wherever your backend is deployed), make sure:
```
CLIENT_URL=https://your-vercel-frontend.vercel.app
```

## For Kubernetes Deployment

If you deploy to GKE using the Kubernetes manifests I created, the environment variables will be set automatically via the ConfigMaps and Secrets in `kubernetes/backend-configmap.yaml` and `kubernetes/backend-secret.yaml`.