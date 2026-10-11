# StayNearby — Backend

The Express + TypeScript API for **StayNearby** (*Your Next Home Is Closer.*): a versioned REST API (`/api/v1`),
realtime chat over Socket.IO, and background processing with BullMQ. Built with MongoDB (Mongoose),
Redis and Zod validation. It is an independent application — install, run, build and deploy it on
its own.

> **Tooling:** npm only. No pnpm, no Docker.

---

## Table of contents

- [Backend stack](#backend-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Environment variables (`.env.example`)](#environment-variables-envexample)
- [MongoDB setup](#mongodb-setup)
- [Redis setup](#redis-setup)
- [Development — `npm run dev`](#development--npm-run-dev)
- [Production build — `npm run build`](#production-build--npm-run-build)
- [Serve the build — `npm run start`](#serve-the-build--npm-run-start)
- [Available scripts](#available-scripts)
- [Backend architecture](#backend-architecture)
- [REST API](#rest-api)
- [Socket.IO](#socketio)
- [BullMQ](#bullmq)
- [Security](#security)
- [Testing](#testing)
- [Common troubleshooting](#common-troubleshooting)

---

## Backend stack

- **Node.js ≥ 20.11** + **TypeScript 5.7** (strict), **Express 4**
- **MongoDB** + **Mongoose 8**
- **Redis** (`ioredis` 5) for cache, rate limiting, OTP throttling and Socket.IO fan-out
- **BullMQ 5** for background jobs
- **Socket.IO 4** (+ `@socket.io/redis-adapter`)
- **Zod 3** for validation, **Pino** + `pino-http` for logging
- **Helmet**, CORS, `hpp`, compression, cookie-parser, `express-rate-limit` + `rate-limit-redis`
- Auth: `jsonwebtoken`, `argon2` (argon2id, preferred) with `bcryptjs` fallback, OTP via
  `nodemailer`/SMS providers
- Media: `multer`, `image-size`, Cloudinary / AWS S3 / local storage
- Docs: OpenAPI 3.1 via `swagger-ui-express`
- Tests: **Vitest 2** + **Supertest**

Refer to `package.json` for exact versions.

---

## Requirements

- **Node.js ≥ 20.11.0** (declared in `engines`)
- **npm**
- **MongoDB** (local or Atlas)
- **Redis** (local or managed)

---

## Installation

```bash
cd backend
npm install
cp .env.example .env
```

Now fill in `backend/.env` — at minimum `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
and `TOKEN_HASH_SECRET` (the app validates configuration at startup and will not boot without them).

---

## Environment variables (`.env.example`)

**Required (no default):**

| Variable             | Constraint                                             |
| -------------------- | ------------------------------------------------------ |
| `MONGODB_URI`        | Any non-empty connection string                        |
| `JWT_ACCESS_SECRET`  | ≥ 32 chars (≥ 48 and non-placeholder in production)    |
| `JWT_REFRESH_SECRET` | ≥ 32 chars, must differ from `JWT_ACCESS_SECRET`       |
| `TOKEN_HASH_SECRET`  | ≥ 32 chars (≥ 48 and non-placeholder in production)    |

**Runtime / datastores / auth:**

| Variable                                 | Default                              |
| ---------------------------------------- | ------------------------------------ |
| `NODE_ENV`                               | `development`                        |
| `PORT`                                   | `5000`                               |
| `CORS_ORIGINS`                           | `http://localhost:3000`              |
| `API_PUBLIC_URL`                         | `http://localhost:5000`              |
| `FRONTEND_URL`                           | `http://localhost:3000`              |
| `REDIS_URL`                              | `redis://127.0.0.1:6379`             |
| `REDIS_REQUIRED`                         | `true`                               |
| `ACCESS_TOKEN_TTL`                       | `15m`                                |
| `REFRESH_TOKEN_TTL_DAYS`                 | `30`                                 |
| `COOKIE_DOMAIN` / `COOKIE_SECURE`        | `` / `false`                         |
| `PASSWORD_HASH_ALGO`                     | `argon2id` (`argon2id` \| `bcrypt`)  |

**Integrations:**

| Variable                                                       | Default        |
| -------------------------------------------------------------- | -------------- |
| `STORAGE_DRIVER`                                               | `local`        |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | — (`cloudinary` driver) |
| `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_ENDPOINT` / `S3_PUBLIC_BASE_URL` | — (`s3` driver) |
| `EMAIL_DRIVER`                                                 | `console` (`console` \| `smtp` \| `api`) |
| `EMAIL_FROM`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD`, `EMAIL_API_KEY` | `StayNearby <no-reply@example.com>`, `587`, … |
| `SMS_DRIVER`                                                   | `console` (`console` \| `api`) |
| `SMS_API_KEY`, `SMS_SENDER_ID`                                 | —              |
| `MAP_PROVIDER`                                                 | `nominatim`    |
| `MAP_PROVIDER_KEY`                                             | — (`google`)   |
| `MAP_DEFAULT_CENTER_LAT` / `MAP_DEFAULT_CENTER_LNG`            | `25.5941` / `85.1376` |

**Limits / observability:**

| Variable                              | Default        |
| ------------------------------------- | -------------- |
| `RATE_LIMIT_WINDOW_SECONDS`           | `60`           |
| `RATE_LIMIT_MAX_REQUESTS`             | `120`          |
| `TRUST_PROXY`                         | `0`            |
| `LOG_LEVEL`                           | `info`         |
| `SERVICE_NAME`                        | `rental-api`   |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | —              |
| `SENTRY_DSN`                          | —              |
| `MAX_UPLOAD_MB`                       | `8`            |
| `MAX_IMAGES_PER_PROPERTY`             | `20`           |

Notes:

- The env schema is validated with Zod in `src/config/env.ts` at import time. Conditional rules
  apply (e.g. Cloudinary/S3 credentials required when their driver is selected; `EMAIL_SMTP_HOST`
  required when `EMAIL_DRIVER=smtp`). Production enforces strong secrets, `COOKIE_SECURE=true` and
  no wildcard CORS origins.
- Only `nominatim` has a working map adapter; `google`/`mapbox` are provider seams that throw until
  implemented.
- `OTEL_EXPORTER_OTLP_ENDPOINT` and `SENTRY_DSN` are accepted for future observability wiring.
- Generate secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

---

## MongoDB setup

1. Install MongoDB Community Server (7/8) or create an Atlas cluster.
2. Start `mongod` locally (default `127.0.0.1:27017`).
3. Set the connection string:

   ```bash
   MONGODB_URI=mongodb://127.0.0.1:27017/rental_marketplace
   ```

`src/infrastructure/database/mongoose.ts` centralises the connection: pooling (`maxPoolSize: 20`),
timeouts, `sanitizeFilter` (NoSQL-operator defence), `strictQuery`, and `autoIndex` enabled only
outside production.

**Indexes**

- Development: created automatically on boot (`autoIndex`).
- Production: apply explicitly, since `autoIndex` is off:

  ```bash
  npm run build
  node dist/scripts/ensureIndexes.js   # syncs every model's declared indexes (incl. 2dsphere)
  ```

**Seed data (development only; refuses to run in production):**

```bash
npm run seed
```

Creates the geography taxonomy, one account per role and example listings (Patna + Bengaluru).
Seeded password is `DevPassw0rd!` for `admin@example.com`, `moderator@example.com`,
`owner@example.com`, `owner2@example.com`, `tenant@example.com`.

---

## Redis setup

Redis is used for caching, distributed rate limiting, OTP attempt throttling, BullMQ queues and the
Socket.IO pub/sub adapter (horizontal scaling).

1. Install Redis (6/7) or provision a managed instance.
2. Start `redis-server` (default `6379`).
3. Set:

   ```bash
   REDIS_URL=redis://127.0.0.1:6379
   ```

**Degraded mode:** with `REDIS_REQUIRED=false` (only recommended for local development) the API
still boots when Redis is unreachable. Caching, queues and Socket.IO fan-out are disabled, the
in-memory rate-limit store is used as a per-instance fallback, background jobs are skipped with a
warning, and `/health/ready` reports the degraded state. With `REDIS_REQUIRED=true` (default) a
missing Redis prevents boot outside tests.

---

## Development — `npm run dev`

```bash
npm run dev
```

Runs `tsx watch src/server.ts`. The bootstrap connects MongoDB and Redis, creates the Express app,
starts the HTTP server, initialises Socket.IO, starts BullMQ workers and registers graceful-shutdown
hooks. The server logs its listening port on startup.

---

## Production build — `npm run build`

```bash
npm run build
```

Runs `tsc -p tsconfig.build.json`, compiling `src/` to `dist/` (tests excluded).

## Serve the build — `npm run start`

```bash
npm run build
npm start
```

Runs `node dist/server.js`. Apply indexes once per deployment (`node dist/scripts/ensureIndexes.js`)
before starting.

---

## Available scripts

| Script               | Command                                              | Description                          |
| -------------------- | ---------------------------------------------------- | ------------------------------------ |
| `npm run dev`        | `tsx watch src/server.ts`                            | Development server (hot reload)      |
| `npm run build`      | `tsc -p tsconfig.build.json`                         | Compile to `dist/`                   |
| `npm start`          | `node dist/server.js`                                | Run the compiled server              |
| `npm test`           | `vitest run`                                         | Run tests once                       |
| `npm run test:watch` | `vitest`                                             | Run tests in watch mode              |
| `npm run lint`       | `eslint "src/**/*.ts" "tests/**/*.ts"`               | Lint                                 |
| `npm run lint:fix`   | `eslint ... --fix`                                   | Lint and autofix                     |
| `npm run typecheck`  | `tsc -p tsconfig.json --noEmit`                      | Type check (includes tests)          |
| `npm run format`     | `prettier --write "src/**/*.ts" "tests/**/*.ts"`     | Format                               |
| `npm run seed`       | `tsx src/scripts/seed.ts`                            | Seed development data                |
| `npm run loadtest`   | `tsx src/scripts/loadTest.ts`                        | Load-test public read endpoints      |

---

## Backend architecture

### Layering

```text
Route → Middleware → Controller → Service → Repository → Model → MongoDB
```

- **Controllers** are thin: they read validated input and call a service.
- **Services** own business rules, authorization/ownership checks and state transitions.
- **Repositories** own database access with indexed queries (never filter whole collections in JS).
- **Models** are Mongoose schemas with unique/compound/geospatial indexes.

### Directory layout

```text
backend/
├── src/
│   ├── modules/               # feature modules (route → controller → service → repository → model)
│   │   ├── auth/ users/ properties/ property-search/ locations/
│   │   ├── favorites/ saved-searches/ conversations/ messages/
│   │   ├── visits/ reviews/ notifications/ reports/ admin/
│   │   └── health/
│   ├── infrastructure/        # database, redis, storage, email, sms, maps, queue
│   ├── middleware/            # requestContext, validate, authenticate, authorize,
│   │                          # rateLimit, sanitize, csrf, upload, errorHandler
│   ├── jobs/                  # job handler registry + worker bootstrap
│   ├── sockets/               # Socket.IO server + emitter
│   ├── config/                # env schema, OpenAPI document
│   ├── shared/                # errors, logger, pagination, validation, response, utils, lifecycle
│   ├── scripts/               # seed, ensureIndexes, loadTest
│   ├── app.ts                 # Express application factory (middleware pipeline)
│   └── server.ts              # process entrypoint, graceful shutdown
└── tests/                     # unit + integration tests
```

### Request pipeline (`src/app.ts`)

```text
request id → access log → helmet → CORS → body limits → hpp
→ sanitize → CSRF → global rate limit → health → static uploads (local)
→ OpenAPI docs → /api/v1 routes → 404 → error handler
```

`/health`, `/health/live` and `/health/ready` are mounted at the root. `/static/uploads` is served
only when `STORAGE_DRIVER=local`. The API mounts at `/api/v1`.

### Response envelopes

Success:

```json
{ "success": true, "data": {}, "message": "Success", "meta": {} }
```

Error:

```json
{ "success": false, "error": { "code": "PROPERTY_NOT_FOUND", "message": "Property not found", "requestId": "…" } }
```

All responses go through `shared/response`; errors through `shared/errors` → `errorHandler` (which
never leaks stack traces and logs with the request correlation id).

---

## REST API

Base URL: **`/api/v1`**. Interactive docs at **`/docs`** and OpenAPI JSON at **`/openapi.json`**
(disabled in production unless `ENABLE_API_DOCS=true`).

Auth column: **public** = no auth; **auth** = authenticated; role lists the permitted roles.

### Auth — `/auth`

| Method | Path                        | Auth  | Description |
| ------ | --------------------------- | ----- | ----------- |
| POST   | `/auth/register`            | public | Register a `TENANT` or `OWNER` |
| POST   | `/auth/login`               | public | Email + password login (sets cookies) |
| POST   | `/auth/refresh`             | public | Rotate refresh token, issue new access token |
| POST   | `/auth/logout`              | auth  | Revoke current session |
| POST   | `/auth/logout-all`          | auth  | Revoke all sessions |
| GET    | `/auth/me`                  | auth  | Current principal |
| GET    | `/auth/sessions`            | auth  | List active sessions |
| POST   | `/auth/sessions/revoke`     | auth  | Revoke a specific session |
| POST   | `/auth/email/verify/request`| public | Send email verification code |
| POST   | `/auth/email/verify`        | public | Confirm email verification code |
| POST   | `/auth/phone/verify/request`| auth  | Send phone verification code |
| POST   | `/auth/phone/verify`        | auth  | Confirm phone verification code |
| POST   | `/auth/password/forgot`     | public | Request password reset code |
| POST   | `/auth/password/reset`      | public | Reset password with a single-use code |
| POST   | `/auth/password/change`     | auth  | Change password (keeps this device signed in) |

### Users — `/users`

| Method | Path                 | Auth | Description |
| ------ | -------------------- | ---- | ----------- |
| GET    | `/users/me`          | auth | Private profile |
| PATCH  | `/users/me`          | auth | Update profile (allowlisted fields) |
| GET    | `/users/:userId`     | public | Public profile |
| GET    | `/users/admin/list`  | ADMIN | List users (admin) |
| PATCH  | `/users/admin/:userId` | ADMIN | Update user role/status (admin) |

### Properties — `/properties`

| Method | Path                                   | Auth   | Description |
| ------ | -------------------------------------- | ------ | ----------- |
| GET    | `/properties/mine`                     | OWNER, ADMIN | Owner's listings |
| GET    | `/properties/mine/dashboard`           | OWNER, ADMIN | Owner dashboard counters |
| POST   | `/properties`                          | OWNER, ADMIN | Create a draft listing |
| GET    | `/properties/nearby`                   | public | Nearby published listings |
| GET    | `/properties/:slug`                    | public | Public listing detail (privacy-filtered) |
| GET    | `/properties/id/:propertyId`           | auth   | Owner view of a listing |
| PATCH  | `/properties/id/:propertyId`           | OWNER, ADMIN | Update a listing |
| POST   | `/properties/id/:propertyId/submit`    | OWNER, ADMIN | Submit draft for review |
| POST   | `/properties/id/:propertyId/delist`    | OWNER, ADMIN | Unpublish |
| POST   | `/properties/id/:propertyId/mark-rented` | OWNER, ADMIN | Mark as rented |
| POST   | `/properties/id/:propertyId/renew`     | OWNER, ADMIN | Renew an expiring listing |
| POST   | `/properties/id/:propertyId/reserve`   | TENANT | Reserve a listing (atomic, first writer wins) |
| POST   | `/properties/id/:propertyId/release`   | OWNER, ADMIN | Release a reservation |
| POST   | `/properties/id/:propertyId/images`    | OWNER, ADMIN | Upload photos (`multipart/form-data`, field `images`) |
| DELETE | `/properties/id/:propertyId/images`    | OWNER, ADMIN | Delete a photo |
| PATCH  | `/properties/id/:propertyId/images`    | OWNER, ADMIN | Reorder photos / set cover |
| POST   | `/properties/id/:propertyId/moderate`  | MODERATOR, ADMIN | Approve or reject a listing |
| POST   | `/properties/id/:propertyId/suspend`   | MODERATOR, ADMIN | Suspend a listing |

### Search — `/search`

| Method | Path               | Auth   | Description |
| ------ | ------------------ | ------ | ----------- |
| GET    | `/search`          | public | Search published listings (indexed filters, shareable URL params) |
| GET    | `/search/map`      | public | Map markers for the current filters |
| GET    | `/search/landing`  | public | Rent statistics + internal links for SEO landing pages |

Filters include `city`, `locality`, `landmark`, `college`, `office`, `q`, `type`, `room`, `bhk`,
`tenant`, `furnishing`, `amenities`, `minRent`, `maxRent`, `maxDeposit`, `availability`, `moveIn`,
`verifiedOnly`, `latitude`/`longitude`/`radiusMeters`, map bounds (`minLatitude`/`maxLatitude`/
`minLongitude`/`maxLongitude`), `sort` (`relevance`, `newest`, `price_asc`, `price_desc`,
`distance`, `popular`) and `page`/`limit`.

### Locations — `/locations`

| Method | Path                                        | Auth   | Description |
| ------ | ------------------------------------------- | ------ | ----------- |
| GET    | `/locations/suggest`                        | public | Place autocomplete (city, locality, landmark, college, office) |
| GET    | `/locations/geocode`                        | public | Forward geocoding via the configured MapProvider |
| GET    | `/locations/reverse`                        | public | Reverse geocoding |
| GET    | `/locations/nearby`                         | public | Nearby landmarks/colleges/offices |
| GET    | `/locations/cities`                         | public | Cities with published listings |
| GET    | `/locations/cities/:city`                   | public | City detail |
| GET    | `/locations/cities/:city/localities/:locality` | public | Locality detail |

### Favorites — `/favorites` (authenticated)

| Method | Path                    | Description |
| ------ | ----------------------- | ----------- |
| GET    | `/favorites`            | List saved listings (offset paginated) |
| POST   | `/favorites/:propertyId`| Save a listing (idempotent) |
| DELETE | `/favorites/:propertyId`| Remove a saved listing |

### Saved searches — `/saved-searches` (authenticated)

| Method | Path                          | Description |
| ------ | ----------------------------- | ----------- |
| GET    | `/saved-searches`             | List saved searches |
| POST   | `/saved-searches`             | Save a search (notified on new matches) |
| PATCH  | `/saved-searches/:savedSearchId` | Update notification preferences |
| DELETE | `/saved-searches/:savedSearchId` | Delete a saved search |

### Conversations — `/conversations` (authenticated)

| Method | Path                                 | Description |
| ------ | ------------------------------------ | ----------- |
| GET    | `/conversations`                     | Inbox (cursor paginated) |
| GET    | `/conversations/unread-count`        | Unread total |
| POST   | `/conversations`                     | Start/resume a conversation about a listing |
| GET    | `/conversations/:conversationId`     | Conversation detail (participants only) |
| POST   | `/conversations/:conversationId/block` | Block a conversation |
| POST   | `/conversations/:conversationId/archive` | Archive |
| POST   | `/conversations/:conversationId/unarchive` | Unarchive |

### Messages — `/messages` (authenticated)

| Method | Path                                        | Description |
| ------ | ------------------------------------------- | ----------- |
| GET    | `/messages/:conversationId`                 | Message history (cursor/limit) |
| POST   | `/messages/:conversationId`                 | Send a message (REST fallback for Socket.IO) |
| POST   | `/messages/:conversationId/image`           | Upload a message image (`multipart/form-data`, field `images`) |
| POST   | `/messages/:conversationId/read`            | Mark specific messages read |
| POST   | `/messages/:conversationId/read-all`        | Mark the conversation read |
| POST   | `/messages/:conversationId/:messageId/report` | Report a message |

### Visits — `/visits` (authenticated)

| Method | Path               | Description |
| ------ | ------------------ | ----------- |
| POST   | `/visits`          | Request a property visit |
| GET    | `/visits/mine`     | Visits I requested |
| GET    | `/visits/received` | Visits on my listings |
| GET    | `/visits/:visitId` | Visit detail (participants only) |
| PATCH  | `/visits/:visitId` | Accept / reject / reschedule / complete / cancel |

### Reviews — `/reviews`

| Method | Path                          | Auth   | Description |
| ------ | ----------------------------- | ------ | ----------- |
| GET    | `/reviews/moderation`         | MODERATOR, ADMIN | Moderation queue |
| PATCH  | `/reviews/moderation/:reviewId` | MODERATOR, ADMIN | Moderate a review |
| GET    | `/reviews/property/:propertyId` | public | Published reviews + rating summary |
| GET    | `/reviews/mine`               | auth   | My reviews |
| POST   | `/reviews`                    | auth   | Review a property (eligibility enforced) |
| PATCH  | `/reviews/:reviewId`          | auth   | Update own review |
| DELETE | `/reviews/:reviewId`          | auth   | Delete own review |

### Notifications — `/notifications` (authenticated)

| Method | Path                          | Description |
| ------ | ----------------------------- | ----------- |
| GET    | `/notifications`              | Feed (cursor paginated) |
| GET    | `/notifications/unread-count` | Unread counter |
| POST   | `/notifications/read-all`     | Mark all read |
| POST   | `/notifications/:notificationId/read` | Mark one read |
| DELETE | `/notifications/:notificationId` | Delete a notification |

### Reports — `/reports` (authenticated)

| Method | Path                        | Description |
| ------ | --------------------------- | ----------- |
| GET    | `/reports/moderation`       | Moderation queue (MODERATOR, ADMIN) |
| PATCH  | `/reports/moderation/:reportId` | Update report status (MODERATOR, ADMIN) |
| POST   | `/reports`                  | Report a property, user, message or review |
| GET    | `/reports/mine`             | My reports and their audit trail |
| GET    | `/reports/:reportId`        | Report detail |

### Admin — `/admin` (authenticated)

| Method | Path                     | Auth | Description |
| ------ | ------------------------ | ---- | ----------- |
| GET    | `/admin/overview`        | MODERATOR, ADMIN | Platform counters |
| GET    | `/admin/users/stats`     | ADMIN | User statistics |
| GET    | `/admin/users`           | ADMIN | Search users |
| GET    | `/admin/moderation/queue`| MODERATOR, ADMIN | Listing moderation queue |
| POST   | `/admin/jobs/:jobName`   | ADMIN | Trigger a maintenance sweep |

### Health (root, not under `/api/v1`)

| Method | Path            | Description |
| ------ | --------------- | ----------- |
| GET    | `/health`       | Overall status + dependencies |
| GET    | `/health/live`  | Liveness (no dependency checks) |
| GET    | `/health/ready` | Readiness (MongoDB + Redis; `503` when not ready) |

---

## Socket.IO

The realtime layer (`src/sockets/`) runs on the same HTTP server at the default path `/socket.io`.

- **Handshake authentication** verifies the access token with the same rules as REST (signature,
  expiry, issuer/audience, `type: 'access'`) **and** checks the referenced session is still live.
  The token may be supplied via `auth.token`, `Authorization: Bearer …`, or the `rm_access_token`
  cookie. Unauthenticated sockets are rejected.
- On connect, the socket joins its personal room (`user:<userId>`) so inbox/badge updates arrive
  even before a thread is opened.
- **Authorization on every join:** `conversation:join` re-verifies participation in MongoDB before
  the socket may receive a conversation room's events.
- When Redis is available, the `@socket.io/redis-adapter` is attached so events fan out across
  instances.

**Client → server events:** `conversation:join`, `conversation:leave`, `message:send`,
`typing:start`, `typing:stop`, `message:read`, `presence:ping`.

**Server → client events:** `typing:start`, `typing:stop`, `presence:pong`, plus feature events
(new messages, notifications, visit updates, …) emitted through `emitRealtime` to the conversation
room and to each participant's personal room.

If Redis is unavailable, Socket.IO runs single-instance (no cross-instance fan-out).

---

## BullMQ

Background work runs in BullMQ workers (`src/infrastructure/queue/queue.ts`, started in
`src/jobs/index.ts`). Feature modules register their own handlers, and **all workers share the
`SERVICE_NAME:queue` prefix**. Jobs are enqueued from the request path but executed out of band.

| Queue                  | Jobs                                        |
| ---------------------- | ------------------------------------------- |
| `email`                | `deliver-otp`, `welcome`, `password-changed`, `notification-email` |
| `sms`                  | `deliver-otp`, `notification-sms`           |
| `notifications`        | `create-notification`                       |
| `image-processing`     | `optimise-property-images`                  |
| `saved-search-matching`| `match-published-property`                  |
| `listing-lifecycle`    | `expire-listings`, `warn-expiring-listings` |
| `reminders`            | `send-visit-reminders`                      |
| `cleanup`              | `prune-auth-artifacts`, `purge-expired-media`, `purge-old-notifications` |
| `analytics`            | `record-property-view`                      |

Conventions:

- Jobs carry **ids** (and short-lived one-time codes for OTP delivery only), never passwords,
  refresh tokens or reusable secrets.
- Jobs are idempotent — a retry must not create duplicate notifications.
- Default job options: 3 attempts with exponential backoff; completed jobs are trimmed, failed jobs
  retained for 7 days.
- When Redis is unavailable (`REDIS_REQUIRED=false`), `enqueue` logs and skips, and workers are not
  started — the API runs in degraded mode.

---

## Security

- **Transport/headers** — Helmet with a strict CSP (`default-src 'none'`, `frame-ancestors 'none'`,
  `connect-src` limited to the CORS allowlist), HSTS in production, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
- **CORS** — explicit allowlist with credentials; wildcard origins are rejected in production.
- **CSRF** — state-changing requests carrying auth cookies must present an allowlisted
  `Origin`/`Referer`; Bearer-token clients are unaffected.
- **NoSQL injection / prototype pollution** — request sanitiser strips `$`-prefixed and dotted keys
  and `__proto__`/`constructor`/`prototype`; Mongoose runs with `sanitizeFilter`.
- **Validation & mass assignment** — Zod validates body/query/params and strips unknown keys.
- **Authentication** — Argon2id (or bcrypt) password hashing; httpOnly, `SameSite=Lax` cookies
  (`Secure` in production); short-lived access tokens plus **rotating refresh tokens** with
  session-family revocation; every request re-validates the live session server-side.
- **Authorization** — RBAC (`TENANT`, `OWNER`, `MODERATOR`, `ADMIN`) enforced per route, plus
  ownership checks (`requireOwnership`) against the persisted record to prevent IDOR/BOLA.
- **Rate limiting** — Redis-backed, shared across instances, with per-instance fallback buckets.
  Buckets include: global (`60s`/`120`), register (`1h`/`10`), login (`15m`/`10`, per email),
  password reset (`1h`/`5`), OTP request (`1h`/`6`), OTP verify (`15m`/`15`), refresh (`15m`/`60`),
  search (`60s`/`120`), chat (`60s`/`90` per user), property write (`1h`/`60`), report (`1h`/`20`),
  upload (`1h`/`120`), review (`24h`/`10`), visit (`24h`/`20`).
- **Uploads** — held in memory, then validated by declared MIME, magic bytes, extension, dimensions
  and count before being streamed to storage; nothing touches disk before validation passes. Images
  are never stored in MongoDB.
- **Errors & logging** — centralised error taxonomy with machine-readable `error.code`; production
  responses never include stack traces or driver internals. Pino logs include request id, method,
  route, status, duration and (where present) user id/role; secrets, OTPs and tokens are never
  logged.
- **Limits** — JSON bodies capped at `256kb`, url-encoded at `128kb`, `hpp` enabled, and
  `TRUST_PROXY` respected for correct client IPs.
- **Ops** — health probes, graceful shutdown (HTTP server, BullMQ workers, Socket.IO, Redis,
  MongoDB) within a 15-second budget, and BullMQ deduplication for repeated triggers.

---

## Testing

Vitest + Supertest. Configuration is in `vitest.config.ts` (`environment: 'node'`,
`include: ['tests/**/*.test.ts']`, `setupFiles: ['./tests/setup.ts']`).

```bash
npm test
npm run test:watch
```

- **Unit tests** (`tests/unit/`) cover geographic helpers, pagination, password hashing, property
  search building, slugs and validation.
- **Integration tests** (`tests/integration/http.test.ts`) exercise the full middleware pipeline via
  Supertest against `createApp()`: health endpoints, response envelope, validation failures,
  malformed JSON, authentication/CSRF and security headers.
- `tests/setup.ts` sets every required environment variable before modules load and sets
  `REDIS_REQUIRED=false`. **The suite does not require MongoDB or Redis**, so it runs anywhere,
  including CI without services.

**Load testing** (optional, for scalability claims):

```bash
npm run loadtest -- --url http://localhost:5000 --requests 2000 --concurrency 50
npm run loadtest -- --endpoint "/api/v1/search?city=patna&maxRent=15000" --concurrency 100
```

It reports throughput, status codes and p50/p95/p99/max latency. Measure before claiming capacity.

---

## Common troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Startup throws `Invalid environment configuration` | Missing/invalid required env (e.g. short secret, missing `MONGODB_URI`) | Fix `backend/.env`; secrets must be ≥ 32 chars |
| Startup fails with a Redis error | `REDIS_REQUIRED=true` and Redis unreachable | Start Redis, or set `REDIS_REQUIRED=false` for degraded local mode |
| App boots but queues/notifications do nothing | Redis unavailable → degraded mode | Start Redis and set `REDIS_REQUIRED=true` |
| Login/verify cookies not set | `COOKIE_SECURE=true` over plain HTTP, or wrong `COOKIE_DOMAIN` | Use `COOKIE_SECURE=false` locally |
| Requests blocked with `AUTHORIZATION_DENIED` from the browser | `CORS_ORIGINS` missing the site origin, or CSRF origin check failing | Add the origin to `CORS_ORIGINS` |
| `422 VALIDATION_ERROR` on a request | Payload/query failed Zod validation | Read `error.details[].field` and correct the payload |
| Photo upload rejected | Unsupported type / wrong magic bytes / too small/large / too many files | Send JPEG/PNG/WebP/AVIF within `MAX_UPLOAD_MB` and dimension limits |
| Geo/nearby queries return nothing | `2dsphere` indexes not created | Run `node dist/scripts/ensureIndexes.js` |
| `/docs` is 404 in production | API docs disabled outside development | Set `ENABLE_API_DOCS=true` if you must expose them |
| `npm test` cannot find tests | Wrong working directory | Run from `backend/` |
| Emails/SMS not delivered | `EMAIL_DRIVER`/`SMS_DRIVER=console` (dev default) | Configure `smtp`/`api` drivers and credentials |
| Geocoding returns provider errors | `MAP_PROVIDER=google` or `mapbox` (not implemented) | Use `MAP_PROVIDER=nominatim` |
