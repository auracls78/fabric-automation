# Fabric Automation Deployment

## 1) Backend (Render)

1. Push this repo to GitHub.
2. In Render create a new `Web Service` from the repo.
3. Configure:
   - Build Command: `npm install`
   - Start Command: `npm run start`
4. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=10000` (or leave Render default)
   - `JWT_SECRET=<long-random-secret>`
   - `FRONTEND_ORIGIN=https://<your-firebase-site>.web.app`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
5. Deploy and verify:
   - `GET https://<render-service>.onrender.com/api/health`

## 2) Frontend (Firebase Hosting)

1. Edit `public_site/config.js`:
   - `window.__API_BASE__ = "https://<render-service>.onrender.com";`
2. Deploy:
   - `firebase deploy --only hosting`

## 3) Local development

1. Copy env template:
   - `Copy-Item .env.example .env`
2. Start app:
   - `npm run start`
3. Open:
   - `http://localhost:3000`

## Notes

- In production, verification code is sent via SMTP.
- If SMTP is not configured, backend falls back to returning `verificationCode` in response (dev behavior).
