# AeroTwin-Habitat Backend

**High-altitude military shelter thermal simulation & generative inverse-design platform**
MERN Stack (Node.js + Express + MongoDB) | Project SIH26054

---

## Features

| Feature | Status |
|---|---|
| Multi-layer 1D transient finite-difference thermal solver | ✅ |
| PCM latent-heat via apparent heat capacity (Gaussian Cp) | ✅ |
| Solar irradiance (Ineichen/Haurwitz, altitude-corrected) | ✅ |
| NSGA-II multi-objective optimizer (hand-rolled, JS-native) | ✅ |
| FLIR thermal stealth scoring (emissivity + view factors + Beer-Lambert) | ✅ |
| Logistics audit (Mi-17 / ALS truck) | ✅ |
| PDF engineering report (pdfkit) | ✅ |
| ANSYS APDL `.mac` script export (EJS template) | ✅ |
| WebSocket live simulation/optimization progress | ✅ |
| JWT auth + RBAC (engineer / reviewer / admin) | ✅ |
| Offline climatology data (Leh, Nyoma, Siachen) | ✅ |
| Worker threads (non-blocking Express loop) | ✅ |
| Zod validation on all routes | ✅ |
| Jest + Supertest test suite | ✅ |

---

## Prerequisites

- **Node.js 20 LTS** — `node --version` must show `v20.x.x`
- **MongoDB 7** running locally — `mongod` on default port `27017`
- No Python, no external API dependencies

---

## Quick Start

```bash
# 1. Clone and enter project
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment
copy .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET (see .env.example)

# 4. Seed offline weather station data
npm run seed

# 5. Start dev server
npm run dev
```

The API will be available at `http://localhost:5000`.

---

## Environment Variables

See [`.env.example`](.env.example):

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | `development` / `production` / `test` | `development` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/aerotwin_habitat` |
| `JWT_SECRET` | ≥ 32-char random secret for JWT signing | *(required)* |
| `JWT_EXPIRES_IN` | JWT token expiry | `7d` |
| `REPORTS_DIR` | Directory for generated PDF reports | `./reports` |
| `EXPORTS_DIR` | Directory for generated APDL `.mac` files | `./exports` |

---

## Running Tests

```bash
npm test
# or with coverage:
npm run test:coverage
```

Tests require a running MongoDB instance (uses `aerotwin_habitat_test` DB, dropped after each run).

---

## Seed Script

```bash
npm run seed
```

Loads synthetic offline hourly climatology for 3 stations (12 months × 24 hours = 288 records each):

| Station | Lat | Lon | Altitude |
|---|---|---|---|
| Leh | 34.15°N | 77.58°E | 3500 m |
| Nyoma | 33.17°N | 78.65°E | 4230 m |
| Siachen | 35.42°N | 77.11°E | 5500 m |

> ⚠️ Data is synthetic but physically plausible for Q&A purposes. Air-gapped deployment requires no external API calls.

---

## API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register user | Open |
| POST | `/api/v1/auth/login` | Login, get JWT | Open |
| GET | `/api/v1/auth/me` | Get current user | 🔒 Any |

### Shelter Configs

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/shelters` | Create config | 🔒 engineer, admin |
| GET | `/api/v1/shelters` | List all | 🔒 Any |
| GET | `/api/v1/shelters/:id` | Get by ID | 🔒 Any |
| PUT | `/api/v1/shelters/:id` | Update | 🔒 engineer, admin |
| DELETE | `/api/v1/shelters/:id` | Delete | 🔒 admin only |

### Simulation

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/simulate` | Start simulation | 🔒 engineer, admin |
| GET | `/api/v1/runs` | List runs | 🔒 Any |
| GET | `/api/v1/runs/:id` | Get result | 🔒 Any |
| GET | `/api/v1/runs/:id/report/pdf` | Download PDF | 🔒 Any |
| GET | `/api/v1/runs/:id/report/apdl` | Download `.mac` | 🔒 Any |

### Optimization (NSGA-II)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/optimize` | Start NSGA-II | 🔒 engineer, admin |
| GET | `/api/v1/optimize/:id` | Get Pareto front | 🔒 Any |

### WebSocket

```
ws://localhost:5000/ws/simulate/:runId
```

Streams events: `{type: "subscribed"}`, `{type: "progress", percent, message}`, `{type: "generation", generation, bestFitness, percent}`, `{type: "complete", ...}`, `{type: "error", message}`

---

## Example API Flow

```bash
# 1. Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Engineer","email":"jane@test.com","password":"password123","role":"engineer"}'

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@test.com","password":"password123"}' | jq -r .data.token)

# 3. Create shelter config
SHELTER_ID=$(curl -s -X POST http://localhost:5000/api/v1/shelters \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Leh Forward Post Shelter",
    "location": {"name":"Leh","lat":34.15,"lon":77.58,"altitude_m":3500},
    "geometry": {"length_m":6,"width_m":4,"height_m":3},
    "envelope": {
      "roof":    {"uValue":0.2,"thickness_m":0.1,"material":"insulated_panel"},
      "walls":   {"uValue":0.3,"thickness_m":0.08,"material":"insulated_panel"},
      "floor":   {"uValue":0.25,"thickness_m":0.08,"material":"insulated_panel"},
      "glazing": {"area_m2":2.0,"uValue":1.5,"shgc":0.4}
    },
    "pcm": {"present":true,"meltPoint_C":28,"latentHeat_kJkg":200,"mass_kg":50}
  }' | jq -r .data.config._id)

# 4. Start simulation
RUN_ID=$(curl -s -X POST http://localhost:5000/api/v1/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"shelterConfigId\":\"$SHELTER_ID\",\"stepMinutes\":1,\"stationName\":\"Leh\"}" \
  | jq -r .data.runId)

# 5. Poll for result
curl http://localhost:5000/api/v1/runs/$RUN_ID \
  -H "Authorization: Bearer $TOKEN" | jq .data.run.status

# 6. Download PDF
curl -O http://localhost:5000/api/v1/runs/$RUN_ID/report/pdf \
  -H "Authorization: Bearer $TOKEN"
```

---

## Architecture

```
Client (React / curl)
  │ REST + WebSocket
  ▼
Express API (src/app.js + routes/)
  │
  ├── /api/v1/auth       → auth.controller.js
  ├── /api/v1/shelters   → shelter.controller.js
  ├── /api/v1/simulate   → simulate.controller.js → Worker Thread
  ├── /api/v1/runs       → runs.controller.js
  ├── /api/v1/optimize   → optimize.controller.js → Worker Thread
  └── /ws/simulate/:id   → simulateSocket.js (WebSocket)

Service Layer (src/services/)
  ├── thermalEngine.service.js  — 1D FD solver + PCM
  ├── solar.service.js          — Ineichen/Haurwitz clear-sky
  ├── optimizer.service.js      — NSGA-II (hand-rolled)
  ├── flirStealth.service.js    — IR signature scoring
  ├── logistics.service.js      — Mi-17 / ALS audit
  ├── report.service.js         — pdfkit PDF
  └── apdlExport.service.js     — EJS → ANSYS .mac

MongoDB (Mongoose Models)
  ├── ShelterConfig
  ├── SimulationRun
  ├── OptimizationRun
  ├── WeatherStation  (pre-seeded)
  ├── Report
  └── User
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/         db.js, env.js
│   ├── models/         ShelterConfig, SimulationRun, OptimizationRun, WeatherStation, Report, User
│   ├── services/       thermalEngine, solar, optimizer, flirStealth, logistics, report, apdlExport
│   ├── controllers/    auth, shelter, simulate, runs, optimize, report
│   ├── routes/         auth, shelter, simulate, runs, optimize
│   ├── middleware/     auth.js, validate.js, errorHandler.js
│   ├── websocket/      simulateSocket.js
│   ├── workers/        simulate.worker.js, optimize.worker.js
│   ├── utils/          constants.js, numeric.js
│   ├── seed/           weatherStationSeed.js
│   ├── templates/      shelter.mac.ejs
│   ├── app.js
│   └── server.js
├── tests/
│   ├── shelter.routes.test.js
│   ├── thermalEngine.test.js
│   ├── optimizer.test.js
│   └── solar.test.js
├── reports/            (generated PDFs — gitignored)
├── exports/            (generated .mac files — gitignored)
├── .env.example
├── package.json
└── README.md
```

---

## Design Notes

### NSGA-II Performance (Surrogate Mode)
The optimizer uses a **fast surrogate mode** during genetic evaluation:
- 3 nodes per layer (vs 5 in full simulation)
- 5-minute timestep (vs 1-minute in full simulation)

This enables ~50ms per individual evaluation, making 20 generations × 40 population = 800 evaluations feasible in well under 15 seconds. Full-resolution simulation is run separately via `/api/v1/simulate`.

### Air-Gap Compliance
Zero external network calls at runtime:
- Solar irradiance: computed from astronomical formulas (Spencer 1971, Ineichen-Perez)
- Ambient temperature: loaded from pre-seeded MongoDB climatology (see seed script)
- PDF and APDL generation: pure Node.js (pdfkit + EJS), no browser needed

### PCM Modeling
Uses the **apparent heat capacity method** (not explicit phase tracking):
```
c_eff(T) = c_sensible + L × Gaussian(T, T_melt, σ)
```
This distributes latent heat absorption/release over a narrow temperature window around the melt point, avoiding numerical instability from phase-change discontinuities.

---

*AeroTwin-Habitat | SIH26054 | CONFIDENTIAL — FOR OFFICIAL USE ONLY*
