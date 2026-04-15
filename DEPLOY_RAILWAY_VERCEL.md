Railway + Vercel Deployment Guide

Goal
- Backend on Railway
- Frontend on Vercel
- Keep existing Kubernetes files unchanged

1. Deploy backend on Railway
- Open Railway dashboard.
- Create New Project from GitHub repo: SAI-CHANDHAN/to-do.
- Add a Service from this repo.
- Set Root Directory to server.
- Build command: npm install
- Start command: node server.js
- Healthcheck path: /api/healthz

2. Railway backend environment variables
- NODE_ENV=production
- CLIENT_URL=https://<your-vercel-domain>
- FRONTEND_URL=https://<your-vercel-domain>
- MONGO_URI=<your-mongodb-atlas-uri>
- REDIS_URL=<your-redis-url>
- JWT_ACCESS_SECRET=<strong-random-secret>
- JWT_REFRESH_SECRET=<strong-random-secret>
- ENCRYPTION_KEY=<64-char-hex-key>
- GOOGLE_CLIENT_ID=<google-client-id>
- GOOGLE_CLIENT_SECRET=<google-client-secret>
- GOOGLE_CALLBACK_URL=https://<your-railway-domain>/api/auth/google/callback

3. Deploy frontend on Vercel
- Import repo into Vercel.
- Framework preset: Create React App.
- Root directory: client.
- Build command: npm run build.
- Output directory: build.

4. Vercel frontend environment variable
- REACT_APP_API_URL=https://<your-railway-domain>

5. Google OAuth configuration
- In Google Cloud Console, open OAuth client settings.
- Authorized JavaScript origins:
  - https://<your-vercel-domain>
  - https://<your-railway-domain>
- Authorized redirect URIs:
  - https://<your-railway-domain>/api/auth/google/callback

6. Verify deployment
- Open backend health endpoint:
  - https://<your-railway-domain>/api/healthz
- Open frontend app:
  - https://<your-vercel-domain>
- Test login/register.
- Enable MFA from dashboard and verify TOTP login with an authenticator app.
- Test Google login redirect and callback.
- Confirm auth persists after refresh.

7. Common fixes
- If login loops back to login:
  - Check CLIENT_URL and FRONTEND_URL on Railway exactly match Vercel domain.
  - Confirm Vercel REACT_APP_API_URL matches Railway domain.
  - Confirm Google callback URL matches Railway domain exactly.
- If CORS error appears:
  - Recheck CLIENT_URL and redeploy Railway service.
- If 401 after login:
  - Check browser request includes cookies and backend is in production mode.
- If MFA setup fails with server error:
  - Confirm ENCRYPTION_KEY is set on Railway and redeploy the service.

8. Security reminders
- Do not commit real .env files.
- Keep only .env example files in git.
- Rotate secrets if they were ever exposed.
