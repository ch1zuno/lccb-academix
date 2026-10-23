# LCCB Academix

A near-products peer-tutoring platform for La Consolacion College Bacolod: faculty flag
at-risk learners, accredited tutors pick up and run sessions (OTP/QR/fingerprint
check-in), sessions are wrapped up with notes + rating, students earn community points
they can redeem, and superadmins watch the whole campus in one dashboard.

React (Vite) frontend, plain Node/Express API, and **PostgreSQL only** — raw
parameterized SQL through `pg`, no ORM.

## Quick start

```bash
# 1. install
npm install

# 2. configure (no system Postgres needed — the server boots an embedded one)
copy .env.example .env   # or create .env as below

# 3. reset the database (drop -> schema -> migrations marks -> seed)
npm run db:reset

# 4. run API + frontend together
npm run start            # API on :4000, Vite dev server on :5173 (proxy /api)
```

`.env` contents:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/lccb_academix
JWT_SECRET=dev-secret-change-me
PORT=4000
DEVICE_API_KEY=dev-device-key
```

Embedded Postgres (`embedded-postgres`) starts automatically on port 5432 with data in
`.pgdata/` whenever localhost:5432 is unreachable. If you run your own Postgres, point
`DATABASE_URL` at it and the embedded boot is skipped.

### Using Supabase (or any hosted Postgres)

Point `DATABASE_URL` at your project's **Session pooler** URI (Dashboard → Connect →
"Session pooler" — the direct `db.<ref>.supabase.co` host is IPv6-only and unreachable
from IPv4-only networks):

```
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Remote hosts get SSL automatically (localhost stays plain). `npm run db:reset` works
against any Postgres — **it wipes the `public` schema first**, so only run it on a
database that may be destroyed. Never run `db:reset` against a hosted database that
holds real or live-demo data. To validate `db/schema.sql` + `db/seed.sql` safely, do it
on a scratch database: the embedded local Postgres (point `DATABASE_URL` at
`postgres://postgres:postgres@localhost:5432/<scratch-name>`) runs schema → migrations
→ seed in seconds without touching anything remote.
Handy utilities: `node server/scripts/pooler-verify.js` (checks the connection) and
`node server/scripts/pooler-probe.js` (discovers which pooler region hosts the project
when you only know the direct hostname).

## Demo accounts

All seeded users share the password **`demo1234`**. Sign in with the `custom_id` or email.

| Role       | Login ID  | Email                              |
| ---------- | --------- | ---------------------------------- |
| Learner    | `TE-128`  | (Julian Gemelo)                    |
| Learner    | `TE-092`  | (Maria Luisa Tan)                  |
| Tutor      | `TU-042`  | m.antipo@lccbacolod.edu.ph         |
| Faculty    | `FA-017`  | b.tisuela@lccbacolod.edu.ph        |
| Superadmin | —         | l.betita.admin@lccbacolod.edu.ph   |

`GET /api/auth/dev-accounts` lists all demo accounts (dev only).

## End-to-end demo flow

1. **Faculty** (FA-017) — New Referral: search a learner, pick subject/urgency → referral is *flagged*, learner notified.
2. **Tutor** (TU-042) *or Learner* (TE-128) — matching wizard `/tutors?subject=…&available=1`, accept a request → a real session exists.
3. **Check-in** — tutor stages an OTP/QR token, both Confirm via `/checkins/:code`, 2 confirmations → session `in-progress`. Physical check-ins: `POST /device/import-roster` + `POST /device/verify` (header `X-Device-Key`).
4. **Wrap-up** — either participant submits rating (+ tutor notes) in one transaction: hours debited from the referral (auto-resolve at 0), tutor +50 & learner +25 attendance credits, badges awarded.
5. **Rewards** — learner redeems points (stock decremented atomically, voucher issued).
6. **Accreditation** — learner opens **Become a Tutor** (`/exam`): picks subjects and attaches supporting documents of academic achievement. Submitting lands on the pending-applicant page (`/tutor-pending`) with the qualification exam (one-shot, server-graded) and their documents; after the exam the applicant waits for the superadmin decision (page polls live) with shortcut buttons to go home or find a tutor. Superadmin approves → `is_verified` + `certified_by_id`.

## API routes (mounted under `/api`)

| Route | Method(s) | Role | Purpose |
| --- | --- | --- | --- |
| `/public/overview` | GET | public | anonymous landing stats: tutor count, hours, points, active subjects, honour roll |
| `/auth/login` · `/auth/me` · `/auth/dev-accounts` | POST · GET | public / authed | JWT auth (bcrypt), metadata survival |
| `/referrals` · `/referrals/assign` · `/referrals/:id/status` · `/referrals/search-students` | GET POST PATCH | faculty/superadmin · scoped | referral lifecycle: flagged → assigned → in-progress → resolved |
| `/subjects` · `/tutors` · `/session-requests` | GET POST | authed · accept/decline | matching: accreditation-gated requests, double-accept blocked |
| `/sessions/mine` · `/sessions/:id/stage-token` · `/sessions/:id/check-in` | GET POST | tutor/participant | check-in tokens (10-min TTL, one-shot), 2 confirmations start session |
| `/sessions/:id/wrap-up` | POST | participant | **one transaction**: end, notes, rating, hours-debit, auto-resolve, points, badges |
| `/device/import-roster` · `/device/roster` · `/device/verify` | POST GET | `X-Device-Key` | physical check-in via device fingerprint |
| `/rewards` · `/rewards/:id/redeem` · `/wallet` | GET POST | authed | catalog, server-side grading redemption (`FOR UPDATE` stock, ledger debit, voucher) |
| `/notifications` | GET PATCH | authed | per-user feed + mark-all-read |
| `/accreditation/apply` · `/accreditation/exam` · `/accreditation/mine` | GET POST | learner/authed | apply with subjects + supporting-document entries (`achievements` jsonb); exam questions never expose answers; grading is one-shot |
| `/accreditation/applications` · `/:id/approve` · `/:id/reject` | GET POST | superadmin | sets `is_verified` + `certified_by_id` |
| `/analytics` | GET | superadmin | CTE aggregates: KPIs, 6-week trend, dept breakdown |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run db:reset` | drop schema → `db/schema.sql` → mark migrations → `db/seed.sql` (destructive — see the warning above) |
| `npm run server` | Express API on `PORT` (embedded PG auto-boot) |
| `npm run dev` | Vite only |
| `npm run start` | both servers together |
| `node server/scripts/e2e-all.js` | runs every end-to-end check (referrals, matching, check-in, wrap-up, rewards, accreditation, analytics) — best against a scratch local database |

## Project layout

```
db/schema.sql          source-of-truth DDL (incl. platform tables, triggers, views);
                       sessions.duration_hours is the numeric hour source of truth (DEFAULT 1)
db/seed.sql            demo data (39 users; password demo1234; UTF-8)
db/migrations/         numbered migration files (marked applied on reset);
                       002_session_duration_and_seed_repair.sql backfills numeric durations
server/                Express app, one pg Pool (`server/db.js`), routes, middleware
server/scripts/        db-reset + embedded-PG boot + e2e scripts
src/                   React app; `src/api.js` is the only API client
```

## Design system (neo-brutalist, 2026 relaunch)

- **Palette**: LCCB Navy `#0F2942` (ink) + Institutional Gold `#D4AC0D`, ground
  `#F2EDE1`, cards `#FFFDF6`, muted `#E9E1D1`. Kept from the college identity.
- **Type**: Bricolage Grotesque (display, 800) + Geist (body).
- **Language**: flat colour fields, thick 3px ink borders, hard offset shadows
  (e.g. `10px 10px 0`), slight rotations, uppercase stamps. These are intentional —
  the design-quality inspector flags them and they are expected.
- **Landing (`src/screens/Login.jsx` + `src/screens/Landing.css`)**: the hero is an
  **interactive pure-CSS 3D scene** — cartoonish brutalist cube objects (graduation
  cap with swinging tassel, "A+" ledger stack, subject letter tiles, session clock,
  point coins, flat chips) over a blueprint grid floor; it tilts with the pointer and
  every object pops on hover. No photographs are used in the hero.
- **Logo (`src/components/Logo2D.jsx`)**: the brandmark is a **flat SVG wordmark**
  — navy block caps in Bricolage Grotesque with a hard gold offset edge, a thick
  contour outline (`paint-order: stroke`) and hand-lettered per-glyph wobble;
  "ACADEMIX" (the app's name) is the hero row, "LCCB" a small stamp above it,
  plus a one-time pop entrance and a small hover tilt (both reduced-motion
  guarded). Renders crisp at every size with zero WebGL.
- **Illustrations**: section artwork uses free flat illustrations from
  [Storyset (Freepik Labs)](https://storyset.com/education) (`public/illustrations/`),
  credited in the landing footer.
- **App screens** keep the same system: navy sidebar, white card panels, gold accents,
  hard-edge tables and badges. The signed-in shell lives in `src/App.jsx`, role
  dashboards in `src/screens/Dashboard.jsx`.
- `src/index.css` still defines the shared tokens in its `:root` block — keep in sync
  with `Landing.css`.
