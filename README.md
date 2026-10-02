# PickleNepal

> **Find your people. Find your game.**

The online home of pickleball in Nepal — courts, open games, players, clubs, coaches,
events, tournaments and a community feed. Built for the question *"how can I play pickleball
today?"*

- **Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Prisma 6 · PostgreSQL 17
- **Package manager:** pnpm 10
- **Locale:** Nepal — `Asia/Kathmandu`, `NPR`, `+977`, manual city selection (no GPS required)

---

## Table of contents

1. [Quick start](#1-quick-start)
2. [Environment configuration](#2-environment-configuration)
3. [Database, migrations and seed data](#3-database-migrations-and-seed-data)
4. [Running and verifying](#4-running-and-verifying)
5. [Project layout](#5-project-layout)
6. [Architecture notes](#6-architecture-notes)
7. [Deploying](#7-deploying)
8. [What is implemented](#8-what-is-implemented)
9. [External credentials and services](#9-external-credentials-and-services)
10. [Known limitations](#10-known-limitations)

---

## 1. Quick start

Requirements: Node 22+, pnpm 10+, PostgreSQL 15+.

```bash
# 1. install
pnpm install

# 2. configure
cp .env.example .env
#    then set DATABASE_URL and a real AUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. create the database (once)
createdb picklenepal

# 4. apply migrations
pnpm db:migrate          # or: pnpm db:deploy   (non-interactive, for CI/production)

# 5. load demo data
pnpm db:seed

# 6. run
pnpm dev                 # http://localhost:3000
```

Open <http://localhost:3000>. Every seeded account uses the password
**`PickleNepal123`**:

| Role | Email |
| --- | --- |
| Admin | `admin@picklenepal.test` |
| Moderator | `moderator@picklenepal.test` |
| Organiser | `organizer@picklenepal.test` |
| Player | `aayush@picklenepal.test` |
| Coach | `coach@picklenepal.test` |

> All clubs, courts, coaches and players in the seed data are **fictional demo
> records** created for local development. They do not represent real businesses
> or people in Nepal.

### Docker

The Compose file publishes **web on `localhost:3100`** and **Postgres on
`localhost:5434`** — both are offsets because `3000` and `5432` are commonly
taken by another project or a local Postgres. Override with `WEB_PORT` / `DB_PORT`
in `.env`.

```bash
cp .env.example .env        # set DATABASE_URL, AUTH_SECRET, APP_URL
docker compose up -d --build

# first run only: apply migrations + load demo data
docker compose --profile setup run --rm db-setup

docker compose ps           # both services report (healthy)
open http://localhost:3100
```

Migrations and the seed run in a one-off `db-setup` service built from the
*build* stage: the runtime image is production-only, runs as a non-root user, and
carries no `tsx`, so it cannot execute `prisma/seed.ts` itself.

```bash
docker compose logs -f web          # app logs
docker compose exec db psql -U postgres -d picklenepal   # inspect data
docker compose down                  # stop
docker compose down -v               # stop and delete the database volume
```

---

## 2. Environment configuration

Copy `.env.example` to `.env`. Every value has a working local default **except**
`DATABASE_URL` and `AUTH_SECRET`. Never commit real credentials.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | Session signing secret (32+ random chars) |
| `APP_URL` | prod | Absolute site URL, used for canonical links, OG tags, sitemap, password-reset links |
| `NEXT_PUBLIC_APP_TIMEZONE` | no | Defaults to `Asia/Kathmandu` |
| `NEXT_PUBLIC_APP_CURRENCY` | no | Defaults to `NPR` |
| `NEXT_PUBLIC_PHONE_COUNTRY_CODE` | no | Defaults to `+977` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Google OAuth — see limitations |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | no | S3-compatible object storage for uploads. Unset ⇒ local disk |
| `UPLOAD_DIR` / `MAX_UPLOAD_MB` | no | Local upload location and size cap (default 5MB) |
| `MAP_API_KEY` | no | Reserved for hosted map tiles; the bundled map view needs no key |
| `EMAIL_PROVIDER` | no | `console` (default) or `resend` |
| `EMAIL_API_KEY` / `EMAIL_FROM` | no | Required when `EMAIL_PROVIDER=resend` |
| `PAYMENT_PROVIDER` | no | `mock` (default), `esewa`, `khalti`, `stripe` |
| `ESewa_*`, `KHALTI_*`, `STRIPE_*` | no | Per-provider credentials |
| `PLATFORM_COMMISSION_BPS` | no | Marketplace/booking commission in basis points (default 1000 = 10%) |

---

## 3. Database, migrations and seed data

The schema (`prisma/schema.prisma`) covers every entity in the requirements:
users, sessions, player profiles, clubs, courts, coaches, games, participants,
waitlist entries, events, tournaments (categories, teams, matches), community
posts and comments, follows, likes, saves, blocks, conversations and messages,
notifications and preferences, badges, reviews, reports, verification requests,
marketplace listings and sellers, payments and transactions, sponsors,
referrals, audit logs, feature flags and platform settings.

```bash
pnpm db:generate     # regenerate Prisma Client after schema edits
pnpm db:migrate      # create + apply a migration in development
pnpm db:deploy       # apply existing migrations (CI / production)
pnpm db:studio       # browse data in Prisma Studio
pnpm db:seed         # wipe and reload demo data
pnpm db:reset        # drop, re-migrate and re-seed (destructive)
```

Money is stored as integer rupees in `Int` columns (no floats) and rendered with
`NPR 1,500`-style grouping. All timestamps are `timestamptz` UTC instants,
rendered in Nepal local time.

---

## 4. Running and verifying

```bash
pnpm dev           # development server
pnpm build         # production build
pnpm start         # serve the production build

pnpm typecheck     # tsc --noEmit (strict)
pnpm lint          # eslint
pnpm test          # unit + integration (vitest)
pnpm test:coverage # with coverage report
```

All four gates currently pass:

| Gate | Result |
| --- | --- |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass (0 errors) |
| `pnpm test` | **76 passing** (58 unit, 18 integration) |
| `pnpm build` | pass, 60 routes |
| `docker build` | pass |

Integration tests run against the configured database. They create
self-contained fixtures and clean up after themselves, so the seeded demo data
survives a test run.

---

## 5. Project layout

```
prisma/
  schema.prisma          # the full data model
  migrations/            # checked-in SQL migrations
  seed.ts                # demo data (fictional)
src/
  app/                   # routes (App Router)
    (public)             # landing, courts, players, games, community, …
    admin/               # moderation, verification, audit logs
    organizer/           # tournament management
    club/dashboard/      # club admin
    api/                 # search, auth/logout, health
  components/            # UI, grouped by feature
  lib/
    auth/                # sessions, permissions, auth actions
    games/               # game rules (pure) + queries + actions
    bookings/rules.ts    # overlap + opening-hours rules (pure)
    tournaments/         # bracket generation and result entry
    stats.ts             # statistics, rankings, points
    notifications/       # notification service abstraction
    payments/provider.ts # eSewa / Khalti / Stripe / mock gateways
    uploads.ts storage.ts# image validation + S3/disk backends
    nepal.ts dates.ts    # Nepal timezone, currency, phone rules
  tests/                 # unit + integration suites
```

---

## 6. Architecture notes

Decisions that are not obvious from the code, with the requirement they satisfy.

**Business rules are pure functions, separate from UI.** `src/lib/games/rules.ts`
and `src/lib/bookings/rules.ts` contain no database or React imports. Capacity,
waitlist promotion, bracket advancement, booking overlap and creator-departure
logic are all pure and unit-tested.

**Capacity is enforced in a serialisable transaction.** `joinGameAction` reads
the participant count and inserts inside `prisma.$transaction(..., {
isolationLevel: "Serializable" })`. The unique index on
`GameParticipant(gameId, userId)` is the final backstop, and a `P2034`
serialisation failure is retried as a friendly "someone took the last spot"
message rather than a 500. Two players racing for the last slot cannot both win.

**Creator departure has a documented rule.** When the organiser leaves, ownership
transfers to the earliest-joined remaining participant. If nobody remains, the
game is set to `CANCELLED` — never deleted, so history is preserved.

**Authorization is server-side and session-derived.** `requireGameOwner`,
`requireClubManager`, `requireTournamentOrganizer` and
`requireConversationParticipant` all read the session and never trust a
client-supplied user ID, role or ownership claim. Page guards redirect; server
actions throw typed errors that clients surface as toasts.

**Nepal time is handled explicitly.** The server interprets submitted
`YYYY-MM-DD` + `HH:mm` as Nepal wall-clock time via `fromNepalParts`
(UTC+05:45, no DST). Opening-hours checks receive the Nepal day-of-week and
local times, not UTC fields — otherwise a 6pm Kathmandu booking would be
validated against the wrong wall clock.

**Notifications go through one service.** `NotificationService.send()` checks
the recipient's per-category preferences, writes the in-app row synchronously
and dispatches email asynchronously so a mail outage never blocks a gameplay
action.

**Payments never trust the client.** Provider gateways implement
`createIntent` / `verify` / `refund`. Status only moves to `SUCCESS` after a
server-side verification call. The `mock` gateway refuses to verify in
production.

**Internal rankings are never labelled DUPR.** Ranking calculations live in
`src/lib/stats.ts` and are rendered as "PickleNepal Community Ranking" with the
methodology stated. DUPR values are only ever *displayed* when a user supplied
their own; the platform never invents one.

**Uploads are validated by content, not extension.** Magic-number sniffing runs
before anything is stored, and files go to S3-compatible storage when
configured, otherwise local disk. Large blobs never enter PostgreSQL.

**Feature flags default to off.** `BOOKINGS`, `PAYMENTS`, `PREMIUM`,
`PUSH_NOTIFICATIONS`, `DUPR_INTEGRATION` and `SPONSOR_ADS` ship disabled, so an
unconfigured deployment is safe. Admin toggles are audit-logged.

---

## 7. Deploying

The app is a standard Next.js server and works on any Node 22 host (Vercel,
Railway, Render, Fly, a VPS, ECS, Cloud Run).

### Managed Postgres + container host

```bash
# on the host
cp .env.example .env       # DATABASE_URL → managed instance, real AUTH_SECRET

docker compose up -d --build web

# apply migrations on deploy (one-off service; works with an external DB too)
docker compose --profile setup run --rm db-setup
```

For a managed Postgres, drop the `db` service and point `DATABASE_URL` at the
external instance — the `web` service reads it from `.env` and `db-setup` uses
the same value.

### Platform-as-a-service (Vercel, etc.)

1. Provision PostgreSQL and copy its pooled connection string into
   `DATABASE_URL`. Use the **pooled** URL in serverless environments and add
   `?pgbouncer=true&connection_limit=1` if your provider requires it.
2. Set `AUTH_SECRET`, `APP_URL` and `NEXT_PUBLIC_APP_URL` to your public origin.
3. Deploy. Run `pnpm db:deploy && pnpm db:seed` once against the production
   database (skip the seed for a real launch).
4. The included `Dockerfile` and `docker-compose.yml` also work for a plain
   container deployment.

### Production checklist

- [ ] `AUTH_SECRET` is a fresh 48-byte random value
- [ ] `DATABASE_URL` points at a managed instance with automated backups
- [ ] `APP_URL` is the real origin (sitemap, OG tags, reset links depend on it)
- [ ] HTTPS terminated in front of the app (session cookies set `secure` in production)
- [ ] Object storage configured if you accept uploads
- [ ] `EMAIL_PROVIDER` set to a real provider, or reset emails will only log
- [ ] `MESSAGING` left enabled; `BOOKINGS`/`PAYMENTS` enabled only after
      configuring providers and testing the conflict rules
- [ ] Sentry or equivalent wired into `src/app/global-error.tsx`

---

## 8. What is implemented

Everything below is backed by real database reads and writes, not mocked data.

**Accounts & security**
Email/password registration and login, forgot-password and reset with
single-use hashed tokens, session invalidation on password change, logout that
deletes the session row, bcrypt cost 12, per-operation rate limiting (login,
signup, reset, messages, posts, comments, reviews, reports, game creation,
tournament registration), httpOnly session cookies, mandatory input validation
on both client and server.

**Onboarding & profiles**
Six-step onboarding (city → skill → format → position → availability →
frequency) with optional DUPR/bio/socials, saved after each step. Editable
profile, three-level profile visibility (public / community-only / private),
date-of-birth toggle, and a guarantee that email, phone and internal identifiers
are never exposed publicly.

**Games**
Browse with URL-persisted filters (city, date, skill, format, type, price,
indoor/outdoor, search, sort) plus quick filters (today, tomorrow, weekend,
beginner-friendly, free). Seven-step create flow, detail pages with map links,
join/leave with transactional capacity enforcement, waitlist with position,
expiring offers and automatic promotion, organiser controls (edit, remove
participant, start, complete, cancel with notification fan-out), and result
recording that feeds statistics and badges.

**Courts**
Directory with filters and a map/list toggle (map view is key-free and works
without GPS), full court profiles — images, amenities, surface, lighting, opening
hours, pricing, rentals, contact and links, reviews with category breakdowns, and
booking behind a feature flag with server-side conflict detection.

**Players & social**
Filterable directory (city, skill, DUPR band, format, position, availability),
public profiles with statistics, badges, favourite courts, upcoming games and
tournament history, follow/unfollow, block, report, and messaging.

**Community**
Feed with newest / following / popular modes, seven post types, likes, saves,
comments with controlled single-level nesting, reporting, and author/moderator
edit and delete.

**Events, clubs, coaches**
Event creation, browse, attend and cancel attendance. Club profiles with courts,
events, games, coaches, announcements and staff; club dashboard with metrics,
booking management and directory oversight. Verified coach profiles with levels
taught, availability, session pricing, lesson requests and reviews.

**Tournaments**
Browse and filter, create with categories, registration with singles and
explicit doubles teams, partner registration, withdrawal, bracket generation
(padded single elimination with byes), result entry with automatic advancement,
and an organiser management screen.

**Competition**
Statistics recomputed from recorded results, community rankings by Nepal/city,
skill and format with monthly views, and a rule-driven badge engine.

**Communication & moderation**
Private messaging with participant-only authorization, unread counts, block
propagation, in-app notifications with per-category per-channel preferences, and
reports with a moderation queue.

**Marketplace**
Classified listings with categories, conditions, images, search, save, contact
seller, edit/delete of own listings, seller profiles and admin verification.

**Admin**
Overview analytics, user management (search, role, suspend, ban, restore — all
audit-logged), moderation queue with dismiss/remove/warn/suspend/ban, verification
approval workflow that grants badges, audit log viewer, and feature-flag toggles.

**Platform**
Payment gateway abstraction, notification service abstraction, feed service
abstraction, analytics event tracking, feature flags, referral tracking, sponsor
records, audit logging on every privileged action, Nepal timezone/currency/phone
handling, sitemap and robots, OpenGraph metadata on every public page, PWA
manifest and icons, accessible focus states, skeleton and empty states, and
custom 404/403/500 boundaries that never leak stack traces.

---

## 9. External credentials and services

These need accounts and keys; the code is written and wired but cannot be
exercised without them.

| Feature | Needs | State without credentials |
| --- | --- | --- |
| Payments (eSewa) | eSewa merchant account + secret | Gateway refuses to verify; bookings stay unconfirmed. Correct — never marks success without proof |
| Payments (Khalti) | Khalti API keys | Same |
| Payments (Stripe) | Stripe secret + webhook secret | Same |
| Email | Resend (or SMTP) API key | Falls back to `console`; emails log to the terminal instead of sending |
| Object storage | Cloudflare R2 or S3 bucket + keys | Uploads fall back to `public/uploads` on local disk |
| Google OAuth | Google Cloud OAuth client | Login page offers email/password only |
| Maps | Hosted tile provider key | Map view works key-free via a local projection |
| Push notifications | VAPID keys | Flag ships off; in-app and email channels work |

---

## 10. Known limitations

Non-critical, and each is a deliberate boundary rather than a broken feature.

1. **Google OAuth is not wired.** The `Account` table and `Account` relation exist
   and `Account` model is provisioned for it, but there is no OAuth route. The
   spec allows email/password as the primary flow; adding Google later touches
   one callback route.
2. **Payments are architected, not transacted.** The gateway abstraction,
   refund path and status machine are implemented and auditable, but no provider
   callback route is mounted, so `PAYMENTS` stays off. Do not enable it in
   production without that callback.
3. **Court booking is unconfirmed-only.** Bookings are created `PENDING` and a
   club manager confirms them in the dashboard. There is no payment hand-off.
4. **Bracket generation covers single elimination.** Round robin is selectable
   on a tournament, but only single-elimination brackets are generated; round
   robin is listed as future work in the requirements.
5. **Payment settlement never touches tournaments.** Entry fees are recorded as
   metadata and settled with the organiser, matching the "do not promise what
   does not exist" constraint in the spec.
6. **Search is PostgreSQL `ILIKE`.** Adequate to seed size. The `search()`
   interface is deliberately narrow so Meilisearch or Typesense can replace it.
7. **The map view is a local projection, not a slippy map.** It renders
   court positions relative to each other. It is key-free and works everywhere,
   but a hosted tile map would need `MAP_API_KEY` and a tile provider.
8. **i18n is prepared, not translated.** Strings live in components and
   `nepal.ts`, not deeply nested inline literals, but there is no message
   catalogue yet. English only, per §5.5.
9. **Recurring jobs are not scheduled.** Game and tournament reminders are
   modelled as notifications but there is no cron worker yet; trigger
   `NotificationService.send` from a scheduled job in production.
10. **E2E browser tests are not included.** Unit and integration suites cover the
    business rules and server actions; the manual journeys in §90.3 were walked
    against a running server rather than automated with Playwright.
11. **`GET /api/health` is unauthenticated** and reveals only a status word. Put
    it behind your platform's health checks if that is a concern.

---

## License

Built as a demonstration project for the Nepal pickleball community.