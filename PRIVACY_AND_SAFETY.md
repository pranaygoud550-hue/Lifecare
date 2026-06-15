# LifeCare+ — Privacy & AI Safety

This document describes how the **portfolio / demo** deployment handles health-related data. It is not legal advice and does not constitute HIPAA compliance.

## What this product is

LifeCare+ is a **digital care prototype**: teleconsult booking, wallet payments, emergency dispatch simulation, pharmacy ordering, and **AI-assisted screening** (MediScan). It is designed for demonstrations and engineering interviews — not for treating patients in production without clinical and regulatory review.

## MediScan (AI screening)

| Principle | Implementation |
|-----------|----------------|
| **Not a diagnosis** | UI labels say “screening assistant”; results include disclaimers |
| **Physician in the loop** | Patients can share scans with doctors; doctors can review and override |
| **Demo ML** | When the external ML API is unavailable, an integrated **local fallback** produces illustrative scores — not validated clinical output |
| **No automated treatment** | The app does not prescribe medication based on AI alone |

## Data we store (demo)

- Account profile, appointments, wallet transactions (demo balances)
- Uploaded scan images and AI result metadata
- Scan history on the patient profile and copies in the health records vault
- Emergency request metadata (location, status) for SOS demos

## Who can access patient data

| Role | Access |
|------|--------|
| Patient | Own profile, scans, appointments, records |
| Doctor | Patients they treat; shared scans; care plans they publish |
| Pharmacy / Ambulance / Admin | Role-scoped APIs only |

Patients can control vitals/wellness sharing via **Profile → Privacy**.

## Demo mode (public link)

When `ALLOW_DEMO_LOGIN=true`:

- One-click demo accounts are enabled for interviews
- Data may use **in-memory MongoDB** on Render if Atlas is not configured (resets on cold start)
- Do not enter real PHI (personal health information) on the public demo

For interviews, use the seeded demo patient only.

## Production hardening (if you deploy for real users)

1. MongoDB Atlas with encryption at rest  
2. Remove or IP-restrict demo login  
3. Validated clinical AI vendor + IRB/clinical workflow  
4. Audit logs for record access  
5. HIPAA/legal review, BAAs with vendors  
6. TURN servers for reliable WebRTC  

## Contact

For demo issues, see [INTERVIEW_DEMO.md](./INTERVIEW_DEMO.md).
