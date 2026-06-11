# RapidCare

Standalone ambulance and medical vehicle booking platform for Hyderabad. Syncs completed trips to LifeCare+.

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS → Vercel
- **Backend:** Express, MongoDB, Socket.io → Render
- **Database:** Separate MongoDB Atlas instance from LifeCare+

## Quick start

```bash
cd rapidcare-app
docker compose up -d          # MongoDB on :27018
cp backend/.env.example backend/.env
npm install
npm run seed -w backend
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:5002

## Demo credentials

| Role   | Login              | Password   |
|--------|--------------------|------------|
| Admin  | admin@rapidcare.app | admin123  |
| Driver | 9000000001         | driver123  |

## LifeCare+ sync

Set matching `LIFECARE_WEBHOOK_SECRET` on both backends. On trip completion, RapidCare POSTs to:

`POST {LIFECARE_API_URL}/api/ambulance/sync`

## Deploy

### Render (API)

1. New **Blueprint** or Web Service → point to `rapidcare-app/` (or use `render.yaml`)
2. Set env vars: `MONGODB_URI`, `GOOGLE_MAPS_API_KEY`, `LIFECARE_WEBHOOK_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`
3. `LIFECARE_API_URL` defaults to `https://lifecare-l42k.onrender.com`

### Vercel (frontend)

1. Import repo → set **Root Directory** to `rapidcare-app/frontend`
2. Env vars:
   - `NEXT_PUBLIC_API_URL` = your Render API URL (e.g. `https://rapidcare-api.onrender.com`)
   - `NEXT_PUBLIC_SOCKET_URL` = same as API URL
3. Redeploy LifeCare+ with `VITE_RAPIDCARE_URL` = your Vercel URL

### Google Places

Set `GOOGLE_MAPS_API_KEY` on Render (Places API + Places API (New) autocomplete). Restrict by API, not HTTP referrer.
