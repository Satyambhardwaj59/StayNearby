# StayNearby

> **Your Next Home Is Closer.** — Find PGs, rooms, flats and houses near your preferred location.

StayNearby is a production-oriented rental marketplace for finding and listing **PGs, rooms,
flats, apartments, houses, hostels, co-living and independent houses**. It serves tenants, students,
working professionals, bachelors, families, couples, property owners, moderators and admins.

The project is a **two-application repository** — a Next.js frontend and an Express/TypeScript
backend — that can be installed, run, tested and deployed independently. There is **no monorepo
tooling**: each app has its own `package.json`, `package-lock.json` and environment file.

> **Tooling constraints (by design):** npm only. No Docker, no pnpm, no Turborepo, no PWA and no
> service workers.

---

## Table of contents

- [Project overview](#project-overview)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Environment variables](#environment-variables)
- [MongoDB setup](#mongodb-setup)
- [Redis setup](#redis-setup)
- [Frontend setup](#frontend-setup)
- [Backend setup](#backend-setup)
- [How to run both apps](#how-to-run-both-apps)
- [Testing](#testing)
- [API documentation](#api-documentation)
- [Deployment overview](#deployment-overview)

---

## Project overview

The platform covers the full rental lifecycle:

- **Discovery** — SEO-first public search, city/locality/landing pages, map results, nearby and
  radius search, favourites and saved searches.
- **Listing** — owners create multi-step listings with photos, location privacy and a
  draft → review → published lifecycle.
- **Engagement** — realtime chat (Socket.IO), visit requests, reviews, reports and in-app / email /
  SMS notifications.
- **Trust & safety** — email/phone verification, OTP, moderation queues, RBAC and audit trails.
- **Operations** — Redis-backed rate limiting and caching, BullMQ background jobs, structured
  logging, health probes and graceful shutdown.

Public pages are server-rendered and crawlable; dashboard and transactional views are private and
marked `noindex`.

---

## Tech stack

**Frontend (`frontend/`)**

| Area        | Choice                                                             |
| ----------- | ----------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router) + React 19                                 |
| Language    | TypeScript 5.7 (strict)                                            |
| Styling     | Tailwind CSS 3.4, `tailwindcss-animate`, CVA, `clsx`, `tailwind-merge` |
| Data/state  | TanStack Query 5, Zustand 5                                        |
| Forms       | React Hook Form 7 + `@hookform/resolvers` + Zod 3                   |
| Icons/Map   | `lucide-react`, optional `maplibre-gl`                             |
| Testing     | Vitest 2                                                           |
| Lint        | ESLint 9 + `@next/eslint-plugin-next` + `eslint-plugin-jsx-a11y`    |

**Backend (`backend/`)**

| Area         | Choice                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| Runtime      | Node.js ≥ 20.11, TypeScript 5.7 (strict), Express 4                    |
| Database     | MongoDB + Mongoose 8                                                   |
| Cache/Queues | Redis (`ioredis` 5), BullMQ 5                                          |
| Realtime     | Socket.IO 4 + `@socket.io/redis-adapter`                               |
| Validation   | Zod 3                                                                  |
| Security     | Helmet, CORS allowlist, CSRF origin checks, `hpp`, rate limiting, Argon2id/bcrypt |
| Logging      | Pino + `pino-http`                                                     |
| Auth/Email   | `jsonwebtoken`, `nodemailer`, OTP providers                            |
| Media        | Multer, `image-size`, Cloudinary / S3 / local storage                  |
| Docs         | OpenAPI 3.1 via `swagger-ui-express` (`/docs`)                          |
| Testing      | Vitest 2 + Supertest                                                   |

---

## Architecture

### Repository layout

```text
staynearby/
├── frontend/                # Next.js app (independently deployable)
├── backend/                 # Express API, Socket.IO, BullMQ workers
├── .gitignore
└── README.md
```

### Backend request flow

```text
Route → Middleware → Controller → Service → Repository → Model → MongoDB
```

Middleware order is security-relevant and fixed in `backend/src/app.ts`:

```text
request id → access log → security headers → CORS → body limits
→ sanitisation → CSRF → rate limit → routes → 404 → error handler
```

- **Controllers** are thin and only translate HTTP ↔ service calls.
- **Services** hold business rules (authorization, ownership, state transitions).
- **Repositories** own all database access and use indexed queries.
- **Background work** (email/SMS, notifications, saved-search matching, listing expiry, cleanup,
  analytics) runs in **BullMQ** workers, never inline in a request.
- **Realtime** runs through **Socket.IO**, sharing the same session/authorization rules as REST.

### Frontend architecture

- **App Router with Server Components by default**; Client Components only where interactivity
  requires them.
- All API access goes through a typed client in `frontend/src/lib/api` — pages and feature modules
  never call `fetch` directly.
- SEO is centralised in `frontend/src/lib/seo` (metadata, canonical URLs, structured data,
  breadcrumbs, sitemap).
- Shared, validated configuration lives in `frontend/src/lib/config/env.ts`; only `NEXT_PUBLIC_*`
  values are readable by the browser.

---

## Requirements

- **Node.js ≥ 20.11.0** (both apps declare this in `engines`)
- **npm** (ships with Node)
- **MongoDB** instance (local or Atlas)
- **Redis** instance (local or managed) — required for full functionality; see
  [Redis setup](#redis-setup) for the degraded local option
- Git

---

## Environment variables

Each app ships a template. Copy it and fill in real values. **Never commit real `.env` files** —
`.gitignore` excludes them but keeps `*.example` tracked.

| File                 | Copy to             |
| -------------------- | ------------------- |
| `backend/.env.example`  | `backend/.env`      |
| `frontend/.env.example` | `frontend/.env.local` |

### Backend (most important)

| Variable                                       | Default                                            | Notes |
| ---------------------------------------------- | -------------------------------------------------- | ----- |
| `NODE_ENV`                                     | `development`                                        | `development` \| `test` \| `production` |
| `PORT`                                         | `5000`                                               | API port |
| `CORS_ORIGINS`                                 | `http://localhost:3000`                              | Comma-separated allowlist |
| `API_PUBLIC_URL`                               | `http://localhost:5000`                              | Used in emails and OpenAPI servers |
| `FRONTEND_URL`                                 | `http://localhost:3000`                              | Public site origin |
| `MONGODB_URI`                                  | — (**required**)                                     | e.g. `mongodb://127.0.0.1:27017/rental_marketplace` |
| `REDIS_URL`                                    | `redis://127.0.0.1:6379`                             | Redis connection string |
| `REDIS_REQUIRED`                               | `true`                                               | `false` = degraded mode (set `false` for local dev without Redis) |
| `JWT_ACCESS_SECRET`                            | — (**required**, ≥ 32 chars)                         | Signing secret |
| `JWT_REFRESH_SECRET`                           | — (**required**, ≥ 32 chars, must differ)            | Refresh signing secret |
| `TOKEN_HASH_SECRET`                            | — (**required**, ≥ 32 chars)                         | Hashes tokens/OTPs at rest |
| `ACCESS_TOKEN_TTL`                             | `15m`                                                | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS`                       | `30`                                                 | Refresh token lifetime |
| `COOKIE_DOMAIN`, `COOKIE_SECURE`               | `` / `false`                                         | `COOKIE_SECURE=true` in production |
| `PASSWORD_HASH_ALGO`                           | `argon2id`                                           | `argon2id` \| `bcrypt` |
| `STORAGE_DRIVER`                               | `local`                                              | `local` \| `cloudinary` \| `s3` |
| `EMAIL_DRIVER`, `SMS_DRIVER`                   | `console`                                            | `console` \| `smtp`/`api` \| `api` |
| `MAP_PROVIDER`                                 | `nominatim`                                          | Only `nominatim` is implemented out of the box |
| `RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_MAX_REQUESTS` | `60` / `120`                              | Global limiter |
| `TRUST_PROXY`                                  | `0`                                                  | Trusted proxy hops |
| `LOG_LEVEL`, `SERVICE_NAME`                    | `info` / `rental-api`                                | Pino logging |
| `MAX_UPLOAD_MB`, `MAX_IMAGES_PER_PROPERTY`     | `8` / `20`                                           | Upload limits |

See `backend/.env.example` for the complete list (storage, email, SMS, maps, observability).

> The backend validates its environment at startup with Zod and **refuses to boot on invalid
> configuration**. In production, secrets must be ≥ 48 characters, `COOKIE_SECURE` must be `true`
> and wildcard CORS origins are rejected. Generate secrets with:
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### Frontend

Browser-safe values only — never put secrets in `NEXT_PUBLIC_*`.

| Variable                        | Default                                          |
| ------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`           | `http://localhost:5000/api/v1`                   |
| `NEXT_PUBLIC_SITE_URL`          | `http://localhost:3000`                          |
| `NEXT_PUBLIC_SOCKET_URL`        | `http://localhost:5000`                          |
| `NEXT_PUBLIC_MAP_TILE_URL`      | OpenStreetMap raster tile template               |
| `NEXT_PUBLIC_MAP_ATTRIBUTION`   | `© OpenStreetMap contributors`                   |

---

## MongoDB setup

The backend connects with a single pooled Mongoose connection (`backend/src/infrastructure/database/mongoose.ts`).

1. **Install MongoDB** (Community Server 7/8) or create a free Atlas cluster.
2. **Run it locally** with the default data directory, or start `mongod` from a terminal.
3. **Set the connection string** in `backend/.env`:

   ```bash
   MONGODB_URI=mongodb://127.0.0.1:27017/rental_marketplace
   ```

4. **Indexes:**
   - In development, `autoIndex` is enabled so schema indexes (including `2dsphere` geo indexes) are
     created automatically.
   - In production `autoIndex` is disabled. Apply indexes explicitly during deployment:

     ```bash
     cd backend
     npm run build
     node dist/scripts/ensureIndexes.js
     ```

5. **Seed sample data (development only):**

   ```bash
   cd backend
   npm run seed
   ```

   The seed refuses to run against production. It creates the geography taxonomy, one account per
   role and example listings. Seeded credentials (password `DevPassw0rd!`):

   | Role        | Email                  |
   | ----------- | ---------------------- |
   | Admin       | `admin@example.com`    |
   | Moderator   | `moderator@example.com`|
   | Owner       | `owner@example.com`    |
   | Owner       | `owner2@example.com`   |
   | Tenant      | `tenant@example.com`   |

---

## Redis setup

Redis powers **caching, Redis-backed rate limiting, OTP throttling, BullMQ queues and the Socket.IO
pub/sub adapter** for horizontal scaling.

1. **Install Redis** (6/7) or provision a managed instance.
2. **Run it locally** (`redis-server`, default port `6379`).
3. **Set the connection string** in `backend/.env`:

   ```bash
   REDIS_URL=redis://127.0.0.1:6379
   ```

4. **Degraded mode (optional, local only):** with `REDIS_REQUIRED=false` the API still boots when
   Redis is unreachable — caching, queues and Socket.IO fan-out are disabled and `/health/ready`
   reports the degraded state. Background jobs are skipped with a warning. For a full local
   environment, keep `REDIS_REQUIRED=true` and run Redis.

---

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local   # then edit NEXT_PUBLIC_* values
```

See [`frontend/README.md`](frontend/README.md) for the full guide.

## Backend setup

```bash
cd backend
npm install
cp .env.example .env         # then fill required values (MongoDB URI + secrets)
```

See [`backend/README.md`](backend/README.md) for the full guide.

---

## How to run both apps

1. **Start MongoDB** and **Redis** (see above).

2. **Terminal A — backend** (http://localhost:5000):

   ```bash
   cd backend
   npm run dev
   ```

3. **Terminal B — frontend** (http://localhost:3000):

   ```bash
   cd frontend
   npm run dev
   ```

4. Confirm the API is healthy:

   ```bash
   curl http://localhost:5000/health/ready
   ```

   Open `http://localhost:3000` for the site and `http://localhost:5000/docs` for the API docs.

### First-run checklist

```text
Clone → Install (both apps) → Configure .env → Start MongoDB + Redis
→ Start backend → Start frontend → Run tests
```

---

## Testing

Both apps use **Vitest**. `npm test` runs the suite once; `npm run test:watch` re-runs on change.

**Backend** (`backend/tests/`):

- Unit tests — geographic helpers, pagination, password hashing, property search building, slugs,
  validation.
- Integration tests — the HTTP middleware pipeline (security headers, validation, CSRF, error
  envelope, 404s, health) via Supertest against `createApp()`.
- The test environment is configured in `backend/tests/setup.ts` and sets `REDIS_REQUIRED=false`;
  the suite is written **not** to require MongoDB or Redis, so it runs in CI without services.

```bash
cd backend
npm test
```

**Frontend** (`frontend/`):

```bash
cd frontend
npm test
```

**Load testing (backend):** a dependency-free harness measures throughput and latency percentiles on
public read endpoints:

```bash
cd backend
npm run loadtest -- --url http://localhost:5000 --requests 2000 --concurrency 50
npm run loadtest -- --endpoint "/api/v1/search?city=patna&maxRent=15000"
```

Record `p50/p95/p99`, error rate and hardware next to any scalability claim — do not assert capacity
without measurement.

---

## API documentation

- **Base URL:** `/api/v1` (versioned)
- **Interactive docs (Swagger UI):** `http://localhost:5000/docs`
- **OpenAPI 3.1 JSON:** `http://localhost:5000/openapi.json`
- Docs are served in development; in production they are disabled unless `ENABLE_API_DOCS=true`.

**Success envelope**

```json
{ "success": true, "data": {}, "message": "Success", "meta": {} }
```

**Error envelope**

```json
{ "success": false, "error": { "code": "PROPERTY_NOT_FOUND", "message": "Property not found" } }
```

`meta` carries pagination (`page`/`limit`/`total` for offset lists, `nextCursor`/`hasMore` for
cursor lists) and per-endpoint counters. Errors always include a machine-readable `error.code` and a
`requestId`; stack traces are never returned.

**Conventions**

- Authentication uses httpOnly access + refresh cookies; `Authorization: Bearer <token>` is also
  accepted. Refresh tokens rotate on every use and reuse revokes the session family.
- List endpoints accept either `page`/`limit` (max 60) or `cursor`/`limit`.
- Rate limits are applied per route (strictest on auth/OTP).

The **complete endpoint reference** lives in [`backend/README.md`](backend/README.md#rest-api).

---

## Deployment overview

The two apps deploy independently. There is no Docker requirement — build artifacts are plain Node
processes / Next.js output.

### Backend

```bash
cd backend
npm ci
npm run build          # tsc → dist/
node dist/scripts/ensureIndexes.js   # apply indexes (autoIndex is off in production)
npm start              # node dist/server.js
```

- Runs **stateless**, so scale horizontally behind a load balancer/CDN. Redis provides the shared
  rate-limit store and the Socket.IO adapter for multi-instance fan-out.
- Set `TRUST_PROXY` to the number of proxy hops so client IPs and rate limits are correct.
- Health probes: `GET /health/live` (liveness) and `GET /health/ready` (readiness, checks
  MongoDB + Redis).
- Graceful shutdown drains the HTTP server, BullMQ workers, Socket.IO, Redis and MongoDB on
  `SIGTERM`/`SIGINT` within a 15-second budget.
- Production hardening: `NODE_ENV=production`, strong secrets, `COOKIE_SECURE=true`, explicit
  `CORS_ORIGINS`, `EMAIL_DRIVER`/`STORAGE_DRIVER` pointed at real providers, and TLS termination
  upstream.

### Frontend

```bash
cd frontend
npm ci
npm run build          # next build
npm start              # next start
```

- Build once and deploy the Node server (SSR/ISR) or a compatible host.
- `NEXT_PUBLIC_*` values are baked at build time — set them in the build environment.
- Point `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SOCKET_URL` at the deployed API and configure the
  backend `CORS_ORIGINS` to include the frontend origin.

### Continuous integration

Run each app's checks independently (for example in GitHub Actions, without Docker):

```bash
# frontend and backend, separately
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Add dependency/security scanning as appropriate. The apps are separate, so their pipelines can be
independent.
