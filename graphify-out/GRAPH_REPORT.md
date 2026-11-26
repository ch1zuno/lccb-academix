# Graph Report - lccb-academix  (2026-11-26)

## Corpus Check
- 224 files · ~401,480 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .bat 3, .css 3, (none) 2)

## Summary
- 1284 nodes · 2819 edges · 81 communities (62 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b33667d0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- 2. Full Status Table (16 Categories)
- next-app-archived/package.json
- cn
- db-reset.js
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
- middleware/auth.js
- vite.config.js
- Login.jsx
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
- totp.test.js
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
- AccountDialog.jsx
- app
- Avatar
- realtime.js
- pg
- db-backup.js
- routes/auth.js
- e2e-tasks.js
- App.jsx
- ref_node_path
- e2e-accreditation.js
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
3. `query()` - 37 edges
4. `httpError()` - 34 edges
5. `CentrifugoService` - 30 edges
6. `App()` - 28 edges
7. `Avatar()` - 27 edges
8. `WsRealtimeService` - 25 edges
9. `express` - 23 edges
10. `MockRealtimeService` - 23 edges

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

## Communities (81 total, 19 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (33): author, description, homepage, canvas-confetti, clsx, framer-motion, lucide-react, @radix-ui/react-avatar (+25 more)

### Community 1 - "2. Full Status Table (16 Categories)"
Cohesion: 0.09
Nodes (22): 1. Summary Counts, 2. Full Status Table (16 Categories), 3. Build Order & Batches, Batch 2: Safe Actions, Draft Recovery & Form Validation [COMPLETED], Batch 3: Booking Slot Picker, OTP Countdown & Edge-Case Recovery (Depends on: Batch 1), Batch 4: Points History, Active Vouchers, Calendar Export & Reminders (Depends on: Batch 1 & 2), Batch 5: Trust/Privacy Notice (Draft), Help/FAQ, Audit Viewer & Public Metadata (Depends on: Batch 1), Category 11: Performance (+14 more)

### Community 2 - "next-app-archived/package.json"
Cohesion: 0.09
Nodes (22): canvas-confetti, clsx, framer-motion, lucide-react, @radix-ui/react-avatar, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-progress (+14 more)

### Community 3 - "cn"
Cohesion: 0.11
Nodes (35): Page(), Page(), Page(), geistMono, geistSans, metadata, RootLayout(), Page() (+27 more)

### Community 4 - "db-reset.js"
Cohesion: 0.22
Nodes (7): dbDir, here, main(), quoteIdent(), read(), here, scripts

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
Cohesion: 0.13
Nodes (16): express, router, router, CONVERSATION_ROLES, peerIdOf(), router, router, overviewCache (+8 more)

### Community 17 - "Button"
Cohesion: 0.18
Nodes (19): DualPurposeChat(), ROLE_BADGES, JitsiMeetingRoom, LiveClassroom(), NativeVideoRoom(), RTC_CONFIG, SessionQuizModal(), Button (+11 more)

### Community 18 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, embedded-postgres, postcss, tailwindcss, @tailwindcss/vite, typescript, vite (+1 more)

### Community 19 - "cn"
Cohesion: 0.16
Nodes (20): Badge(), BadgeDisplay(), BadgeList(), Card, CardContent, CardDescription, CardFooter, CardHeader (+12 more)

### Community 20 - "middleware/auth.js"
Cohesion: 0.17
Nodes (16): audit(), requestIp(), verifyRoomMembership(), setupWebSocketServer(), authenticateRequest(), hasValidStepUpHeader(), requireAuth(), requireRole() (+8 more)

### Community 21 - "vite.config.js"
Cohesion: 0.33
Nodes (4): @tailwindcss/vite, vite, @vitejs/plugin-basic-ssl, @vitejs/plugin-react

### Community 22 - "Login.jsx"
Cohesion: 0.09
Nodes (30): animejs, @supabase/supabase-js, clearSession(), clearSupabaseStorage(), loadSession(), readStoredExpiry(), saveSession(), SESSION_TTL_MS (+22 more)

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

### Community 41 - "totp.test.js"
Cohesion: 0.08
Nodes (36): jsonwebtoken, MIN_CENTRIFUGO_SECRET_LENGTH, signConnectionToken(), clearSessionCookie(), readCookie(), requestToken(), ROLE_SESSION_TTL_SECONDS, SESSION_COOKIE (+28 more)

### Community 42 - "ref_node_assert"
Cohesion: 0.08
Nodes (25): doc, docx, file(), jpg, pdf, png, awardWithinCap(), SESSION_POINTS_EARNED_SQL (+17 more)

### Community 43 - "SuperadminApprovals.jsx"
Cohesion: 0.15
Nodes (27): ApiError, request(), requestBlob(), SKIP_UNAUTH_PATHS, ApplicationDocumentPicker(), ApplicationFileList(), DocumentThumb(), ALLOWED_EXTENSIONS (+19 more)

### Community 44 - "src/screens/Dashboard.jsx"
Cohesion: 0.18
Nodes (16): Category 10: Visual Consistency, Category 10: Consistency, Pagination(), addDaysYmd(), localYmd(), Dashboard(), fmtDate(), fmtLongDate() (+8 more)

### Community 45 - "httpError"
Cohesion: 0.16
Nodes (19): multer, IMAGE_EXTENSION_MIME, imageExtension(), imageMatchesMagicBytes(), MAX_TASK_IMAGE_BYTES, MAX_TASK_IMAGES, sanitizeImageName(), TASK_IMAGE_ACCEPT (+11 more)

### Community 46 - "accreditation.js"
Cohesion: 0.21
Nodes (12): APPLICATION_FILE_ACCEPT, contentMatchesExtension(), EXTENSION_MIME, fileExtension(), MAX_APPLICATION_FILE_BYTES, MAX_APPLICATION_FILES, upload, uploadApplicationDocument() (+4 more)

### Community 48 - "MockJitsiMeetExternalAPI"
Cohesion: 0.33
Nodes (4): MockJitsiMeetExternalAPI, runTests(), loadJitsiScript(), _resetScriptLoader()

### Community 49 - "query"
Cohesion: 0.16
Nodes (13): missingUrlError(), pool, query(), withTransaction(), assertCanChat(), loadPeer(), syncDueSoonNotifications(), insertNotification() (+5 more)

### Community 50 - "storage.js"
Cohesion: 0.38
Nodes (8): @aws-sdk/client-s3, deleteFromR2(), getFromR2(), getR2Client(), isR2Configured(), _resetClientForTesting(), uploadToR2(), runMigration()

### Community 51 - "LearnerWizard.jsx"
Cohesion: 0.10
Nodes (27): ADVANCED_REVIEW_OPTIONS, BookingQuestionsForm(), GOALS, LANGUAGES, OptionCard(), SCHEDULES, TIMELINES, MatchmakingAnimation() (+19 more)

### Community 52 - "app.js"
Cohesion: 0.21
Nodes (10): cors, helmet, morgan, __dirname, distPath, loginLimiter, errorHandler(), formatErrorMessage() (+2 more)

### Community 53 - "pg-embed.js"
Cohesion: 0.15
Nodes (13): embedded-postgres, DATA_DIR, ensurePostgres(), portIsOpen(), postgisReachable(), root, stopEmbeddedPostgres(), urlParts() (+5 more)

### Community 54 - "AccountDialog.jsx"
Cohesion: 0.39
Nodes (6): AccountDialog(), SecurityDialog(), cropAndResizeToCanvas(), MAX_AVATAR_BYTES, TARGET_AVATAR_SIZE, validateAvatarFile()

### Community 56 - "Avatar"
Cohesion: 0.17
Nodes (19): react-router-dom, fmtShortDate(), formatDurationShort(), GoogleClassroomSessions(), SkeletonCard(), STATUS_FILTERS, StatusBadge(), fmtDate() (+11 more)

### Community 57 - "realtime.js"
Cohesion: 0.19
Nodes (10): express-rate-limit, @google/genai, config, generateTutoringHint(), generateWrapUpSynthesis(), aiLimiter, router, DEFAULT_TTL_SECONDS (+2 more)

### Community 58 - "pg"
Cohesion: 0.10
Nodes (17): dotenv, pg, c, CLUSTERS, hits, PASSWORD, REF, REGIONS (+9 more)

### Community 59 - "db-backup.js"
Cohesion: 0.15
Nodes (10): args, dir, local, password, result, stamp, target, url (+2 more)

### Community 60 - "routes/auth.js"
Cohesion: 0.11
Nodes (19): bcryptjs, allowedOrigins, DEFAULT_DEVICE_KEYS, DEFAULT_JWT_SECRETS, validateProductionSecrets(), pdf, signStepUpToken(), DUMMY_PASSWORD_HASH (+11 more)

### Community 61 - "e2e-tasks.js"
Cohesion: 0.40
Nodes (3): login(), request(), TINY_PNG

### Community 62 - "App.jsx"
Cohesion: 0.10
Nodes (35): Category 5: Accounts and Auth, Batch 1: Cross-Cutting UX Foundations & Shell [COMPLETED — Commit e64da0f], Category 5: Auth, App(), Dashboard, DEMO_ROLES, FacultyReferral, initialsOf() (+27 more)

### Community 63 - "ref_node_path"
Cohesion: 0.18
Nodes (6): s, dir, main, sizes, totalGzip, client

### Community 111 - "e2e-accreditation.js"
Cohesion: 0.08
Nodes (20): CORRECT, DEMO_PNG, login(), psql, request(), client, login(), request() (+12 more)

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
- **456 isolated node(s):** `eslintConfig`, `paths`, `nextConfig`, `name`, `version` (+451 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 550 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-router-dom` connect `Avatar` to `package.json`, `CentrifugoService`, `SuperadminApprovals.jsx`, `src/screens/Dashboard.jsx`, `Button`, `LearnerWizard.jsx`, `AccountDialog.jsx`, `App.jsx`?**
  _High betweenness centrality (0.253) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `paths`, `nextConfig` to the rest of the system?**
  _456 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Why does `express` connect `routes/index.js` to `package.json`, `httpError`, `accreditation.js`, `query`, `storage.js`, `app.js`, `middleware/auth.js`, `realtime.js`, `routes/auth.js`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `2. Full Status Table (16 Categories)` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `next` connect `cn` to `next-app-archived/package.json`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `next-app-archived/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._