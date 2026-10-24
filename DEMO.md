# LCCB Academix — presentation runbook

One page for rehearsals and showtime. Everything here is non-destructive:
`demo:stage` only **adds** showcase records through the public API, and
`demo:check` is read-only.

- **Live**: <https://lccb-academix.vercel.app> (API on the same origin, `/api`)
- **Local**: `npm run start` → Vite on <http://localhost:5173>, API on <http://localhost:4000/api>
- **Presentation assets**: this file, `demo:stage`, `demo:check`.

## Accounts (password `demo1234`)

| Role | Login | What it shows |
| --- | --- | --- |
| Learner | `TE-128` | wizard, sessions, check-in, wallet, rewards, tutor application |
| Tutor | `TU-042` | requests, sessions, check-in staging, rewards, exam view |
| Faculty | `b.tisuela@lccbacolod.edu.ph` | referral board (flag → assign → resolve/reject) |
| Superadmin | `l.betita.admin@lccbacolod.edu.ph` | analytics, referral board, rejected panel, approvals |

The sidebar **Demo role** switcher changes roles without retyping credentials —
that is intentional for the presentation (the quick-login chips on the sign-in
card are dev-only).

## 15 minutes before

1. Confirm the Vercel project has `DATABASE_URL`, `JWT_SECRET` and
   `FRONTEND_ORIGIN` set (Project → Settings → Environment Variables), then
   redeploy if you just added them.
2. Stage the showcase data and run the readiness gate:

   ```powershell
   $env:DEMO_API_BASE="https://lccb-academix.vercel.app"
   npm run demo:stage
   npm run demo:check -- https://lccb-academix.vercel.app --warm
   ```

   Locally (repeatable, free):

   ```powershell
   npm run demo:stage
   npm run demo:check
   ```

3. Open the landing page once to warm the function, then sign in as the learner
   and leave the dashboard up.

`demo:check` must end with **DEMO READY ✅**. Any **FAIL** line names the fix
(most often: run `demo:stage`, or set the missing Vercel env vars).

## The four acts (~8 minutes)

**Act 0 — Landing (1 min).** Hero cube scene (pure CSS, tilts with the pointer),
live ledger counters from `/public/overview`, sign in as `TE-128`.

**Act 1 — Learner books a tutor (2 min).** Workspace → *Find a tutor*. Pick a
subject (e.g. **PROG 201**), choose `TU-042`, send the request. Switch to
**Tutor** → the request is waiting → accept it. Switch back to **Learner** —
the session is now *upcoming*.

**Act 2 — Verified check-in and wrap-up (2 min).** As **Tutor** → *Check-in* →
stage an OTP for the session and show it. As **Learner** → *Check-in* → enter
the OTP. Back as **Tutor** → confirm with a fresh OTP. The session flips to
*in progress*; wrap it up with notes + a rating. The learner instantly gains
25 points, the tutor 50 — both are append-only ledger rows. Finish in
*Rewards* by redeeming the 100-point library pass (staged balance covers it).

**Act 3 — Referral pipeline (1.5 min).** As **Faculty** → **Referral board** in
the sidebar. The board has five columns. Assign a tutor to the `DEMO: Flagged`
referral, then show the `Reject` action on another flagged row. (The **New
referral** wizard is the second sidebar item if you want to demonstrate
flagging a learner live.) As **Superadmin** → dashboard → the *Rejected
referrals* panel → **Remove** (only a superadmin, only while rejected; the
session history survives via `ON DELETE SET NULL`).

**Act 4 — Accreditation and analytics (1.5 min).** As **Superadmin** →
**Tutor approvals**. The staged applicant already sat the exam and has a demo
file attached, so open the file (thumbnail, then **Open**) and **Approve**.
Both conditions are real gates: no exam or no file → 409. Open **Overview** for
the KPI/trend view. Close on the API story: one pool, append-only ledger,
transactional wrap-up, attachments in Postgres, 409 guards against double
accept/check-in/redeem/approve.

## Rehearsal notes

- Re-run `npm run demo:stage` after each full rehearsal: it re-creates the
  rejected referral if you removed it, moves the pending application to the
  next cohort candidate (attaching the demo file if it has none), and tops the
  wallet back up if you redeemed.
- `npm run db:migrate` before rehearsals if new `db/migrations/*.sql` landed —
  it only applies pending files and never drops data.
- If a login returns **429**, the per-IP limiter counted repeated failures;
  wait a minute. Successful logins do not count.
- If `demo:check` reports `health` failing with `database unreachable`, the
  hosted database is asleep/unreachable or `DATABASE_URL` is wrong — retry once,
  then check the Vercel env vars.

## Offline fallback (never touches the hosted DB)

```powershell
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/lccb_academix"
npm run db:reset          # local embedded cluster only — rebuilds demo data
npm run start             # API + Vite
# second terminal
npm run demo:stage
npm run demo:check
```

Then present from <http://localhost:5173>. `db:reset` is destructive: **only**
run it against the local embedded cluster, never against Supabase.

## Do-not list

- Do not run `npm run db:reset` with a hosted `DATABASE_URL`.
- Do not push during the demo window (Vercel redeploys can cold-start the API).
- Do not `DELETE` anything except the rejected referral through the guarded
  superadmin action; the ledger and sessions are append-only by design.
