# Changelog (human iteration log)

High-level history of what changed and why — not every commit, but the arcs a recruiter can skim on GitHub.

## 2026 — Hyderabad emergency + authenticity pass

- **Hyderabad-only SOS** — Replaced GPS-first with 180+ area search; backend bounds validation.
- **25 partner hospitals** seeded with real coordinates; ambulances staged across city zones.
- **Removed instant SOS SMS** — In-app notify on dispatch; optional SMS when driver accepts.
- **Performance** — Lazy-loaded emergency modals, maps, vitals; lighter notification polling.
- **Docs** — Engineering notes, deploy guide, interview demo script.

## 2025–2026 — Interview readiness

- Fixed **Need Help modal** not opening from patient dashboard (provider mount bug).
- Fixed **wrong-city hospitals** on SOS (geo fallback + search radius).
- **Demo login** rate-limit exemption for live interviews.
- **6-slide onboarding** + cinematic intro (first visit).
- **MediScan** unified history on profile + health vault.
- **Skin care** pharmacy catalog and cart flow.
- **SOS live map** after dispatch instead of stuck retry screen.

## Earlier — Core platform

- MERN monorepo: patient, doctor, pharmacy, ambulance, admin roles.
- WebRTC video consult with Socket.io signaling.
- Stripe + wallet payments.
- OpenAPI / Swagger documentation.
- Jest integration tests (auth, appointments, emergency).
- RapidCare sibling app webhook sync (separate repo folder).

---

For line-by-line history: `git log --oneline` on [GitHub](https://github.com/pranaygoud550-hue/Lifecare/commits/main).
