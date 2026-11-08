# Graph Report - lccb-academix  (2026-11-09)

## Corpus Check
- 199 files · ~153,658 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .bat 3, .css 3, (none) 2)

## Summary
- 1101 nodes · 2207 edges · 83 communities (64 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `12b8a7f4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- cn
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
- ref_node_path
- routes/index.js
- SuperadminApprovals.jsx
- devDependencies
- src/screens/Dashboard.jsx
- App.jsx
- vite.config.js
- AccountDialog.jsx
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
- dotenv
- ref_node_fs
- wrapup.js
- src/lib/publicProfile.js
- Login.jsx
- query
- api.js
- Messages.jsx
- db-backup.js
- ref_node_child_process
- MockJitsiMeetExternalAPI
- video.js
- reproduce_screenshots.js
- reproduce_tutor.js
- capture_messages_screenshots.js
- check_page.js
- capture_universal_profiles.js
- pooler-probe.js
- capture_my_tutors_screenshots.js
- realtime.js
- e2e-accreditation.js
- Chapter 3: Methodology
- build_docx.py
- httpError
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
1. `cn()` - 61 edges
2. `Button` - 40 edges
3. `query()` - 37 edges
4. `CentrifugoService` - 30 edges
5. `WsRealtimeService` - 25 edges
6. `App()` - 23 edges
7. `MockRealtimeService` - 23 edges
8. `express` - 21 edges
9. `httpError()` - 21 edges
10. `cn()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/check_empty_learner.js → server/db.js
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/check_messages_avatar.js → server/db.js
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/test_my_tutors_query.js → server/db.js
- `handler()` --calls--> `app`  [EXTRACTED]
  api/index.js → server/app.js
- `fetchFullUser()` --calls--> `query()`  [EXTRACTED]
  server/routes/auth.js → server/db.js

## Import Cycles
- None detected.

## Communities (83 total, 19 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (35): author, description, homepage, canvas-confetti, clsx, framer-motion, lucide-react, @radix-ui/react-avatar (+27 more)

### Community 1 - "cn"
Cohesion: 0.18
Nodes (17): Badge(), BadgeDisplay(), BadgeList(), Card, CardContent, CardDescription, CardFooter, CardHeader (+9 more)

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
Cohesion: 0.13
Nodes (15): pg, setupWebSocketServer(), DATA_DIR, ensurePostgres(), portIsOpen(), postgisReachable(), root, stopEmbeddedPostgres() (+7 more)

### Community 14 - "Run The Demo — LCCB Academix"
Cohesion: 0.17
Nodes (11): 1. Reset the demo database (fresh demo data), 2. Start the API, 3. Stage the demo data (API must already be running), 4. Start the frontend, 5. Open it, 6. Log in, 7. Run the gates (optional but recommended), Prerequisites (+3 more)

### Community 15 - "ref_node_path"
Cohesion: 0.20
Nodes (7): dbDir, here, local, parsed, pool, here, scripts

### Community 16 - "routes/index.js"
Cohesion: 0.13
Nodes (11): express, toPublicProfile(), router, router, router, router, overviewCache, router (+3 more)

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

### Community 22 - "AccountDialog.jsx"
Cohesion: 0.27
Nodes (10): AccountDialog(), SecurityDialog(), cropAndResizeToCanvas(), MAX_AVATAR_BYTES, TARGET_AVATAR_SIZE, validateAvatarFile(), FOCUSABLE, focusFirst() (+2 more)

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
Cohesion: 0.21
Nodes (10): handler(), cors, helmet, morgan, app, __dirname, distPath, loginLimiter (+2 more)

### Community 42 - "generate_dfd0.py"
Cohesion: 0.14
Nodes (12): hit_bottom(), hit_left(), hit_right(), hit_top(), open_arrow_head(), orthogonal_arrow(), hit_bottom(), hit_left() (+4 more)

### Community 43 - "middleware/auth.js"
Cohesion: 0.19
Nodes (13): clearSessionCookie(), readCookie(), requestToken(), SESSION_COOKIE, setSessionCookie(), requireAuth(), requireRole(), signToken() (+5 more)

### Community 44 - "dotenv"
Cohesion: 0.17
Nodes (9): dotenv, client, c, t0, apply, client, days, local (+1 more)

### Community 45 - "ref_node_fs"
Cohesion: 0.22
Nodes (5): s, dir, main, sizes, totalGzip

### Community 46 - "wrapup.js"
Cohesion: 0.50
Nodes (5): awardWithinCap(), SESSION_POINTS_EARNED_SQL, WEEKLY_LEARNER_SESSION_CAP, WEEKLY_TUTOR_SESSION_CAP, router

### Community 48 - "Login.jsx"
Cohesion: 0.18
Nodes (13): animejs, Logo2D(), SplashScreen(), FAQS, fmt(), fmtHours(), HsCube(), ILLUSTRATION_CREDITS (+5 more)

### Community 49 - "query"
Cohesion: 0.11
Nodes (23): main(), main(), main(), missingUrlError(), pool, query(), withTransaction(), audit() (+15 more)

### Community 50 - "api.js"
Cohesion: 0.27
Nodes (8): ApiError, request(), requestBlob(), FacultyReferral(), initials(), STEP_LABELS, StudentRow(), URGENCIES

### Community 51 - "Messages.jsx"
Cohesion: 0.23
Nodes (11): react-router-dom, Avatar(), getInitials(), SIZE_MAP, fmtInboxTime(), fmtTime(), Messages(), fmtDate() (+3 more)

### Community 52 - "db-backup.js"
Cohesion: 0.20
Nodes (9): args, dir, local, password, result, stamp, target, url (+1 more)

### Community 53 - "ref_node_child_process"
Cohesion: 0.29
Nodes (5): run(), send(), sleep(), TEMP_PROFILE, processes

### Community 54 - "MockJitsiMeetExternalAPI"
Cohesion: 0.33
Nodes (4): MockJitsiMeetExternalAPI, runTests(), loadJitsiScript(), _resetScriptLoader()

### Community 55 - "video.js"
Cohesion: 0.39
Nodes (5): verifyRoomMembership(), deriveJitsiRoomName(), router, loginUser(), runTests()

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

### Community 62 - "pooler-probe.js"
Cohesion: 0.25
Nodes (6): CLUSTERS, hits, PASSWORD, REF, REGIONS, src

### Community 63 - "capture_my_tutors_screenshots.js"
Cohesion: 0.47
Nodes (5): run(), send(), waitForApp(), sleep(), TEMP_PROFILE

### Community 66 - "realtime.js"
Cohesion: 0.15
Nodes (17): express-rate-limit, @google/genai, jsonwebtoken, allowedOrigins, config, generateTutoringHint(), generateWrapUpSynthesis(), MIN_CENTRIFUGO_SECRET_LENGTH (+9 more)

### Community 111 - "e2e-accreditation.js"
Cohesion: 0.08
Nodes (20): CORRECT, DEMO_PNG, login(), psql, request(), client, login(), request() (+12 more)

### Community 261 - "Chapter 3: Methodology"
Cohesion: 0.06
Nodes (32): Chapter 1: Introduction, Chapter 2: Review of Related Literature and Studies, Chapter 3: Methodology, Context Flow Diagram (CFD), Cost-Benefit Analysis, Data Flow Diagram (Level 0 DFD), Definition of Terms, Development Cost (+24 more)

### Community 359 - "build_docx.py"
Cohesion: 0.11
Nodes (6): add_fig(), add_runs(), caption(), flush_table(), flush_table_check(), para()

### Community 404 - "httpError"
Cohesion: 0.14
Nodes (20): multer, APPLICATION_FILE_ACCEPT, contentMatchesExtension(), EXTENSION_MIME, fileExtension(), MAX_APPLICATION_FILE_BYTES, MAX_APPLICATION_FILES, doc (+12 more)

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
- **387 isolated node(s):** `eslintConfig`, `paths`, `nextConfig`, `name`, `version` (+382 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 478 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-router-dom` connect `Messages.jsx` to `package.json`, `cn`, `ref_react`, `CentrifugoService`, `SuperadminApprovals.jsx`, `src/screens/Dashboard.jsx`, `App.jsx`, `AccountDialog.jsx`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `paths`, `nextConfig` to the rest of the system?**
  _387 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Why does `pg` connect `pg-embed.js` to `package.json`, `dotenv`, `e2e-accreditation.js`, `ref_node_path`, `query`, `pooler-probe.js`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `next-app-archived/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `cn` to `next-app-archived/package.json`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.11008704557091654 - nodes in this community are weakly interconnected._