# Graph Report - lccb-academix  (2026-11-09)

## Corpus Check
- 210 files · ~160,937 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .bat 3, .css 3, (none) 2)

## Summary
- 1156 nodes · 2362 edges · 90 communities (71 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a10d6c7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- src/screens/Dashboard.jsx
- next-app-archived/package.json
- cn
- ref_react
- CentrifugoService
- dependencies
- Chapter 3
- WsRealtimeService
- next.config.mjs
- dependencies
- data.js
- pg-embed.js
- Run The Demo — LCCB Academix
- db-migrate.js
- routes/index.js
- SuperadminApprovals.jsx
- devDependencies
- cn
- App.jsx
- vite.config.js
- query
- e2e-cancel.js
- e2e-messages.js
- jitsi.d.ts
- CFD & DFD — Yourdon Notation (Mermaid Source)
- devDependencies
- scripts
- next-app-archived/README.md
- e2e-chat-ai.js
- stage-notifications.js
- compilerOptions
- repository
- AGENTS.md
- postcss.config.mjs
- bugs
- engines
- optionalDependencies
- app.js
- generate_dfd0.py
- middleware/auth.js
- pg
- ref_node_fs
- capture_pagination_screenshots.js
- src/lib/publicProfile.js
- api.js
- httpError
- ai.js
- LearnerWizard.jsx
- db-backup.js
- ref_node_child_process
- test_mobile_scroll.js
- capture_classroom_screenshots.js
- reproduce_screenshots.js
- reproduce_tutor.js
- capture_messages_screenshots.js
- check_page.js
- capture_universal_profiles.js
- GoogleClassroomSessions.jsx
- capture_my_tutors_screenshots.js
- e2e-accreditation.js
- ref_node_path
- capture_matchmaking_screenshots.js
- wrapup.js
- pooler-probe.js
- test_wizard.js
- e2e-audit.js
- e2e-concurrency.js
- e2e-db.js
- Chapter 3: Methodology
- build_docx.py
- application-files.js
- LCCB Academix
- Operations runbook
- scripts
- demo-stage.js
- demo-check.js
- e2e-matching.js
- vercel.json
- Context Flow Diagram (CFD) — LCCB Academix
- eslint.config.mjs
- e2e-auth.js
- e2e-analytics.js
- e2e-checkin.js
- e2e-rewards.js

## God Nodes (most connected - your core abstractions)
1. `cn()` - 70 edges
2. `Button` - 46 edges
3. `query()` - 39 edges
4. `CentrifugoService` - 30 edges
5. `WsRealtimeService` - 25 edges
6. `App()` - 23 edges
7. `MockRealtimeService` - 23 edges
8. `express` - 21 edges
9. `httpError()` - 21 edges
10. `Avatar()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/check_empty_learner.js → server/db.js
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/check_messages_avatar.js → server/db.js
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/test_my_tutors_query.js → server/db.js
- `test()` --calls--> `query()`  [EXTRACTED]
  scratch/test_sessions_query.js → server/db.js
- `handler()` --calls--> `app`  [EXTRACTED]
  api/index.js → server/app.js

## Import Cycles
- None detected.

## Communities (90 total, 19 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (34): author, description, homepage, canvas-confetti, clsx, framer-motion, lucide-react, @radix-ui/react-avatar (+26 more)

### Community 1 - "src/screens/Dashboard.jsx"
Cohesion: 0.21
Nodes (14): Pagination(), addDaysYmd(), localYmd(), Dashboard(), fmtDate(), fmtLongDate(), fmtPoints(), initialsOf() (+6 more)

### Community 2 - "next-app-archived/package.json"
Cohesion: 0.09
Nodes (22): canvas-confetti, clsx, framer-motion, lucide-react, @radix-ui/react-avatar, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-progress (+14 more)

### Community 3 - "cn"
Cohesion: 0.11
Nodes (35): Page(), Page(), Page(), geistMono, geistSans, metadata, RootLayout(), Page() (+27 more)

### Community 4 - "ref_react"
Cohesion: 0.21
Nodes (16): DualPurposeChat(), ROLE_BADGES, JitsiMeetingRoom, LiveClassroom(), NativeVideoRoom(), RTC_CONFIG, SessionQuizModal(), Button (+8 more)

### Community 5 - "CentrifugoService"
Cohesion: 0.06
Nodes (18): centrifuge, zod, runTests(), ErrorBoundary, CentrifugoService, ChatEnvelopeSchema, getCentrifugoService(), getDefaultTokenEndpoint() (+10 more)

### Community 6 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, animejs, bcryptjs, canvas-confetti, centrifuge, clsx, concurrently, cookie-parser (+27 more)

### Community 7 - "Chapter 3"
Cohesion: 0.07
Nodes (26): Chapter 1, Chapter 2, Chapter 3, Context Free Diagram (CFD), Cost-Benefit Analysis, Data Flow Diagram (Level 0 DFD), Definition of Terms, Development Cost (+18 more)

### Community 10 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, canvas-confetti, clsx, framer-motion, lucide-react, next, @radix-ui/react-avatar, @radix-ui/react-dialog (+11 more)

### Community 11 - "data.js"
Cohesion: 0.12
Nodes (16): BADGES, CALENDAR_SLOTS, CHART_DATA_HOURS, CHART_DATA_SESSIONS, EXAM_QUESTIONS, NOTIFICATIONS, REFERRALS, REWARDS (+8 more)

### Community 13 - "pg-embed.js"
Cohesion: 0.17
Nodes (14): embedded-postgres, DATA_DIR, ensurePostgres(), portIsOpen(), postgisReachable(), root, stopEmbeddedPostgres(), urlParts() (+6 more)

### Community 14 - "Run The Demo — LCCB Academix"
Cohesion: 0.17
Nodes (11): 1. Reset the demo database (fresh demo data), 2. Start the API, 3. Stage the demo data (API must already be running), 4. Start the frontend, 5. Open it, 6. Log in, 7. Run the gates (optional but recommended), Prerequisites (+3 more)

### Community 15 - "db-migrate.js"
Cohesion: 0.20
Nodes (7): dbDir, here, local, parsed, pool, here, scripts

### Community 16 - "routes/index.js"
Cohesion: 0.15
Nodes (11): express, toPublicProfile(), router, router, router, router, overviewCache, router (+3 more)

### Community 17 - "SuperadminApprovals.jsx"
Cohesion: 0.10
Nodes (37): animejs, ApplicationDocumentPicker(), ApplicationFileList(), DocumentThumb(), Logo2D(), SplashScreen(), ALLOWED_EXTENSIONS, APPLICATION_FILE_ACCEPT (+29 more)

### Community 18 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, embedded-postgres, postcss, tailwindcss, @tailwindcss/vite, typescript, vite (+1 more)

### Community 19 - "cn"
Cohesion: 0.15
Nodes (22): Badge(), BadgeDisplay(), BadgeList(), Card, CardContent, CardDescription, CardFooter, CardHeader (+14 more)

### Community 20 - "App.jsx"
Cohesion: 0.12
Nodes (27): App(), Dashboard, DEMO_ROLES, FacultyReferral, initialsOf(), LearnerWizard, Messages, MyTutors (+19 more)

### Community 21 - "vite.config.js"
Cohesion: 0.33
Nodes (4): @tailwindcss/vite, vite, @vitejs/plugin-basic-ssl, @vitejs/plugin-react

### Community 22 - "query"
Cohesion: 0.24
Nodes (9): main(), main(), main(), test(), missingUrlError(), pool, query(), withTransaction() (+1 more)

### Community 23 - "e2e-cancel.js"
Cohesion: 0.40
Nodes (3): later, login(), request()

### Community 24 - "e2e-messages.js"
Cohesion: 0.40
Nodes (3): later, login(), request()

### Community 25 - "jitsi.d.ts"
Cohesion: 0.33
Nodes (5): JitsiErrorEvent, JitsiMeetingRoomHandle, JitsiMeetingRoomProps, JitsiParticipant, Window

### Community 26 - "CFD & DFD — Yourdon Notation (Mermaid Source)"
Cohesion: 0.40
Nodes (4): CFD & DFD — Yourdon Notation (Mermaid Source), Figure 1 — Context Flow Diagram (CFD), Figure 2 — Data Flow Diagram, Level 0 (DFD), Rendering notes

### Community 27 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss

### Community 28 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 29 - "next-app-archived/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 31 - "stage-notifications.js"
Cohesion: 0.67
Nodes (3): BASE, login(), request()

### Community 33 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

### Community 41 - "app.js"
Cohesion: 0.09
Nodes (25): handler(), cors, dotenv, express-rate-limit, helmet, jsonwebtoken, morgan, app (+17 more)

### Community 42 - "generate_dfd0.py"
Cohesion: 0.14
Nodes (12): hit_bottom(), hit_left(), hit_right(), hit_top(), open_arrow_head(), orthogonal_arrow(), hit_bottom(), hit_left() (+4 more)

### Community 43 - "middleware/auth.js"
Cohesion: 0.20
Nodes (13): clearSessionCookie(), readCookie(), requestToken(), SESSION_COOKIE, setSessionCookie(), requireAuth(), requireRole(), signToken() (+5 more)

### Community 44 - "pg"
Cohesion: 0.20
Nodes (8): pg, c, t0, apply, client, days, local, notificationDays

### Community 45 - "ref_node_fs"
Cohesion: 0.22
Nodes (5): s, dir, main, sizes, totalGzip

### Community 46 - "capture_pagination_screenshots.js"
Cohesion: 0.50
Nodes (7): run(), capture(), loginAs(), send(), waitForApp(), sleep(), TEMP_PROFILE

### Community 48 - "api.js"
Cohesion: 0.31
Nodes (6): ApiError, request(), requestBlob(), fmtInboxTime(), fmtTime(), Messages()

### Community 49 - "httpError"
Cohesion: 0.11
Nodes (22): uploadApplicationDocument(), audit(), requestIp(), errorHandler(), httpError(), notFound(), readableApplication(), router (+14 more)

### Community 50 - "ai.js"
Cohesion: 0.47
Nodes (4): @google/genai, generateTutoringHint(), generateWrapUpSynthesis(), router

### Community 51 - "LearnerWizard.jsx"
Cohesion: 0.15
Nodes (18): react-router-dom, MatchmakingAnimation(), STATUS_MESSAGES, Avatar(), getInitials(), SIZE_MAP, AVAILABILITY, GOALS (+10 more)

### Community 52 - "db-backup.js"
Cohesion: 0.20
Nodes (9): args, dir, local, password, result, stamp, target, url (+1 more)

### Community 53 - "ref_node_child_process"
Cohesion: 0.29
Nodes (5): run(), send(), sleep(), TEMP_PROFILE, processes

### Community 54 - "test_mobile_scroll.js"
Cohesion: 0.50
Nodes (4): run(), send(), sleep(), TEMP_PROFILE

### Community 55 - "capture_classroom_screenshots.js"
Cohesion: 0.47
Nodes (5): run(), send(), waitForApp(), sleep(), TEMP_PROFILE

### Community 56 - "reproduce_screenshots.js"
Cohesion: 0.50
Nodes (4): run(), send(), sleep(), TEMP_PROFILE

### Community 57 - "reproduce_tutor.js"
Cohesion: 0.50
Nodes (4): run(), send(), sleep(), TEMP_PROFILE

### Community 58 - "capture_messages_screenshots.js"
Cohesion: 0.47
Nodes (5): run(), send(), waitForApp(), sleep(), TEMP_PROFILE

### Community 59 - "check_page.js"
Cohesion: 0.40
Nodes (5): run(), send(), sleep(), SUPERADMIN_USER, TEMP_PROFILE

### Community 61 - "capture_universal_profiles.js"
Cohesion: 0.47
Nodes (5): run(), send(), waitForApp(), sleep(), TEMP_PROFILE

### Community 62 - "GoogleClassroomSessions.jsx"
Cohesion: 0.40
Nodes (8): fmtShortDate(), GoogleClassroomSessions(), SkeletonCard(), STATUS_FILTERS, StatusBadge(), fmtDate(), getSubjectBannerPalette(), SessionDetailModal()

### Community 63 - "capture_my_tutors_screenshots.js"
Cohesion: 0.47
Nodes (5): run(), send(), waitForApp(), sleep(), TEMP_PROFILE

### Community 64 - "e2e-accreditation.js"
Cohesion: 0.25
Nodes (5): CORRECT, DEMO_PNG, login(), psql, request()

### Community 65 - "ref_node_path"
Cohesion: 0.29
Nodes (5): run(), send(), sleep(), TEMP_PROFILE, client

### Community 66 - "capture_matchmaking_screenshots.js"
Cohesion: 0.50
Nodes (7): run(), capture(), loginAs(), send(), waitForApp(), sleep(), TEMP_PROFILE

### Community 67 - "wrapup.js"
Cohesion: 0.50
Nodes (5): awardWithinCap(), SESSION_POINTS_EARNED_SQL, WEEKLY_LEARNER_SESSION_CAP, WEEKLY_TUTOR_SESSION_CAP, router

### Community 68 - "pooler-probe.js"
Cohesion: 0.25
Nodes (6): CLUSTERS, hits, PASSWORD, REF, REGIONS, src

### Community 69 - "test_wizard.js"
Cohesion: 0.53
Nodes (5): run(), send(), takeShot(), sleep(), TEMP_PROFILE

### Community 70 - "e2e-audit.js"
Cohesion: 0.50
Nodes (3): client, login(), request()

### Community 71 - "e2e-concurrency.js"
Cohesion: 0.50
Nodes (3): client, login(), request()

### Community 111 - "e2e-db.js"
Cohesion: 0.20
Nodes (9): E2E_DATABASE_URL, host, LOCAL_HOSTS, client, login(), request(), login(), psql (+1 more)

### Community 261 - "Chapter 3: Methodology"
Cohesion: 0.06
Nodes (32): Chapter 1: Introduction, Chapter 2: Review of Related Literature and Studies, Chapter 3: Methodology, Context Flow Diagram (CFD), Cost-Benefit Analysis, Data Flow Diagram (Level 0 DFD), Definition of Terms, Development Cost (+24 more)

### Community 359 - "build_docx.py"
Cohesion: 0.11
Nodes (6): add_fig(), add_runs(), caption(), flush_table(), flush_table_check(), para()

### Community 404 - "application-files.js"
Cohesion: 0.09
Nodes (22): multer, APPLICATION_FILE_ACCEPT, contentMatchesExtension(), EXTENSION_MIME, fileExtension(), MAX_APPLICATION_FILE_BYTES, MAX_APPLICATION_FILES, doc (+14 more)

### Community 481 - "LCCB Academix"
Cohesion: 0.10
Nodes (18): 15 minutes before, Accounts (password `demo1234`), Do-not list, LCCB Academix — presentation runbook, Offline fallback (never touches the hosted DB), Rehearsal notes, The four acts (~8 minutes), API routes (mounted under `/api`) (+10 more)

### Community 624 - "Operations runbook"
Cohesion: 0.12
Nodes (14): Backups and restore, CI and checks, Deploy, Environment, Migrations, Operations runbook, Retention and subject requests, Rollback (+6 more)

### Community 672 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, check:bundle, db:backup, db:export, db:migrate, db:purge, db:reset (+9 more)

### Community 847 - "demo-stage.js"
Cohesion: 0.21
Nodes (9): COHORT_APPLICANTS, completeDemoSession(), DEMO_PNG, ensureDemoDocument(), login(), ORIGIN, request(), subjectByCode (+1 more)

### Community 1217 - "demo-check.js"
Cohesion: 0.29
Nodes (6): args, login(), ORIGIN, request(), warm, WEB

### Community 1518 - "e2e-matching.js"
Cohesion: 0.50
Nodes (3): later, login(), request()

### Community 1587 - "vercel.json"
Cohesion: 0.40
Nodes (4): maxDuration, functions, api/index.js, rewrites

### Community 1600 - "Context Flow Diagram (CFD) — LCCB Academix"
Cohesion: 0.50
Nodes (3): Context Flow Diagram (CFD) — LCCB Academix, External Entities & Data Flows, Role-to-Screen Mapping (from codebase)

### Community 1601 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

## Knowledge Gaps
- **395 isolated node(s):** `eslintConfig`, `paths`, `nextConfig`, `name`, `version` (+390 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 486 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-router-dom` connect `LearnerWizard.jsx` to `package.json`, `src/screens/Dashboard.jsx`, `ref_react`, `CentrifugoService`, `api.js`, `SuperadminApprovals.jsx`, `cn`, `App.jsx`, `GoogleClassroomSessions.jsx`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `paths`, `nextConfig` to the rest of the system?**
  _395 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Why does `dotenv` connect `app.js` to `package.json`, `ref_node_path`, `pooler-probe.js`, `pg`, `pg-embed.js`, `db-migrate.js`, `db-backup.js`, `query`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `next-app-archived/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `pg` connect `pg` to `package.json`, `e2e-accreditation.js`, `ref_node_path`, `pooler-probe.js`, `e2e-audit.js`, `e2e-concurrency.js`, `pg-embed.js`, `db-migrate.js`, `e2e-db.js`, `query`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.11008704557091654 - nodes in this community are weakly interconnected._