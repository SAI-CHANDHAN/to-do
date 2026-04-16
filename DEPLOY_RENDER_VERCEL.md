Render + Vercel Deployment Guide

1) Deploy backend on Render
- Create new Web Service from this repository.
- Render auto-detects render.yaml at repo root.
- Confirm service name: todo-backend.
- Build command: npm install
- Start command: node server.js

Required Render environment variables:
- NODE_ENV=production
- CLIENT_URL=https://<your-vercel-domain>
- FRONTEND_URL=https://<your-vercel-domain>
- MONGO_URI=<mongodb atlas uri>
- REDIS_URL=<redis cloud url>
- JWT_ACCESS_SECRET=<strong random secret>
- JWT_REFRESH_SECRET=<strong random secret>
- GOOGLE_CLIENT_ID=<google oauth client id>
- GOOGLE_CLIENT_SECRET=<google oauth client secret>
- GOOGLE_CALLBACK_URL=https://<your-render-domain>/api/auth/google/callback

2) Deploy frontend on Vercel
- Import this repo in Vercel.
- Vercel uses vercel.json at repo root to build client app.
- If your Vercel Root Directory is set to client, Vercel will use client/vercel.json for rewrites.
- Add frontend env var:
  - REACT_APP_API_URL=https://<your-render-domain>
- Redeploy the frontend after changing environment variables.

3) Google OAuth setup
- In Google Cloud Console, add:
  - Authorized JavaScript origins:
    - https://<your-vercel-domain>
    - https://<your-render-domain>
  - Authorized redirect URIs:
    - https://<your-render-domain>/api/auth/google/callback

4) Verify
- Open Vercel URL.
- Login/Register should persist authentication.
- Google login should redirect back to Vercel dashboard.

5) Notes
- Kubernetes/EKS manifests are unchanged.
- This deployment path is environment-variable driven and does not alter API routes.
