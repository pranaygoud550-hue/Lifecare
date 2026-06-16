# LifeCare+ — Interview positioning (one story)

Use this when HR or engineering asks: *“What did you build?”*

## Resume bullet (honest — copy/paste)

> Built **LifeCare+**, a TypeScript MERN health prototype (React, Node, MongoDB) with JWT auth, WebRTC teleconsultation via Socket.io, wallet/Stripe payments, MediScan **screening** with doctor review, and **Hyderabad-scoped** emergency dispatch with geo-matched hospitals. Deployed on Vercel + Render; documented architecture, API (OpenAPI), and integration tests. [Live demo](https://lifecare-frontend-navy.vercel.app) · [GitHub](https://github.com/pranaygoud550-hue/Lifecare)

Do **not** list every buzzword in one line. Pick one deep topic for technical interviews.

## One-liner (spoken)

**LifeCare+ is a prototype digital primary-care app** — book a video consult, pay with a wallet, run AI-assisted **screening** (not diagnosis), and request emergency help in **Hyderabad** with area search and live ambulance tracking.

## The 3-minute demo path

1. **Patient** — demo login → book doctor → pay with wallet  
2. **Live Checkup** — join pre-seeded video room  
3. **MediScan** — upload scan → results saved to profile history  
4. **Need Help** — pick area (e.g. Madhapur) → optional flat/landmark → nearest hospital → dispatch  
5. **Doctor** — patients list + care plan (optional)  
6. **Pharmacy / Ambulance** — operations dashboards (optional)

Full script: [INTERVIEW_DEMO.md](./INTERVIEW_DEMO.md) · Video: [docs/DEMO_VIDEO.md](./docs/DEMO_VIDEO.md)

## What to say you owned (pick ONE for deep dive)

| Topic | Talking points |
|-------|----------------|
| **Auth & roles** | JWT + refresh, RBAC middleware, demo vs real users |
| **Emergency SOS** | Hyderabad areas, `$geoNear` hospitals, ambulance assignment, Socket.io rooms, OTP pickup — **and** the GPS failure story |
| **MediScan pipeline** | Upload → remote ML or local fallback → health vault + doctor review |
| **Video consult** | Appointment gating (paid), Socket.io signaling, WebRTC hook, STUN-only limits |

Engineering detail: [docs/ENGINEERING.md](./docs/ENGINEERING.md)

## Bugs we actually fixed (say these — they prove you built it)

- Need Help modal never opened on dashboard (provider not mounted)  
- SOS showed hospitals in the wrong city (bad fallback coordinates)  
- GPS unusable on laptops → Hyderabad manual area picker (180+ localities)  
- Demo login hit rate limits during interviews  
- Render cold start + in-memory DB when Atlas not configured  

## Honest limitations (say these proactively)

- MediScan is **screening**, not FDA/regulatory-grade diagnosis  
- Emergency is **Hyderabad & outskirts** only in the current demo  
- Public demo uses **ALLOW_DEMO_LOGIN** — not for real PHI  
- WebRTC may need TURN in restrictive networks  
- Stripe optional; wallet works for demos  
- No automatic SMS blast to family on SOS button (in-app notify instead)

## Links

- App: https://lifecare-frontend-navy.vercel.app/login  
- API docs: https://lifecare-l42k.onrender.com/api/docs  
- Engineering: [docs/ENGINEERING.md](./docs/ENGINEERING.md)  
- Safety: [PRIVACY_AND_SAFETY.md](./PRIVACY_AND_SAFETY.md)  
- Repo: https://github.com/pranaygoud550-hue/Lifecare
