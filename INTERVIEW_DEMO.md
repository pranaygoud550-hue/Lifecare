# LifeCare+ — Interview Demo Guide

Use this one-page guide when presenting the project in interviews, hackathons, or recruiter calls.

## Live link (share this)

| | URL |
|---|---|
| **App (frontend)** | https://lifecare-frontend-navy.vercel.app |
| **API (backend)** | https://lifecare-l42k.onrender.com |
| **Health check** | https://lifecare-l42k.onrender.com/health |

> **Note:** Render free tier may sleep ~30s on first request. Wait for the spinner, then use **Try instantly** demo buttons on `/login`.

---

## One-click demo accounts

Open **Login** → scroll to **Try instantly — no signup** → pick a role:

| Role | Button | Where you land | What to show |
|------|--------|----------------|--------------|
| **Patient** | Try as Patient | `/dashboard` | Appointments, MediScan, pharmacy cart, **Need Help** SOS |
| **Doctor** | Try as Doctor | `/doctor/patients` | Patient list, care plans, video consults |
| **Pharmacy** | Try as Pharmacy | `/pharmacy/portal` | Order queue, pack → ship → deliver |
| **Ambulance** | Try as Ambulance | `/driver` | SOS pickups, transport, navigation |
| **Admin** | Try as Admin | `/admin` | Platform stats, user management |

Password login (optional): `patient@demo.com` / `Password@123` — same seeded data.

---

## 5-minute demo script (recommended order)

### 1. First impression (30 sec)
- Open live link → cinematic onboarding (6 slides) on first visit
- Skip to **Login** → **Try as Patient**

### 2. Patient journey (2 min)
1. **Dashboard** → **Doctors** → book Dr. Sharma → pay with **Wallet**
2. **Live Checkup** → **Join now** on the pre-seeded demo call (instant — no wait)
3. **MediScan** → upload chest X-ray sample (`backend/tests/fixtures/sample-chest.png`) → AI results
4. **Pharmacy** → cart → checkout
5. **Need Help** → dispatch ambulance

### 3. Video consult deep-dive (1 min)
- **Patient:** `/live-checkup` → join **DEMO-LIVE-VIDEO** room (camera/mic prompt is normal)
- **Doctor:** log in as doctor → same page → join same room → WebRTC + chat
- Mention: Socket.io signaling, room gated on payment status

---

## How to test a real video call (two users)

Use **two browsers** (Chrome + Safari, or normal + incognito) so each person has their own camera session.

| Step | Patient (`9876543210`) | Doctor (`9876543211`) |
|------|------------------------|------------------------|
| 1 | Open [Login](https://lifecare-frontend-navy.vercel.app/login) → **Try as Patient** | Same link → **Try as Doctor** |
| 2 | Go to **Live Checkup** (`/live-checkup`) | Go to **Live Checkup** |
| 3 | Click **Join now** on **DEMO-LIVE-VIDEO** | Click **Join now** on the **same** appointment |
| 4 | Allow **camera + microphone** | Allow **camera + microphone** |

**What you should see**
- Your own video in the small tile (bottom-right)
- The other person’s video on the main screen
- Working mic mute, video off, and in-call chat

**Technical notes (for interviews)**
- Real **WebRTC** (`getUserMedia` + `RTCPeerConnection`) — not a mock UI
- **Socket.io** relays `offer` / `answer` / `ice-candidate` into a shared `roomId`
- Join is gated: same appointment, payment `paid`, status `confirmed` or `in-progress`
- Uses Google **STUN** only (no TURN) — works on home WiFi; strict corporate firewalls may block P2P

**If video doesn’t connect**
| Symptom | Try |
|---------|-----|
| Black remote video | Refresh both tabs; join doctor **after** patient is in the room |
| Camera blocked | Browser site settings → allow camera/mic for the Vercel URL |
| No appointment listed | Log out and demo-login again (seeds `DEMO-LIVE-VIDEO` on login) |
| “Complete payment” error | Re-login as patient (demo wallet is topped up automatically) |
| One-way audio only | Check mic isn’t muted; try Chrome on both sides |

**Book a new video call (optional)**
1. Patient → **Doctors** → pick a doctor → **Video Consultation** → pay with **Wallet**
2. Doctor → accepts appointment (or use pre-confirmed demo booking)
3. Both join from **Live Checkup** within 5 minutes of scheduled time

---
### 4. MediScan deep-dive (45 sec)
- **Dashboard → MediScan** → Chest X-ray → upload PNG/JPG
- Works without Cloudinary (local ML fallback on server)
- Results: classification, confidence, care advice
- **Doctor → AI Scans** to review shared scans

### 5. Operations roles (1 min)
- **Pharmacy** — advance an order: Confirm → Packed → Shipped
- **Ambulance** — show incoming SOS / transport on driver dashboard
- **Admin** — platform overview
- **Doctor portal** — publish a care plan → patient **Wellness** tab

### 6. Technical talking points (30 sec)
- MERN + TypeScript monorepo, RTK Query, Socket.io real-time
- JWT auth with refresh, role-based routes
- Geo-matched ambulance dispatch + hospital routing
- Stripe + wallet payments, WebRTC video consults
- ML MediScan with API fallback

---

## Feature checklist (everything works)

| Area | Route / action | Status |
|------|----------------|--------|
| Onboarding | First launch splash + 6 slides | ✅ |
| Demo login | All 5 roles on `/login` | ✅ |
| Session | Reload stays logged in | ✅ |
| Book doctor | `/doctors` → book → wallet/card/clinic | ✅ |
| Appointments | `/appointments` | ✅ |
| Video consult | `/live-checkup` — demo call ready on login | ✅ |
| Pharmacy shop | `/pharmacy` → cart → checkout | ✅ |
| Pharmacy staff | `/pharmacy/portal` | ✅ |
| Need Help / SOS | Dashboard → Need Help modal | ✅ |
| Ambulance driver | `/driver` | ✅ |
| Doctor patients | `/doctor/patients` | ✅ |
| Care plans | Doctor publish → Patient Wellness | ✅ |
| MediScan | `/dashboard/mediscan` | ✅ |
| Admin | `/admin` | ✅ |
| Maps / hospitals | `/hospitals/nearby` | ✅ |

---

## Troubleshooting during a live demo

| Issue | Fix |
|-------|-----|
| Blank screen / slow load | Render waking up — wait 30–60s, refresh |
| Demo login fails | Ensure `ALLOW_DEMO_LOGIN=true` on Render backend |
| “Too many authentication attempts” | Fixed in latest deploy — demo-login exempt; refresh after ~1 min if you hit an old limit |
| API shows `database.connected: false` | Set valid `MONGODB_URI` on Render **or** rely on in-memory demo fallback (`ALLOW_DEMO_LOGIN=true`) |
| Onboarding shows again | Clear `lifecare-onboarding-complete` in browser localStorage |
| SOS “no ambulance” | Previous demo may have dispatched the unit — refresh backend or wait; call 108 in real emergencies |
| MediScan chest upload | `/dashboard/mediscan` — local ML fallback | ✅ |
| Unified scan history | `/patient/scan-history` — X-ray, skin, eye on profile | ✅ |
| Health vault sync | Scans auto-saved to `/health-records` | ✅ |
| Camera/mic blocked | Browser permission — use chat-only or allow permissions |
| No live consult showing | Re-login as Patient or Doctor (seeds demo call on login) |
| Stripe card disabled | Use **Wallet** or **Pay at clinic** — expected without live Stripe keys |
| MediScan shows disease names | Explain: **screening assistant only** — see [PRIVACY_AND_SAFETY.md](./PRIVACY_AND_SAFETY.md) |
| Data lost after redeploy | Set `MONGODB_URI` on Render — [docs/DEPLOY_ATLAS.md](./docs/DEPLOY_ATLAS.md) |

---

## Run smoke test (maintainers)

```bash
./scripts/interview-smoke-test.sh
```

Optional env overrides:

```bash
API_URL=https://lifecare-l42k.onrender.com/api \
FRONTEND_URL=https://lifecare-frontend-navy.vercel.app \
./scripts/interview-smoke-test.sh
```

---

## Repo

https://github.com/pranaygoud550-hue/Lifecare
