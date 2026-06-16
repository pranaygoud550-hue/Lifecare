# Persistent MongoDB (Atlas) for production demo

Without Atlas, Render may fall back to **in-memory MongoDB** — data resets when the server sleeps. Follow these steps once so patient history, scans, and bookings persist.

## 1. Create Atlas cluster (free tier)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → create account  
2. **Build a cluster** → M0 FREE  
3. **Database Access** → Add user (username + password)  
4. **Network Access** → Add IP `0.0.0.0/0` (allow from anywhere — required for Render free tier)

## 2. Connection string

1. Atlas → **Connect** → Drivers → copy URI  
2. Replace `<password>` with your DB user password  
3. Example:

```
mongodb+srv://lifecare_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/lifecare-plus?retryWrites=true&w=majority
```

## 3. Render backend env vars

In [Render Dashboard](https://dashboard.render.com) → your API service → **Environment**:

| Key | Value |
|-----|--------|
| `MONGODB_URI` | Your Atlas URI |
| `NODE_ENV` | `production` |
| `ALLOW_DEMO_LOGIN` | `true` (interviews only; set `false` for real users) |
| `FRONTEND_URL` | `https://lifecare-frontend-navy.vercel.app` |
| `JWT_SECRET` | Long random string |
| `JWT_REFRESH_SECRET` | Different long random string |
| `GOOGLE_PLACES_API_KEY` | Same as `GOOGLE_MAPS_API_KEY` — server-side Places + Directions |
| `GOOGLE_MAPS_API_KEY` | Google Cloud API key (restrict to Places + Directions, not HTTP referrers) |
| `TWILIO_ACCOUNT_SID` | Twilio console — SOS SMS to patient + emergency contacts |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number (E.164, e.g. +1…) |

Or sync from local `backend/.env` in one command (after creating a [Render API key](https://dashboard.render.com/u/settings#api-keys)):

```bash
RENDER_API_KEY=rnd_xxx node scripts/sync-render-env.mjs
```

Redeploy the service.

## 4. Verify

```bash
curl -s https://lifecare-l42k.onrender.com/health | python3 -m json.tool
```

Expect:

- `"status": "ok"`
- `"database.connected": true`
- `"database.inMemory": false`

## 5. Seed demo data (optional)

Atlas starts empty. Demo login (`9876543210`) auto-creates users on first sign-in. For full seed (doctors, medicines, ambulances), run locally:

```bash
# In backend/.env set MONGODB_URI to the same Atlas URI
npm run db:seed -w backend
```

Or trigger empty-db auto-seed on first Render boot (only when `User.countDocuments() === 0`).
