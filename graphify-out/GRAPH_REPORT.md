# Graph Report - lccb-academix  (2026-11-26)

## Corpus Check
- 220 files · ~395,220 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .bat 3, .css 3, (none) 2)

## Summary
- 1249 nodes · 2692 edges · 89 communities (70 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9d3d9519`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- 2. Full Status Table (16 Categories)
- next-app-archived/package.json
- cn
- src/screens/SessionCheckIn.jsx
- CentrifugoService
- dependencies
- Chapter 3
- WsRealtimeService
- next.config.mjs
- dependencies
- data.js
- task-storage.js
- Run The Demo — LCCB Academix
- 2. Detailed Audit Tables by Category
- routes/index.js
- Button
- devDependencies
- cn
- dotenv
- vite.config.js
- App.jsx
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
- routes/auth.js
- ref_node_assert
- SuperadminApprovals.jsx
- src/screens/Dashboard.jsx
- httpError
- accreditation.js
- src/lib/publicProfile.js
- MockJitsiMeetExternalAPI
- query
- storage.js
- LearnerWizard.jsx
- app.js
- pg-embed.js
- purge-retention.js
- e2e-audit.js
- GoogleClassroomSessions.jsx
- config.js
- pooler-probe.js
- db-backup.js
- sessions.js
- e2e-tasks.js
- api.js
- ref_node_fs
- e2e-accreditation.js
- pg
- points.js
- e2e-security.js
- e2e-concurrency.js
- Messages.jsx
- test-video-room.js
- e2e-wrapup.js
- e2e-db.js
- Chapter 3: Methodology
- build_docx.py
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
1. `cn()` - 80 edges
2. `Button` - 57 edges
3. `query()` - 36 edges
4. `httpError()` - 32 edges
5. `CentrifugoService` - 30 edges
6. `App()` - 28 edges
7. `Avatar()` - 27 edges
8. `WsRealtimeService` - 25 edges
9. `MockRealtimeService` - 23 edges
10. `express` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Batch 2: Safe Actions, Draft Recovery & Form Validation [COMPLETED]` --references--> `useDraftState()`  [INFERRED]
  docs/ux-plan.md → src/lib/ux.js
- `Category 5: Accounts and Auth` --references--> `RoleGate()`  [INFERRED]
  docs/ux-audit.md → src/App.jsx
- `Category 5: Auth` --references--> `RoleGate()`  [INFERRED]
  docs/ux-plan.md → src/App.jsx
- `Category 2: Feedback and Status` --references--> `SkeletonCard()`  [INFERRED]
  docs/ux-audit.md → src/components/classroom/GoogleClassroomSessions.jsx
- `Category 10: Visual Consistency` --references--> `Avatar()`  [INFERRED]
  docs/ux-audit.md → src/components/ui/Avatar.jsx

## Import Cycles
- None detected.

## Communities (89 total, 19 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (34): author, description, homepage, canvas-confetti, clsx, framer-motion, lucide-react, @radix-ui/react-avatar (+26 more)

### Community 1 - "2. Full Status Table (16 Categories)"
Cohesion: 0.09
Nodes (22): 1. Summary Counts, 2. Full Status Table (16 Categories), 3. Build Order & Batches, Batch 2: Safe Actions, Draft Recovery & Form Validation [COMPLETED], Batch 3: Booking Slot Picker, OTP Countdown & Edge-Case Recovery (Depends on: Batch 1), Batch 4: Points History, Active Vouchers, Calendar Export & Reminders (Depends on: Batch 1 & 2), Batch 5: Trust/Privacy Notice (Draft), Help/FAQ, Audit Viewer & Public Metadata (Depends on: Batch 1), Category 11: Performance (+14 more)

### Community 2 - "next-app-archived/package.json"
Cohesion: 0.09
Nodes (22): canvas-confetti, clsx, framer-motion, lucide-react, @radix-ui/react-avatar, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-progress (+14 more)

### Community 3 - "cn"
Cohesion: 0.11
Nodes (35): Page(), Page(), Page(), geistMono, geistSans, metadata, RootLayout(), Page() (+27 more)

### Community 4 - "src/screens/SessionCheckIn.jsx"
Cohesion: 0.23
Nodes (13): downloadSessionIcs(), manilaTodayYmd(), toIcsUtcStamp(), useDraftState(), fmtDate(), formatDurationVerbose(), formatTime(), LiveClassroom (+5 more)

### Community 5 - "CentrifugoService"
Cohesion: 0.06
Nodes (18): centrifuge, zod, runTests(), ErrorBoundary, CentrifugoService, ChatEnvelopeSchema, getCentrifugoService(), getDefaultTokenEndpoint() (+10 more)

### Community 6 - "dependencies"
Cohesion: 0.05
Nodes (37): dependencies, animejs, @aws-sdk/client-s3, bcryptjs, canvas-confetti, centrifuge, clsx, concurrently (+29 more)

### Community 7 - "Chapter 3"
Cohesion: 0.07
Nodes (26): Chapter 1, Chapter 2, Chapter 3, Context Free Diagram (CFD), Cost-Benefit Analysis, Data Flow Diagram (Level 0 DFD), Definition of Terms, Development Cost (+18 more)

### Community 10 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, canvas-confetti, clsx, framer-motion, lucide-react, next, @radix-ui/react-avatar, @radix-ui/react-dialog (+11 more)

### Community 11 - "data.js"
Cohesion: 0.12
Nodes (16): BADGES, CALENDAR_SLOTS, CHART_DATA_HOURS, CHART_DATA_SESSIONS, EXAM_QUESTIONS, NOTIFICATIONS, REFERRALS, REWARDS (+8 more)

### Community 13 - "task-storage.js"
Cohesion: 0.31
Nodes (10): defaultLocalRoot, deleteTaskImage(), ensureWritableDir(), here, localBaseDir(), readTaskImage(), resolveTaskStorageDriver(), safeLocalPath() (+2 more)

### Community 14 - "Run The Demo — LCCB Academix"
Cohesion: 0.17
Nodes (11): 1. Reset the demo database (fresh demo data), 2. Start the API, 3. Stage the demo data (API must already be running), 4. Start the frontend, 5. Open it, 6. Log in, 7. Run the gates (optional but recommended), Prerequisites (+3 more)

### Community 15 - "2. Detailed Audit Tables by Category"
Cohesion: 0.07
Nodes (29): 1. Executive Summary & Scorecard, 2. Detailed Audit Tables by Category, 3. Quick Wins (Essential or Recommended · Effort: S), 4. Proposed Build Batches, 5. Unverified Items & Verification Methodology, Batch 1: Trust, Privacy & Action Safety (Essential Compliance), Batch 2: Ledger Transparency & Voucher Recovery, Batch 3: Student Mobile Resilience & Booking Scheduling (+21 more)

### Community 16 - "routes/index.js"
Cohesion: 0.15
Nodes (14): express, router, router, router, router, router, syncDueSoonNotifications(), overviewCache (+6 more)

### Community 17 - "Button"
Cohesion: 0.24
Nodes (12): DualPurposeChat(), ROLE_BADGES, JitsiMeetingRoom, LiveClassroom(), NativeVideoRoom(), RTC_CONFIG, SessionQuizModal(), Button (+4 more)

### Community 18 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, embedded-postgres, postcss, tailwindcss, @tailwindcss/vite, typescript, vite (+1 more)

### Community 19 - "cn"
Cohesion: 0.16
Nodes (20): Badge(), BadgeDisplay(), BadgeList(), Card, CardContent, CardDescription, CardFooter, CardHeader (+12 more)

### Community 20 - "dotenv"
Cohesion: 0.19
Nodes (7): dotenv, pool, verifyRoomMembership(), setupWebSocketServer(), authenticateRequest(), router, main()

### Community 21 - "vite.config.js"
Cohesion: 0.33
Nodes (4): @tailwindcss/vite, vite, @vitejs/plugin-basic-ssl, @vitejs/plugin-react

### Community 22 - "App.jsx"
Cohesion: 0.05
Nodes (60): Category 5: Accounts and Auth, Batch 1: Cross-Cutting UX Foundations & Shell [COMPLETED — Commit e64da0f], Category 5: Auth, animejs, @supabase/supabase-js, App(), Dashboard, DEMO_ROLES (+52 more)

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

### Community 41 - "routes/auth.js"
Cohesion: 0.15
Nodes (18): bcryptjs, clearSessionCookie(), readCookie(), requestToken(), SESSION_COOKIE, SESSION_TTL_MS, SESSION_TTL_SECONDS, setSessionCookie() (+10 more)

### Community 42 - "ref_node_assert"
Cohesion: 0.15
Nodes (14): doc, docx, file(), jpg, pdf, png, toPublicProfile(), downloadNotesPdf() (+6 more)

### Community 43 - "SuperadminApprovals.jsx"
Cohesion: 0.22
Nodes (20): ApplicationDocumentPicker(), ApplicationFileList(), DocumentThumb(), ALLOWED_EXTENSIONS, APPLICATION_FILE_ACCEPT, canPreviewFile(), downloadApplicationDocument(), fileExtension() (+12 more)

### Community 44 - "src/screens/Dashboard.jsx"
Cohesion: 0.18
Nodes (16): Category 10: Visual Consistency, Category 10: Consistency, Pagination(), addDaysYmd(), localYmd(), Dashboard(), fmtDate(), fmtLongDate() (+8 more)

### Community 45 - "httpError"
Cohesion: 0.15
Nodes (20): multer, IMAGE_EXTENSION_MIME, imageExtension(), imageMatchesMagicBytes(), MAX_TASK_IMAGE_BYTES, MAX_TASK_IMAGES, sanitizeImageName(), TASK_IMAGE_ACCEPT (+12 more)

### Community 46 - "accreditation.js"
Cohesion: 0.23
Nodes (11): APPLICATION_FILE_ACCEPT, contentMatchesExtension(), EXTENSION_MIME, fileExtension(), MAX_APPLICATION_FILE_BYTES, MAX_APPLICATION_FILES, upload, uploadApplicationDocument() (+3 more)

### Community 48 - "MockJitsiMeetExternalAPI"
Cohesion: 0.33
Nodes (4): MockJitsiMeetExternalAPI, runTests(), loadJitsiScript(), _resetScriptLoader()

### Community 49 - "query"
Cohesion: 0.15
Nodes (17): missingUrlError(), query(), withTransaction(), audit(), requestIp(), requireAuth(), readableApplication(), fetchFullUser() (+9 more)

### Community 50 - "storage.js"
Cohesion: 0.44
Nodes (7): deleteFromR2(), getFromR2(), getR2Client(), isR2Configured(), _resetClientForTesting(), uploadToR2(), runMigration()

### Community 51 - "LearnerWizard.jsx"
Cohesion: 0.11
Nodes (30): ADVANCED_REVIEW_OPTIONS, BookingQuestionsForm(), GOALS, LANGUAGES, OptionCard(), SCHEDULES, TIMELINES, MatchmakingAnimation() (+22 more)

### Community 52 - "app.js"
Cohesion: 0.20
Nodes (11): handler(), cors, helmet, morgan, app, __dirname, distPath, loginLimiter (+3 more)

### Community 53 - "pg-embed.js"
Cohesion: 0.11
Nodes (21): embedded-postgres, DATA_DIR, ensurePostgres(), portIsOpen(), postgisReachable(), root, stopEmbeddedPostgres(), urlParts() (+13 more)

### Community 54 - "purge-retention.js"
Cohesion: 0.29
Nodes (6): apply, chatDays, client, days, local, notificationDays

### Community 55 - "e2e-audit.js"
Cohesion: 0.50
Nodes (3): client, login(), request()

### Community 56 - "GoogleClassroomSessions.jsx"
Cohesion: 0.33
Nodes (10): fmtShortDate(), formatDurationShort(), GoogleClassroomSessions(), SkeletonCard(), STATUS_FILTERS, StatusBadge(), fmtDate(), formatDurationVerbose() (+2 more)

### Community 57 - "config.js"
Cohesion: 0.13
Nodes (21): express-rate-limit, @google/genai, jsonwebtoken, allowedOrigins, config, DEFAULT_DEVICE_KEYS, DEFAULT_JWT_SECRETS, validateProductionSecrets() (+13 more)

### Community 58 - "pooler-probe.js"
Cohesion: 0.25
Nodes (6): CLUSTERS, hits, PASSWORD, REF, REGIONS, src

### Community 59 - "db-backup.js"
Cohesion: 0.15
Nodes (10): args, dir, local, password, result, stamp, target, url (+2 more)

### Community 60 - "sessions.js"
Cohesion: 0.27
Nodes (8): pdf, isDemoPasswordBlocked(), SEED_DEMO_HASH, generateCheckInToken(), isValidDeviceKey(), requireDeviceKey(), router, tokenLimiter

### Community 61 - "e2e-tasks.js"
Cohesion: 0.40
Nodes (3): login(), request(), TINY_PNG

### Community 62 - "api.js"
Cohesion: 0.17
Nodes (14): react-router-dom, ApiError, request(), requestBlob(), fmtManilaDateTime(), fmtDate(), MyTutors(), ACCEPTED_TYPES (+6 more)

### Community 63 - "ref_node_fs"
Cohesion: 0.22
Nodes (5): s, dir, main, sizes, totalGzip

### Community 64 - "e2e-accreditation.js"
Cohesion: 0.25
Nodes (5): CORRECT, DEMO_PNG, login(), psql, request()

### Community 65 - "pg"
Cohesion: 0.33
Nodes (4): pg, client, c, t0

### Community 66 - "points.js"
Cohesion: 0.53
Nodes (4): awardWithinCap(), SESSION_POINTS_EARNED_SQL, WEEKLY_LEARNER_SESSION_CAP, WEEKLY_TUTOR_SESSION_CAP

### Community 68 - "e2e-concurrency.js"
Cohesion: 0.50
Nodes (3): client, login(), request()

### Community 69 - "Messages.jsx"
Cohesion: 0.70
Nodes (3): fmtInboxTime(), fmtTime(), Messages()

### Community 70 - "test-video-room.js"
Cohesion: 0.83
Nodes (3): deriveJitsiRoomName(), loginUser(), runTests()

### Community 71 - "e2e-wrapup.js"
Cohesion: 0.67
Nodes (3): login(), psql, request()

### Community 111 - "e2e-db.js"
Cohesion: 0.27
Nodes (6): E2E_DATABASE_URL, host, LOCAL_HOSTS, client, login(), request()

### Community 261 - "Chapter 3: Methodology"
Cohesion: 0.06
Nodes (32): Chapter 1: Introduction, Chapter 2: Review of Related Literature and Studies, Chapter 3: Methodology, Context Flow Diagram (CFD), Cost-Benefit Analysis, Data Flow Diagram (Level 0 DFD), Definition of Terms, Development Cost (+24 more)

### Community 359 - "build_docx.py"
Cohesion: 0.12
Nodes (6): add_fig(), add_runs(), caption(), flush_table(), flush_table_check(), para()

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
- **449 isolated node(s):** `eslintConfig`, `paths`, `nextConfig`, `name`, `version` (+444 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 542 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-router-dom` connect `api.js` to `package.json`, `src/screens/SessionCheckIn.jsx`, `CentrifugoService`, `Messages.jsx`, `SuperadminApprovals.jsx`, `src/screens/Dashboard.jsx`, `cn`, `LearnerWizard.jsx`, `App.jsx`, `GoogleClassroomSessions.jsx`?**
  _High betweenness centrality (0.239) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `paths`, `nextConfig` to the rest of the system?**
  _449 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Why does `express` connect `routes/index.js` to `package.json`, `routes/auth.js`, `httpError`, `accreditation.js`, `query`, `storage.js`, `app.js`, `dotenv`, `config.js`, `sessions.js`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Should `2. Full Status Table (16 Categories)` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `cn` to `next-app-archived/package.json`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `next-app-archived/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._