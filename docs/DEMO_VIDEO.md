# 2–3 minute demo video script

Record with Loom or OBS. Upload to YouTube (unlisted) and link from README.

**Before recording:** Open [live app](https://lifecare-frontend-navy.vercel.app). Wait ~30s if Render is cold. Use **Try as Patient**.

| Time | Say / do |
|------|----------|
| 0:00 | "This is LifeCare+, a health prototype I built with React and Node. It's not a real hospital product — it's for learning and demos." |
| 0:20 | Login → skip or fast-forward onboarding → land on dashboard. |
| 0:40 | Doctors → open a doctor → book video consult → pay with **Wallet**. |
| 1:00 | Live Checkup → join **DEMO-LIVE-VIDEO** → show local camera tile. "WebRTC signaling goes through Socket.io on our API." |
| 1:20 | MediScan → upload a chest image → show result. "Screening only — doctor can review in the portal." |
| 1:40 | **Need Help** → search **Madhapur** → add landmark "Flat 402" → show nearest hospital. "We scoped emergency to Hyderabad because GPS failed on laptops in testing." |
| 2:10 | Open [API docs](https://lifecare-l42k.onrender.com/api/docs) in new tab — flash Swagger. |
| 2:25 | "Repo is public with commit history and engineering notes in `docs/ENGINEERING.md`. Thanks." |

## What not to claim on camera

- "FDA approved" / "clinical diagnosis"
- "Nationwide ambulance network"
- "Production SMS to all contacts" (we removed blast SMS on SOS create)

## Optional second take (doctor role)

30 seconds: second browser → Demo as Doctor → same video room + doctor patients list.
