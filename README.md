<p align="center">
  <img src="frontend/public/lifecare-icon.svg" alt="LifeCare+" width="72" height="72" />
</p>

<h1 align="center">LifeCare+</h1>

<p align="center">
  <strong>End-to-end digital health prototype</strong> — teleconsultation, emergency dispatch, pharmacy, AI screening, and payments in one demo surface.<br/>
  Built as a TypeScript MERN monorepo with real-time tracking, WebRTC video, and Stripe-ready billing.
</p>

<p align="center">
  <a href="https://lifecare-frontend-navy.vercel.app"><strong>Live Demo →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://lifecare-l42k.onrender.com/api/docs">API Docs</a>
  &nbsp;·&nbsp;
  <a href="https://lifecare-l42k.onrender.com/health">Health Check</a>
  &nbsp;·&nbsp;
  <a href="INTERVIEW_DEMO.md">Interview Guide</a>
  &nbsp;·&nbsp;
  <a href="POSITIONING.md">Positioning</a>
  &nbsp;·&nbsp;
  <a href="PRIVACY_AND_SAFETY.md">Privacy & AI Safety</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-real--time-010101?logo=socket.io" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Stripe-payments-635BFF?logo=stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

---

## Live demo

| | URL |
|---|---|
| **App** | [lifecare-frontend-navy.vercel.app](https://lifecare-frontend-navy.vercel.app) |
| **API** | [lifecare-l42k.onrender.com/api](https://lifecare-l42k.onrender.com/api) |
| **Swagger** | [lifecare-l42k.onrender.com/api/docs](https://lifecare-l42k.onrender.com/api/docs) |
| **Interview demo script** | [INTERVIEW_DEMO.md](./INTERVIEW_DEMO.md) |
| **Persistent DB setup** | [docs/DEPLOY_ATLAS.md](./docs/DEPLOY_ATLAS.md) |

> **Honest scope:** This is an **interview-ready prototype**, not a regulated medical device. MediScan provides **AI screening assistance** with doctor review — not clinical diagnosis. See [PRIVACY_AND_SAFETY.md](./PRIVACY_AND_SAFETY.md).

All seeded accounts use password **`Password@123`**, or use **one-click demo** on the login page (Patient or Doctor only).

| Role | Demo button / Phone | Use case |
|------|---------------------|----------|
| **Patient** | `9876543210` | Book consults, SOS, pharmacy, MediScan |
| **Doctor** | `9876543211` | Patients, video consult, care plans |

**First visit:** Full-screen **6-chapter cinematic intro** (splash → slides) explains why LifeCare+ matters.

Email login (optional): `patient@demo.com`, `dr.sharma@lifecare.com`, `pharmacy@lifecare.com`, `ambulance@lifecare.com`, `admin@lifecare.com` — same password.

> Full interview walkthrough: **[INTERVIEW_DEMO.md](./INTERVIEW_DEMO.md)**

---

## Why it's technically interesting

A portfolio project that goes beyond CRUD — each flow maps to patterns used in health-tech products (with demo-grade ML and auth where noted).

| Capability | What we built |
|------------|---------------|
| **WebRTC teleconsult** | Peer signaling over Socket.io; room join gated on auth + payment status |
| **Emergency SOS** | Geo-matched driver assignment, live GPS streaming, pickup OTP verification |
| **Real-time layer** | Socket.io rooms for consult, SOS, ambulance, and notifications |
| **Payments** | Stripe PaymentIntents + webhooks; patient wallet with top-up and debit |
| **MediScan** | Chest / skin / retina upload → AI or integrated fallback → profile history + health vault |
| **Auth & sessions** | JWT + refresh rotation; demo login for interviews (`ALLOW_DEMO_LOGIN`) |
| **API surface** | OpenAPI 3 + Swagger UI |

**Role-based product surface:** patient · doctor · ambulance driver · pharmacy · admin — each with dedicated dashboards and guarded API routes.

---

## Architecture

```mermaid
flowchart TB
  subgraph Client["Browser / Mobile Web"]
    UI["React SPA<br/>RTK Query · Tailwind · shadcn/ui"]
    MAP["Leaflet maps"]
    RTC["WebRTC peer"]
  end

  subgraph API["Node.js / Express"]
    REST["REST /api/*"]
    WS["Socket.io server"]
    AUTH["JWT + refresh rotation"]
    PAY["Stripe webhooks"]
    SWAG["OpenAPI /api/docs"]
  end

  subgraph Data["Persistence"]
    MONGO[("MongoDB 7<br/>geospatial indexes")]
    UP["Local / S3 uploads"]
  end

  subgraph External["Third-party"]
    STRIPE["Stripe"]
    SMTP["SMTP / Twilio"]
  end

  UI --> REST
  UI --> WS
  RTC <-->|signaling| WS
  MAP --> REST
  REST --> AUTH
  REST --> MONGO
  REST --> UP
  PAY --> STRIPE
  REST --> SMTP
  SWAG --> REST
```

<details>
<summary>ASCII fallback</summary>

```
┌─────────────┐     REST + WS      ┌──────────────────────────────┐
│  React SPA  │ ◄────────────────► │  Express API + Socket.io     │
│  WebRTC     │   JWT / cookies    │  Zod · rate limit · Helmet   │
└─────────────┘                    └──────────┬─────────┬─────────┘
                                              │         │
                                    ┌─────────▼──┐  ┌───▼────┐
                                    │  MongoDB   │  │ Stripe │
                                    │  (2dsphere)│  │ webhook│
                                    └────────────┘  └────────┘
```
</details>

---

## Tech stack

| Layer | Stack |
|-------|-------|
| **Frontend** | React 18, TypeScript, Vite, Redux Toolkit, RTK Query, React Router, Tailwind CSS 4, shadcn/ui, Leaflet, Recharts, Stripe.js, Socket.io Client |
| **Backend** | Node.js 20, Express, TypeScript, Socket.io, Mongoose, Zod, Multer, Swagger UI, Jest + Supertest |
| **Database** | MongoDB 7 — document model with geospatial queries for hospitals & tracking |
| **Infra** | Docker Compose, npm workspaces, Railway (`railway.toml`), health endpoints |

---

## Quick start

**Prerequisites:** Node.js 20+, npm 10+, Docker (for local MongoDB)

```bash
git clone https://github.com/YOUR_USERNAME/lifecare-plus.git && cd lifecare-plus
npm install && cp backend/.env.example backend/.env && cp frontend/.env.example frontend/.env
npm run dev
```

| Service | Local URL |
|---------|-----------|
| Frontend | http://localhost:5173 |
| API | http://localhost:5001/api |
| **API docs** | **http://localhost:5001/api/docs** |
| Health | http://localhost:5001/health |

First run auto-seeds demo data when the database is empty. To reset manually: `npm run db:setup`.

<details>
<summary>Docker full stack</summary>

```bash
docker compose up -d --build
```

</details>

<details>
<summary>Environment variables</summary>

Copy `backend/.env.example` and `frontend/.env.example`. Minimum for local dev:

| Variable | Where | Purpose |
|----------|-------|---------|
| `MONGODB_URI` | backend | Mongo connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | backend | Token signing |
| `FRONTEND_URL` | backend | CORS origin |
| `VITE_API_URL` | frontend | API base (`/api` uses Vite proxy in dev) |
| `VITE_SOCKET_URL` | frontend | Socket.io server |
| `STRIPE_*` | both | Payments (optional in dev — wallet demo works without) |

</details>

---

## API documentation

Interactive OpenAPI docs with **Try it out** and persistent bearer-token auth:

| | URL |
|---|---|
| Local | http://localhost:5001/api/docs |
| Production | https://lifecare-backend.up.railway.app/api/docs |
| Raw spec | `/api/docs.json` |

**Quick auth flow:** `POST /api/auth/login` → copy `data.accessToken` → **Authorize** in Swagger → test protected routes.

Covers auth, appointments, emergency SOS, pharmacy, and payments. Full route map lives in the spec — no stale markdown tables.

---

## Screenshots

> Add captures to `docs/screenshots/` and uncomment below.

<!--
| Home & discovery | Video consult | Emergency SOS |
|:---:|:---:|:---:|
| ![Home](./docs/screenshots/home.png) | ![Consult](./docs/screenshots/consultation.png) | ![SOS](./docs/screenshots/emergency.png) |

| Pharmacy checkout | Health vault | Admin dashboard |
|:---:|:---:|:---:|
| ![Pharmacy](./docs/screenshots/pharmacy.png) | ![Records](./docs/screenshots/health-records.png) | ![Admin](./docs/screenshots/admin.png) |
-->

| Screen | Path |
|--------|------|
| Home & doctor discovery | `docs/screenshots/home.png` |
| Appointment booking | `docs/screenshots/booking.png` |
| Video consultation | `docs/screenshots/consultation.png` |
| Emergency SOS & tracking | `docs/screenshots/emergency.png` |
| Pharmacy checkout | `docs/screenshots/pharmacy.png` |
| Health records vault | `docs/screenshots/health-records.png` |
| Admin dashboard | `docs/screenshots/admin.png` |

---

## Project structure

```
lifecare-plus/
├── frontend/          # React SPA — pages, RTK Query, WebRTC hooks
├── backend/           # Express API, Socket.io, OpenAPI spec, models
├── scripts/           # MongoDB startup & health wait helpers
├── docker-compose.yml # MongoDB + optional full-stack dev
└── package.json       # npm workspaces root
```

---

## Security & quality

- **Helmet** HTTP headers · **rate limiting** (global + auth routes)
- **Zod** request validation · **mongo-sanitize** (NoSQL injection)
- **JWT refresh rotation** with token-family invalidation on logout
- **31 integration tests** — auth, appointments, wallet, emergency flows

---

## RapidCare (separate ambulance app)

RapidCare lives in a **sibling folder**, not inside this repo: `~/Desktop/rapidcare-app`.

| | LifeCare+ | RapidCare |
|---|---|---|
| **Folder** | `save/` | `rapidcare-app/` |
| **Local URL** | http://localhost:5173 | http://localhost:3000 |
| **API** | :5001 | :5002 |

Completed RapidCare trips sync automatically into the patient dashboard (Emergency tab + health records). Set matching `LIFECARE_WEBHOOK_SECRET` on both backends and `VITE_RAPIDCARE_URL=http://localhost:3000` in `frontend/.env`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Mongo (Docker) + API + frontend |
| `npm run build` | Production build both workspaces |
| `npm run db:setup` | Start Mongo, wait, seed demo data |
| `npm test` (in `backend/`) | Integration test suite |

---

<p align="center">
  <sub>LifeCare+ — built to demonstrate production patterns in digital health, not just UI mockups.</sub>
</p>
