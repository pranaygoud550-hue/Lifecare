# Security notes (portfolio / demo)

## Authentication

- JWT access tokens (short-lived) + refresh rotation  
- Demo login gated by `ALLOW_DEMO_LOGIN=true` and known phone numbers only  
- Auth rate limit relaxed only for `/demo-login` when demo mode is on  

## Frontend token storage

- Tokens in `localStorage` for SPA session persistence (demo convenience)  
- Production hardening would prefer httpOnly cookies only (backend already supports cookies)  

## API

- Helmet, CORS allowlist, Mongo sanitize, Zod validation  
- Role-based `authorize()` on sensitive routes  
- Stripe webhook uses raw body + signature verification  

## Demo deployment risks

| Risk | Mitigation |
|------|------------|
| Public demo accounts | Interview-only; disable `ALLOW_DEMO_LOGIN` for real launch |
| In-memory DB | Use Atlas — see [docs/DEPLOY_ATLAS.md](./docs/DEPLOY_ATLAS.md) |
| AI misuse | Disclaimers + doctor review flow; see [PRIVACY_AND_SAFETY.md](./PRIVACY_AND_SAFETY.md) |

## Reporting

This is a student/portfolio project. Do not submit real medical records to the public demo URL.
