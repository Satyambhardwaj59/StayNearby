# StayNearby — Frontend

The Next.js (App Router) frontend for **StayNearby** (*Your Next Home Is Closer.*) — a rental
marketplace for PGs, rooms, flats and houses. It is an independent application: install, run, build
and deploy it on its own. SEO-first and server-rendered for public pages, with client interactivity
only where it is needed.

> **Tooling:** npm only. No pnpm, no Docker, no PWA/service workers.

---

## Table of contents

- [Frontend stack](#frontend-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Environment variables (`.env.example`)](#environment-variables-envexample)
- [Development — `npm run dev`](#development--npm-run-dev)
- [Production build — `npm run build`](#production-build--npm-run-build)
- [Serve the build — `npm run start`](#serve-the-build--npm-run-start)
- [Available scripts](#available-scripts)
- [Frontend architecture](#frontend-architecture)
- [API configuration](#api-configuration)
- [SEO](#seo)
- [Testing](#testing)
- [Common troubleshooting](#common-troubleshooting)

---

## Frontend stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript 5.9** (strict)
- **Montserrat** as the primary typeface, loaded centrally through `next/font` (see
  `src/app/layout.tsx`) with a metric-matched fallback
- **Tailwind CSS 3.4** with `tailwindcss-animate`, `class-variance-authority`, `clsx`,
  `tailwind-merge`
- **TanStack Query 5** for server-state and **Zustand 5** where client state is genuinely required
- **React Hook Form 7** + `@hookform/resolvers` + **Zod 3** for forms and validation
- **lucide-react** for icons; **maplibre-gl** is an optional dependency for map rendering
- **Vitest 2** for tests; **ESLint 9** with the Next.js and `jsx-a11y` plugins

Refer to `package.json` for exact versions.

---

## Requirements

- **Node.js ≥ 20.11.0** (declared in `engines`)
- **npm**
- A running backend API (see [`../backend/README.md`](../backend/README.md))

---

## Installation

```bash
cd frontend
npm install
```

Then create your environment file:

```bash
cp .env.example .env.local
```

---

## Environment variables (`.env.example`)

Only browser-safe values are allowed here. **Never put secrets, API keys or database URLs in
`NEXT_PUBLIC_*`** — they are embedded into the client bundle.

| Variable                      | Default                                              | Purpose                                   |
| ----------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_API_URL`         | `http://localhost:5000/api/v1`                       | Versioned backend base URL                |
| `NEXT_PUBLIC_SITE_URL`        | `http://localhost:3000`                              | Public origin for canonical URLs/sitemap/JSON-LD |
| `NEXT_PUBLIC_SOCKET_URL`      | `http://localhost:5000`                              | Socket.IO origin                          |
| `NEXT_PUBLIC_MAP_TILE_URL`    | OpenStreetMap raster tile template                   | Map tiles                                 |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | `© OpenStreetMap contributors`                       | Map attribution text                      |

These are validated at import time by `src/lib/config/env.ts` (Zod) and exposed as
`apiBaseUrl`, `siteUrl` and `socketUrl`.

---

## Development — `npm run dev`

```bash
npm run dev
```

Starts `next dev` on **http://localhost:3000**.

> The dev server renders the routes present under `src/app`. This repository currently ships the
> frontend **foundation** (typed API client, SEO helpers, validation config and the UI primitives);
> page/route files are added under `src/app` as features are implemented. Add at least one route
> before expecting rendered pages.

---

## Production build — `npm run build`

```bash
npm run build
```

Runs `next build`. Unlike `next dev`, a production build **requires** at least one route under
`src/app`; without it the build fails with "Couldn't find any `pages` or `app` directory".

`NEXT_PUBLIC_*` variables are inlined at build time, so set them in the build environment.

---

## Serve the build — `npm run start`

```bash
npm run build
npm run start
```

Runs `next start`, serving the production build (default port `3000`, override with `-p` or the
`PORT` env var). Always build first — `next start` needs the `.next` output.

---

## Available scripts

| Script              | Command                          | Description                              |
| ------------------- | -------------------------------- | ---------------------------------------- |
| `npm run dev`       | `next dev`                       | Development server                       |
| `npm run build`     | `next build`                     | Production build                         |
| `npm run start`     | `next start`                     | Serve the production build               |
| `npm run lint`      | `eslint "src/**/*.{ts,tsx}"`     | Lint source                              |
| `npm run lint:fix`  | `eslint "src/**/*.{ts,tsx}" --fix` | Lint and autofix                       |
| `npm run typecheck` | `tsc --noEmit`                   | Type check                               |
| `npm test`          | `vitest run`                     | Run tests once                           |
| `npm run test:watch`| `vitest`                         | Run tests in watch mode                  |

---

## Frontend architecture

Next.js **App Router**, Server Components by default, with a strict separation between transport,
presentation and SEO:

```text
frontend/src/
├── components/
│   └── ui/                 # design-system primitives (Button, Card, Field, Feedback…)
└── lib/
    ├── api/                # typed API client (server + browser) and shared contract types
    ├── config/             # validated public environment
    ├── seo/                # metadata, canonical, structured-data, breadcrumbs, sitemap
    ├── cn.ts               # Tailwind class merge helper
    └── format.ts           # currency/date/label formatting helpers
```

Conventions:

- **Pages and feature code live under `src/app`**, following the App Router conventions
  (`layout.tsx`, `page.tsx`, `sitemap.ts`, `robots.ts`, `not-found.tsx`, `error.tsx`). Route groups
  separate public, auth and dashboard areas.
- **Business logic does not live in components.** UI composes the `lib/api` client and shared
  helpers.
- **Server Components by default.** Add `"use client"` only for components that need state, effects
  or browser APIs.
- **TypeScript is strict** (`noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`), and the
  `@/*` path alias maps to `src/*`.

---

## API configuration

All HTTP access flows through `src/lib/api`, which centralises the base URL, cookies, envelopes,
pagination and error shapes:

- **`fetcher.ts`** — the single HTTP core. Builds URLs/query strings, sends JSON or `FormData`,
  parses the success/error envelopes, and exposes `request` and `safeRequest` (a non-throwing
  variant for pages that must render even when the API is down).
- **`server.ts`** — server-side client used by Server Components, `generateMetadata` and the
  sitemap. It forwards the auth cookies (`rm_access_token`, `rm_refresh_token`) explicitly via
  `next/headers` so authenticated views render in the initial HTML. Use `next: { revalidate }` to
  opt into ISR.
- **`browser.ts`** — browser client. Tokens live in httpOnly cookies, so it never reads or stores a
  credential; it relies on `credentials: 'include'`.
- **`endpoints.ts`** — the typed endpoint map (`authApi`, `propertiesApi`, `searchApi`,
  `locationsApi`, `favoritesApi`, `savedSearchesApi`, `conversationsApi`, `messagesApi`,
  `visitsApi`, `reviewsApi`, `notificationsApi`, `reportsApi`, `adminApi`). Feature code calls these
  functions, never `fetch` directly.
- **`error.ts`** — `ApiError` with `code`, `status`, field `details` and `requestId`, plus helpers
  like `fieldErrors` for React Hook Form.
- **`types.ts`** — the cross-boundary API types (property, user, chat, visits, reviews,
  notifications, reports, admin overview and the response envelopes).

Configuration comes from `src/lib/config/env.ts` (validated `NEXT_PUBLIC_*`), exposed as
`apiBaseUrl`, `siteUrl` and `socketUrl`. Never hardcode API URLs in components — always import from
this module.

---

## SEO

SEO is first-class and centralised under `src/lib/seo`:

- **`metadata.ts`** — builds unique titles, descriptions, canonicals, Open Graph and Twitter cards
  from page data; helpers for private pages (`noindex`) and not-found pages.
- **`canonical.ts`** — absolute-URL and canonical-query policy. Filtered/paginated search results
  canonicalise to the clean `/search` path to prevent crawl explosion. Curated landing pages
  (`/pg-in-patna`, `/rooms-for-rent-in-patna`, `/pg-for-students-in-patna`,
  `/1bhk-for-rent-in-patna`, …) are parsed and generated here.
- **`structured-data.ts`** — schema.org builders (`Organization`, `WebSite`, `BreadcrumbList`,
  `ItemList`, `RealEstateListing`/`Residence`, `Offer`, `FAQPage`). Only real data is emitted — no
  fabricated ratings or prices.
- **`breadcrumbs.ts`** — one breadcrumb model that drives both the visible trail and the
  `BreadcrumbList` JSON-LD.
- **`sitemap.ts`** — dynamic sitemap generation from real inventory (cities, localities, curated
  landing pages and published properties), with static entries always emitted even when the API is
  unavailable, plus `chunkSitemap`/`isPrivatePath` helpers and the private-path prefix list.

Private areas (`/login`, `/register`, `/account`, `/chat`, `/favorites`, `/admin`, dashboards, …)
are `noindex` and excluded from the sitemap.

---

## Testing

Vitest is configured in `vitest.config.ts`:

- `environment: 'node'`
- `include: ['tests/**/*.test.ts']`
- `@` alias mapped to `src`

```bash
npm test          # vitest run
npm run test:watch
```

Test files belong under `frontend/tests/**`. If no test files exist yet, `vitest run` reports that
no tests were found — add tests before relying on the command in CI.

---

## Common troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `next build` → "Couldn't find any `pages` or `app` directory" | No route files exist yet | Add route files under `src/app` |
| `next start` fails / 404s | No production build | Run `npm run build` first |
| `Invalid frontend environment configuration` at start | A `NEXT_PUBLIC_*` value is not a valid URL | Fix `.env.local` (see the table above) |
| API calls hang or fail in the browser | Backend not running or wrong URL | Start the backend and check `NEXT_PUBLIC_API_URL` |
| Requests blocked by CORS | Backend allowlist missing the site origin | Add the frontend origin to backend `CORS_ORIGINS` |
| Auth state not visible on first render | Server requests not forwarding cookies | Use the `src/lib/api/server.ts` client for server-side fetches |
| `npm test` → "No test files found" | No tests under `tests/**` | Add a `*.test.ts` file |
| Styles missing | Tailwind `content` globs do not match new files | Keep source under `src/**/*.{ts,tsx}` |
| Env changes ignored | `NEXT_PUBLIC_*` is inlined at build time | Rebuild after changing values |
