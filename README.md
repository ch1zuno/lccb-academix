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
# Demo mode is automatic in dev; on a production demo set both:
# DEMO_MODE=1
# VITE_DEMO_MODE=1
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

Remote hosts get SSL automatically (localhost stays plain). `npm run db:reset` refuses a
non-local host unless `ALLOW_REMOTE_DB_RESET=1` is set, because **it wipes the `public`
schema first** — only use that flag on a database that may be destroyed. Never run
`db:reset` against a hosted database that holds real or live-demo data. To validate
`db/schema.sql` + `db/seed.sql` safely, do it on a scratch database: the embedded local
Postgres (point `DATABASE_URL` at
`postgres://postgres:postgres@localhost:5432/<scratch-name>`) runs schema → migrations
→ seed in seconds without touching anything remote.
The API e2e scripts in `server/scripts` also default their direct SQL to that local
scratch database and refuse non-local hosts; set `E2E_DATABASE_URL` if the API is
running against a differently named local database.
Handy utilities: `node server/scripts/pooler-verify.js` (checks the connection) and
`node server/scripts/pooler-probe.js` (discovers which pooler region hosts the project
when you only know the direct hostname).

## Deploy to Vercel

The project deploys to Vercel as **one serverless function + one static SPA**:

- `api/index.js` — serves the exact Express app from `server/app.js` as a
  serverless function (`bcryptjs`, pure-JS deps only; the pg Pool talks to the
  remote `DATABASE_URL` directly — no embedded Postgres in the cloud build).
- `vercel.json` rewrites `/api` and `/api/(.*)` into that function, everything
  else falls through to the Vite SPA (`/index.html`).
- Local entry (`node server/index.js`) shares `server/app.js` and boots the
  embedded Postgres first — cloud behaviour and local behaviour cannot drift.

**Project settings to make the API actually work on the deployed site** (Vercel
dashboard → Settings → Environment Variables):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | the hosted Postgres connection string (e.g. the Supabase session-pooler URL) |
| `JWT_SECRET` | a long random string; never ship the dev fallback |
| `FRONTEND_ORIGIN` | the deployed origin, e.g. `https://lccb-academix.vercel.app` |
| `DEMO_MODE` | `1` only for a demo deployment; production should omit it |
| `VITE_DEMO_MODE` | `1` only for a demo deployment; baked in at build time |

`DEVICE_API_KEY` is optional in dev (default `dev-device-key`). After adding
variables, trigger **Redeploy** (or push again) — pushes to `main` deploy
automatically since the project is GitHub-connected.

**Demo mode is opt-in in production.** Without `DEMO_MODE=1` the API rejects
the shared `demo1234` password; without `VITE_DEMO_MODE=1` the role switcher is
hidden and the build has no demo affordances. This keeps a real deployment from
shipping four shared accounts. Local development still turns both on
automatically.

## Demo accounts

All seeded users share the password **`demo1234`** while demo mode is enabled. Sign in with the `custom_id` or email. On a production non-demo deployment, use `POST /api/auth/change-password` (or the seeded account's real password) and leave `DEMO_MODE` unset.

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
6. **Accreditation** — learner opens **Become a Tutor** (`/exam`): picks subjects, uploads proof files (PDF, DOC/DOCX, PNG, JPG/WEBP; 4 MB each, up to 5), and may add academic-record notes. Thumbnails appear before submit, then files upload one-by-one (keeps each request under Vercel's 4.5 MB body cap). Submitting lands on `/tutor-pending` with the files, the one-shot server-graded exam, and live approval polling; the applicant can still add or withdraw files while pending. Superadmin reviews the attachments and approves → `is_verified` + `certified_by_id`; approval is blocked until at least one file is attached.

## API routes (mounted under `/api`)

| Route | Method(s) | Role | Purpose |
| --- | --- | --- | --- |
| `/public/overview` | GET | public | anonymous landing stats: tutor count, hours, points, active subjects, honour roll (60s micro-cache) |
| `/health` | GET | public | API **and** database probe; 503 with the reason when the pool or `DATABASE_URL` is down |
| `/auth/login` · `/auth/me` · `/auth/dev-accounts` | POST · GET | public / authed | bcrypt auth; the JWT rides in an **HttpOnly, SameSite=Strict cookie** (API scripts may use `Authorization: Bearer`); dev-accounts only in dev + demo mode |
| `/auth/change-password` · `/auth/logout` · `/auth/logout-all` | POST | authed | rotates the password / clears this browser / bumps `token_version` so every older JWT is rejected |
| `/referrals` · `/referrals/:id/assign` · `/referrals/:id/status` · `DELETE /referrals/:id` · `/referrals/search-students` · `/referrals/export.csv` | GET POST PATCH DELETE | faculty/superadmin · scoped | referral lifecycle: flagged → assigned → in-progress → resolved; faculty may reject a flagged one; superadmin may hard-delete **rejected** referrals only (codes auto-renumber from the highest existing); board export is formula-safe CSV |
| `/subjects` · `/tutors` · `/session-requests` | GET POST | authed · accept/decline | matching: accreditation-gated requests, double-accept blocked |
| `/sessions/mine` · `/sessions/:id/stage-token` · `/sessions/:id/check-in` | GET POST | tutor/participant | check-in tokens (10-min TTL, one-shot), 2 confirmations start session |
| `/sessions/:id/wrap-up` | POST | participant | **one transaction**: end, notes, rating, hours-debit, auto-resolve, points, badges |
| `/device/import-roster` · `/device/roster` · `/device/verify` | POST GET | `X-Device-Key` | physical check-in via device fingerprint |
| `/rewards` · `/rewards/:id/redeem` · `/wallet` | GET POST | authed | catalog, server-side grading redemption (`FOR UPDATE` stock, ledger debit, voucher) |
| `/notifications` | GET PATCH | authed | per-user feed + mark-all-read |
| `/accreditation/apply` · `/accreditation/exam` · `/accreditation/mine` | GET POST | learner/authed | apply with subjects + academic-record notes (`achievements` jsonb); exam questions never expose answers; grading is one-shot |
| `/accreditation/:id/documents` · `/accreditation/documents/:id` | GET POST DELETE | owner/superadmin | supporting files stored in Postgres (`bytea`): multipart `document`, 4 MB each, 5 per application; owner may withdraw while pending; superadmin reads for review |
| `/accreditation/applications` · `/:id/approve` · `/:id/reject` | GET POST | superadmin | approve requires the exam **and** ≥1 attached file; sets `is_verified` + `certified_by_id` |
| `/accreditation/:id/reset-exam` | POST | superadmin | clears an expired/frozen exam attempt without touching the application |
| `/audit` | GET | superadmin | append-only audit trail (approvals, exams, referrals, redemptions, logins) |
| `/analytics` | GET | superadmin | CTE aggregates: KPIs, 6-week trend, dept breakdown |

> **Supporting files** live in `application_documents` (`bytea`) — no object
> storage or writable disk. `multer` parses one multipart `document` per request,
> magic bytes must match the extension (a renamed executable is rejected), and the
> 4 MB/5-file caps keep every upload inside Vercel's 4.5 MB body limit.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run db:reset` | drop schema → `db/schema.sql` → mark migrations → `db/seed.sql` (destructive — see the warning above) |
| `npm run db:migrate` | apply pending `db/migrations/*.sql` (transactional; safe on hosted databases) |
| `npm test` | unit tests for upload validation and weekly point caps (Node test runner) |
| `npm run demo:stage` | stage the presentation states through the API (`DEMO:`-tagged, re-runnable, insert-only; set `DEMO_API_BASE` for the hosted site) |
| `npm run demo:check` | readiness gate: health, demo mode, all four role logins, every page endpoint, staged states (`--warm` pre-warms the serverless function) |
| `npm run db:backup` | `pg_dump` a portable SQL backup into `backups/` (gitignored) |
| `npm run db:export -- TE-128` | read-only data-subject export (JSON, no document bytes) |
| `npm run db:purge` | dry-run retention purge; `-- --apply` deletes old decided-application files and notifications |
| `npm run server` | Express API on `PORT` (embedded PG auto-boot) |
| `npm run dev` | Vite only |
| `npm run start` | both servers together |
| `node server/scripts/e2e-all.js` | runs the full end-to-end suite (referrals, matching, check-in, wrap-up, rewards, accreditation, analytics, ledger integrity, auth revocation, audit immutability, concurrency/anti-farming) — best against a scratch local database |

> Presenting? Follow [`DEMO.md`](DEMO.md) — it covers staging, the readiness
> gate, the four-act script, and the offline fallback.

## Integrity, privacy, and operations

- **Session points** require two distinct check-ins before wrap-up. Weekly caps
  (500 tutor / 250 learner) limit session farming; the session still completes
  and the cap is returned in the response.
- **Redemptions** lock the spender and reward rows, derive the balance from the
  append-only ledger, and write the stock change, debit, voucher, and audit row
  in one transaction. Concurrent redemptions cannot overdraw a wallet.
- **Exam clock** is server-side: opening the paper starts a 30-minute window;
  the answer key never leaves the API. A superadmin can reset a stranded attempt.
- **Session security**: the 12-hour JWT is delivered in an HttpOnly,
  SameSite=Strict cookie; JavaScript never reads it, and `api.js` sends
  `credentials: 'include'`. `users.token_version` is checked on every request,
  so a password change or `logout-all` invalidates every issued JWT immediately.
- **Audit trail**: `audit_log` is append-only at the database level. Approval,
  exam, referral, redemption, upload/delete, login, and password events are
  recorded with actor, IP, and detail. Superadmins read it at `GET /api/audit`.
- **Retention**: `npm run db:purge` is a dry run by default. It deletes only
  decided-application files and old notifications; ledger, audit, sessions, and
  decisions are never purged. Remote purge requires `ALLOW_HOSTED_PURGE=1`.
- **CI** (`.github/workflows/ci.yml`) boots Postgres 16, applies schema + seed,
  runs unit tests and the production build, then stages the demo against the
  real API and runs the readiness gate.

## Project layout

```
db/schema.sql          source-of-truth DDL (incl. platform tables, triggers, views);
                       sessions.duration_hours is the numeric hour source of truth (DEFAULT 1)
db/seed.sql            demo data (39 users; password demo1234; UTF-8)
db/migrations/         numbered migration files (marked applied on reset);
                       002_session_duration_and_seed_repair.sql backfills numeric durations;
                       004_application_documents.sql adds the upload table;
                       005_trust_and_integrity.sql adds token_version, the exam clock,
                       booking/application guards, and the append-only audit log
server/                Express app, one pg Pool (`server/db.js`), routes, middleware
server/scripts/        db-reset + db-migrate + backups/export/purge + demo staging/check + e2e scripts
server/lib/            upload validation, weekly caps, audit helper, unit tests
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
