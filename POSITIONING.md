# LifeCare+ — Interview positioning (one story)

Use this when HR or engineering asks: *“What did you build?”*

## One-liner

**LifeCare+ is a prototype digital primary-care platform** where a patient can book a video consult, pay with a wallet, run AI-assisted health screening, and dispatch emergency help — with separate portals for doctors, pharmacy staff, and ambulance drivers.

## The 3-minute demo path

1. **Patient** — demo login → book doctor → pay with wallet  
2. **Live Checkup** — join pre-seeded video room  
3. **MediScan** — upload scan → results saved to profile history  
4. **Need Help** — SOS dispatch with live tracking  
5. **Doctor** — patients list + care plan (optional)  
6. **Pharmacy / Ambulance** — operations dashboards (optional)

Full script: [INTERVIEW_DEMO.md](./INTERVIEW_DEMO.md)

## What to say you owned (technical depth)

Pick **one** for a 10-minute deep dive:

| Topic | Talking points |
|-------|----------------|
| **Auth & roles** | JWT + refresh, RBAC middleware, demo vs real users |
| **Emergency SOS** | Geo query, ambulance assignment, Socket.io rooms, OTP pickup |
| **MediScan pipeline** | Upload → queue → ML/fallback → health vault + unified history |
| **Video consult** | Appointment gating (paid), Socket.io signaling, WebRTC hook |

## Honest limitations (say these proactively)

- MediScan is **screening**, not FDA/regulatory-grade diagnosis  
- Public demo uses **ALLOW_DEMO_LOGIN** — not for real PHI  
- WebRTC may need TURN in restrictive networks  
- Stripe optional; wallet works for demos  

## Links

- App: https://lifecare-frontend-navy.vercel.app/login  
- API docs: https://lifecare-l42k.onrender.com/api/docs  
- Safety: [PRIVACY_AND_SAFETY.md](./PRIVACY_AND_SAFETY.md)  
