# Operations runbook

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase **Session pooler** URI or local Postgres. Remote hosts use SSL automatically. |
| `JWT_SECRET` | yes in production | long random value; changing it invalidates every token |
| `FRONTEND_ORIGIN` | yes on Vercel | exact deployed origin for CORS |
| `DEMO_MODE` | demo only | `1` enables the shared demo password |
| `VITE_DEMO_MODE` | demo only | `1` keeps the role switcher; baked in at build time |
| `DEVICE_API_KEY` | physical readers | rotate if a reader is lost |
| `RETENTION_DAYS` / `NOTIFICATION_DAYS` | optional | purge policy, defaults 365 |

Never commit `.env`. `npm run db:reset` is destructive and refuses non-local
hosts unless `ALLOW_REMOTE_DB_RESET=1`; do not use that flag on a live database.

## Deploy

1. `npm ci`
2. Set/verify the Vercel env vars above.
3. Apply migrations with the hosted `DATABASE_URL`:
   `npm run db:migrate`.
4. Redeploy (`main` auto-deploys through the GitHub integration).
5. Check `GET /api/health`: it returns `ok`, `database: "up"`, `demoMode`, and
   the latest migration filename. A 503 means the pool or `DATABASE_URL` is not
   usable.
6. For a demo deployment only: `npm run demo:stage`, then
   `npm run demo:check -- https://… --warm`.

## Backups and restore

- Create a dump: `npm run db:backup` (uses `pg_dump`; set `PG_DUMP` if it is not
  on PATH). Files land in `backups/` and are gitignored.
- Restore into a scratch database first:
  `psql "postgres://…/scratch" < backups/<file>.sql`.
- Verify row counts and `schema_migrations` before pointing the API at the
  restored database. A hosted restore should be a deliberate maintenance-window
  operation, not part of a routine deploy.

## Migrations

- Numbered, transactional files in `db/migrations/`.
- `db/schema.sql` is the source of truth for a fresh reset and mirrors every
  migration; when adding a migration, update the schema too.
- `npm run db:migrate` records filenames in `schema_migrations` and skips
  applied files. It never runs `db:reset`.
- Migration 004 adds document storage; 005 adds token revocation, the exam
  clock, integrity guards, and `audit_log`. Both must be applied on an existing
  hosted database.

## Retention and subject requests

- `npm run db:purge` is a dry run. `-- --apply` deletes only old
  decided-application documents and read notifications. Remote purge requires
  `ALLOW_HOSTED_PURGE=1` after a verified backup.
- `npm run db:export -- <school-id>` writes a read-only subject export.
- See [`PRIVACY.md`](PRIVACY.md) for the data map and incident checklist.

## CI and checks

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR:

1. Postgres 16 service, schema + seed
2. `npm test`
3. `npm run build` + `npm run check:bundle`
4. boot the real API
5. `npm run demo:stage` + `npm run demo:check`

Local e2e (scratch database only):

```powershell
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/lccb_academix"
node server/scripts/e2e-all.js
```

The e2e scripts refuse non-local hosts because they create users, applications,
sessions, and probe append-only constraints.

## Rollback

- Code: redeploy the previous Vercel deployment or revert the commit.
- Database: restore a verified backup into a new database, run
  `npm run db:migrate`, and switch `DATABASE_URL`; do not edit production tables
  by hand during an incident.
- Tokens: rotate `JWT_SECRET` or call `/api/auth/logout-all` for the affected
  accounts.
