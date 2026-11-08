# Graph Report - lccb-academix  (2026-11-09)

## Corpus Check
- 203 files · ~156,410 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .bat 3, .css 3, (none) 2)

## Summary
- 1119 nodes · 2268 edges · 83 communities (64 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f7f5476`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- cn
- next-app-archived/package.json
- cn
- Button
- CentrifugoService
- dependencies
- Chapter 3
- WsRealtimeService
- next.config.mjs
- dependencies
- data.js
- pg-embed.js
- Run The Demo — LCCB Academix
- ref_node_path
- routes/index.js
- SuperadminApprovals.jsx
- devDependencies
- src/screens/Dashboard.jsx
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
- matching.js
- ref_node_fs
- wrapup.js
- src/lib/publicProfile.js
- Login.jsx
- httpError
- api.js
- AccountDialog.jsx
- db-backup.js
- capture_after_screenshots.js
- GoogleClassroomSessions.jsx
- capture_classroom_screenshots.js
- ref_node_child_process
- reproduce_tutor.js
- capture_messages_screenshots.js
- check_page.js
- capture_universal_profiles.js
- Messages.jsx
- capture_my_tutors_screenshots.js
- test-centrifugo.js
- pg
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
1. `cn()` - 66 edges
2. `Button` - 44 edges
3. `query()` - 39 edges
4. `CentrifugoService` - 30 edges
5. `WsRealtimeService` - 25 edges
6. `App()` - 23 edges
7. `MockRealtimeService` - 23 edges
8. `express` - 21 edges
9. `httpError()` - 21 edges
10. `Avatar()` - 19 edges

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

## Communities (83 total, 19 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (34): author, description, homepage, canvas-confetti, clsx, framer-motion, lucide-react, @radix-ui/react-avatar (+26 more)

### Community 1 - "cn"
Cohesion: 0.16
Nodes (22): Badge(), BadgeDisplay(), BadgeList(), Card, CardContent, CardDescription, CardFooter, CardHeader (+14 more)

### Community 2 - "next-app-archived/package.json"
Cohesion: 0.09
Nodes (22): canvas-confetti, clsx, framer-motion, lucide-react, @radix-ui/react-avatar, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-progress (+14 more)

### Community 3 - "cn"
Cohesion: 0.11
Nodes (35): Page(), Page(), Page(), geistMono, geistSans, metadata, RootLayout(), Page() (+27 more)

### Community 4 - "Button"
Cohesion: 0.23
Nodes (14): DualPurposeChat(), ROLE_BADGES, JitsiMeetingRoom, LiveClassroom(), NativeVideoRoom(), RTC_CONFIG, SessionQuizModal(), Button (+6 more)

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

### Community 15 - "ref_node_path"
Cohesion: 0.17
Nodes (8): dbDir, here, local, parsed, pool, here, scripts, client

### Community 16 - "routes/index.js"
Cohesion: 0.16
Nodes (14): express, express-rate-limit, verifyRoomMembership(), router, router, router, overviewCache, router (+6 more)

### Community 17 - "SuperadminApprovals.jsx"
Cohesion: 0.22
Nodes (20): ApplicationDocumentPicker(), ApplicationFileList(), DocumentThumb(), ALLOWED_EXTENSIONS, APPLICATION_FILE_ACCEPT, canPreviewFile(), downloadApplicationDocument(), fileExtension() (+12 more)

### Community 18 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, embedded-postgres, postcss, tailwindcss, @tailwindcss/vite, typescript, vite (+1 more)

### Community 19 - "src/screens/Dashboard.jsx"
Cohesion: 0.13
Nodes (21): addDaysYmd(), localYmd(), Dashboard(), fmtDate(), fmtLongDate(), fmtPoints(), initialsOf(), Metrics() (+13 more)

### Community 20 - "App.jsx"
Cohesion: 0.17
Nodes (21): App(), Dashboard, DEMO_ROLES, FacultyReferral, initialsOf(), LearnerWizard, Messages, MyTutors (+13 more)

### Community 21 - "vite.config.js"
Cohesion: 0.33
Nodes (4): @tailwindcss/vite, vite, @vitejs/plugin-basic-ssl, @vitejs/plugin-react

### Community 22 - "query"
Cohesion: 0.20
Nodes (11): main(), main(), main(), test(), missingUrlError(), pool, query(), withTransaction() (+3 more)

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
Cohesion: 0.11
Nodes (18): handler(), cors, dotenv, @google/genai, helmet, morgan, app, __dirname (+10 more)

### Community 42 - "generate_dfd0.py"
Cohesion: 0.14
Nodes (12): hit_bottom(), hit_left(), hit_right(), hit_top(), open_arrow_head(), orthogonal_arrow(), hit_bottom(), hit_left() (+4 more)

### Community 43 - "middleware/auth.js"
Cohesion: 0.20
Nodes (13): clearSessionCookie(), readCookie(), requestToken(), SESSION_COOKIE, setSessionCookie(), requireAuth(), requireRole(), signToken() (+5 more)

### Community 44 - "matching.js"
Cohesion: 0.24
Nodes (3): toPublicProfile(), router, router

### Community 45 - "ref_node_fs"
Cohesion: 0.22
Nodes (5): s, dir, main, sizes, totalGzip

### Community 46 - "wrapup.js"
Cohesion: 0.50
Nodes (5): awardWithinCap(), SESSION_POINTS_EARNED_SQL, WEEKLY_LEARNER_SESSION_CAP, WEEKLY_TUTOR_SESSION_CAP, router

### Community 48 - "Login.jsx"
Cohesion: 0.15
Nodes (17): animejs, Logo2D(), SplashScreen(), FOCUSABLE, focusFirst(), trapTabKey(), visibleNodes(), FAQS (+9 more)

### Community 49 - "httpError"
Cohesion: 0.13
Nodes (18): uploadApplicationDocument(), audit(), requestIp(), httpError(), readableApplication(), router, uploadLimiter, assertCanChat() (+10 more)

### Community 50 - "api.js"
Cohesion: 0.36
Nodes (5): ApiError, request(), requestBlob(), fmt(), RewardCatalog()

### Community 51 - "AccountDialog.jsx"
Cohesion: 0.18
Nodes (14): react-router-dom, AccountDialog(), SecurityDialog(), Avatar(), getInitials(), SIZE_MAP, cropAndResizeToCanvas(), MAX_AVATAR_BYTES (+6 more)

### Community 52 - "db-backup.js"
Cohesion: 0.20
Nodes (9): args, dir, local, password, result, stamp, target, url (+1 more)

### Community 53 - "capture_after_screenshots.js"
Cohesion: 0.50
Nodes (4): run(), send(), sleep(), TEMP_PROFILE

### Community 54 - "GoogleClassroomSessions.jsx"
Cohesion: 0.40
Nodes (8): fmtShortDate(), GoogleClassroomSessions(), SkeletonCard(), STATUS_FILTERS, StatusBadge(), fmtDate(), getSubjectBannerPalette(), SessionDetailModal()

### Community 55 - "capture_classroom_screenshots.js"
Cohesion: 0.47
Nodes (5): run(), send(), waitForApp(), sleep(), TEMP_PROFILE

### Community 56 - "ref_node_child_process"
Cohesion: 0.29
Nodes (5): run(), send(), sleep(), TEMP_PROFILE, processes

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

### Community 62 - "Messages.jsx"
Cohesion: 0.70
Nodes (3): fmtInboxTime(), fmtTime(), Messages()

### Community 63 - "capture_my_tutors_screenshots.js"
Cohesion: 0.47
Nodes (5): run(), send(), waitForApp(), sleep(), TEMP_PROFILE

### Community 66 - "test-centrifugo.js"
Cohesion: 0.44
Nodes (7): jsonwebtoken, MIN_CENTRIFUGO_SECRET_LENGTH, signConnectionToken(), assert(), login(), request(), runTests()

### Community 111 - "pg"
Cohesion: 0.05
Nodes (34): pg, CORRECT, DEMO_PNG, login(), psql, request(), client, login() (+26 more)

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
- **389 isolated node(s):** `eslintConfig`, `paths`, `nextConfig`, `name`, `version` (+384 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 480 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-router-dom` connect `AccountDialog.jsx` to `package.json`, `cn`, `Button`, `CentrifugoService`, `SuperadminApprovals.jsx`, `src/screens/Dashboard.jsx`, `App.jsx`, `GoogleClassroomSessions.jsx`, `Messages.jsx`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `paths`, `nextConfig` to the rest of the system?**
  _389 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Why does `pg` connect `pg` to `package.json`, `pg-embed.js`, `query`, `ref_node_path`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `next-app-archived/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `express` connect `routes/index.js` to `package.json`, `app.js`, `middleware/auth.js`, `matching.js`, `wrapup.js`, `httpError`, `query`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.11008704557091654 - nodes in this community are weakly interconnected._