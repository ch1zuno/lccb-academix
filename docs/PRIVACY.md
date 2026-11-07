# Privacy and data protection notes

This is an operational baseline for LCCB Academix, not a substitute for the
college's legal review. It documents what the system stores, who can see it,
how long it is kept, and the tools already in the repository.

## Data map

| Data | Where | Who can read it |
| --- | --- | --- |
| School ID, name, institutional email, role, program/department | `users` | the user; faculty/superadmin through role-scoped screens; superadmin exports |
| Password hash (bcrypt) | `users.password_hash` | nobody (never returned by the API) |
| Referral topic, urgency, hours, notes | `referrals` | the learner, referring faculty, assigned tutor, superadmin |
| Session topic, date/time, notes, rating | `sessions` | the two participants, faculty attached to the session, superadmin |
| Check-in confirmations / fingerprints | `session_check_ins`, `device_fingerprints` | participants and the device integration; fingerprints are identifiers, not images |
| Points ledger and redemptions | `points_ledger`, `redemptions` | the owner, superadmin; the ledger is append-only |
| Accreditation application, exam grades, achievements | `tutor_applications` | the applicant and superadmin reviewers |
| Supporting documents (PDF/DOC/DOCX/PNG/JPG/WEBP) | `application_documents.data` (`bytea`) | the applicant and superadmin reviewers; downloads are authenticated and `no-store` |
| Audit trail (actor, action, entity, IP, detail) | `audit_log` | superadmin; append-only at the database level |
| Notifications | `notifications` | the recipient |

The landing page reads only anonymous aggregates (counts, hours, points,
subject and honor-roll summaries) and never names a learner or exposes contact
details.

## Retention

- Supporting documents for **decided** applications: 365 days by default
  (`RETENTION_DAYS`), then eligible for `npm run db:purge`.
- Read notifications: 365 days by default (`NOTIFICATION_DAYS`).
- Ledger, audit, sessions, referrals, and accreditation decisions are retained
  because they are the institutional record; they are not removed by the purge
  script. An approved erasure request should anonymize the user profile while
  retaining non-identifying aggregate/ledger history, with legal review.
- Backups (`backups/`) and subject exports (`exports/`) are gitignored and
  contain personal data; store them encrypted and delete them when no longer
  needed.

## Subject access and erasure

- Export: `npm run db:export -- <school-id-or-email>` writes a JSON file with
  the profile, wallet ledger, sessions, referrals, applications, document
  metadata, redemptions, and notifications. It does not include document bytes;
  those are available through the authenticated review workflow.
- Erasure: there is no destructive self-service endpoint. The supported path is
  a reviewed request to the data protection officer, followed by a documented
  anonymization/retention decision. Never run a bulk delete against a hosted
  database without a verified backup.
- Correction: role-scoped screens and the superadmin can correct profile and
  referral data; password changes are self-service through
  `POST /api/auth/change-password`.

## Access control

- The 12-hour JWT is stored in an HttpOnly, SameSite=Strict, Secure-in-production
  cookie; browser JavaScript never sees it. `users.token_version` is checked on
  every request, so `POST /api/auth/logout-all` and password changes revoke all
  existing tokens immediately. Signing out also clears the cookie server-side.
- Course/role scoping is enforced on the server, not only hidden in the UI.
- Supporting documents are streamed only to the applicant or a superadmin;
  metadata responses never include bytes.
- The demo role switcher and shared `demo1234` password are disabled in
  production unless `DEMO_MODE=1` / `VITE_DEMO_MODE=1` are explicitly set.
- File uploads require a matching extension and magic bytes; each file is
  capped at 4 MB and each application at five files.

## Incidents

1. Set `JWT_SECRET` to a new random value (or call `logout-all` for affected
   users) to invalidate sessions.
2. Disable `DEMO_MODE`/`VITE_DEMO_MODE` and redeploy.
3. Preserve `audit_log`; do not delete it.
4. Rotate the database password and `DEVICE_API_KEY`.
5. Follow the college's breach-notification policy; the export/audit tools
   provide the affected-user list and action history.
