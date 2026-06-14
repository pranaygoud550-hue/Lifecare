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
1. **Dashboard** — quick actions: Book doctor, Pharmacy, MediScan, **Need Help**
2. **Doctors** → pick Dr. Rajesh Sharma → **Book** → video slot → pay with **Wallet**
3. **Pharmacy** → add medicine → **Cart** → **Checkout**
4. **Need Help** (dashboard or floating button) → dispatch ambulance → live tracking
5. **Wellness** → vitals + doctor care plan (after doctor publishes one)

### 3. Doctor portal (1 min)
- Log out → **Try as Doctor**
- Open a patient → publish **Care plan** (diet + dos/don’ts)
- Switch back to Patient → **Wellness** to show sync

### 4. Operations roles (1 min)
- **Pharmacy** — advance an order: Confirm → Packed → Shipped
- **Ambulance** — show incoming SOS / transport on driver dashboard
- **Admin** — platform overview

### 5. Technical talking points (30 sec)
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
| Video consult | `/live-checkup` | ✅ |
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
| Onboarding shows again | Clear `lifecare-onboarding-complete` in browser localStorage |
| SOS “no ambulance” | Backend uses fallback search (10→500 km); retry once |
| Stripe card disabled | Use **Wallet** or **Pay at clinic** — expected without live Stripe keys |

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
