# Graph Report - lccb-academix  (2026-10-08)

## Corpus Check
- Corpus is ~29,798 words - fits in a single context window. You may not need a graph.

## Summary
- 278 nodes · 671 edges · 13 communities (9 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Vite Root Tooling & DevDependencies
- Vite React UI Screens & Navigation
- Next.js App DevDependencies & Linting
- Next.js UI Components & Layout
- Mock Domain Data & Roles (Vite App)
- Next.js App Router Pages
- Vite App Runtime Dependencies
- Next.js App Runtime Dependencies
- Mock Domain Data (Next.js App)
- Next.js Server Configuration
- Next.js Path Aliases & Compiler Config
- PostCSS Styling Setup

## God Nodes (most connected - your core abstractions)
1. `Button` - 19 edges
2. `cn()` - 18 edges
3. `Card` - 18 edges
4. `CardContent` - 18 edges
5. `cn()` - 18 edges
6. `Button` - 16 edges
7. `useAppContext()` - 15 edges
8. `Card` - 14 edges
9. `CardContent` - 14 edges
10. `Badge()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Page()` --calls--> `SessionCheckIn()`  [EXTRACTED]
  next-app/src/app/checkin/page.jsx → next-app/src/screens/SessionCheckIn.jsx
- `Page()` --calls--> `Dashboard()`  [EXTRACTED]
  next-app/src/app/dashboard/page.jsx → next-app/src/screens/Dashboard.jsx
- `Page()` --calls--> `TutorExam()`  [EXTRACTED]
  next-app/src/app/exam/page.jsx → next-app/src/screens/TutorExam.jsx
- `RootLayout()` --calls--> `AppLayout()`  [EXTRACTED]
  next-app/src/app/layout.js → next-app/src/components/AppLayout.jsx
- `Page()` --calls--> `FacultyReferral()`  [EXTRACTED]
  next-app/src/app/referral/page.jsx → next-app/src/screens/FacultyReferral.jsx

## Import Cycles
- None detected.

## Communities (13 total, 4 thin omitted)

### Community 0 - "Vite Root Tooling & DevDependencies"
Cohesion: 0.05
Nodes (40): devDependencies, autoprefixer, postcss, tailwindcss, @tailwindcss/vite, typescript, vite, canvas-confetti (+32 more)

### Community 1 - "Vite React UI Screens & Navigation"
Cohesion: 0.25
Nodes (26): App(), roleProfiles, roles, Badge(), Button, Card, CardContent, CardDescription (+18 more)

### Community 2 - "Next.js App DevDependencies & Linting"
Cohesion: 0.05
Nodes (36): eslintConfig, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, canvas-confetti, clsx (+28 more)

### Community 3 - "Next.js UI Components & Layout"
Cohesion: 0.22
Nodes (21): AppLayout(), roles, Badge(), Button, Card, CardContent, CardDescription, CardFooter (+13 more)

### Community 4 - "Mock Domain Data & Roles (Vite App)"
Cohesion: 0.11
Nodes (23): ACTIVITY_FEED, BADGES, CALENDAR_SLOTS, CHART_DATA_BY_DEPT, CHART_DATA_HOURS, CHART_DATA_RECOVERY, CHART_DATA_SESSIONS, EXAM_QUESTIONS (+15 more)

### Community 5 - "Next.js App Router Pages"
Cohesion: 0.15
Nodes (13): Page(), Page(), Page(), geistMono, geistSans, metadata, RootLayout(), Page() (+5 more)

### Community 6 - "Vite App Runtime Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, canvas-confetti, clsx, framer-motion, lucide-react, @radix-ui/react-avatar, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu (+12 more)

### Community 7 - "Next.js App Runtime Dependencies"
Cohesion: 0.11
Nodes (19): dependencies, canvas-confetti, clsx, framer-motion, lucide-react, next, @radix-ui/react-avatar, @radix-ui/react-dialog (+11 more)

### Community 8 - "Mock Domain Data (Next.js App)"
Cohesion: 0.12
Nodes (16): BADGES, CALENDAR_SLOTS, CHART_DATA_HOURS, CHART_DATA_SESSIONS, EXAM_QUESTIONS, NOTIFICATIONS, REFERRALS, REWARDS (+8 more)

## Knowledge Gaps
- **144 isolated node(s):** `eslintConfig`, `paths`, `nextConfig`, `name`, `version` (+139 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 153 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-router-dom` connect `Vite Root Tooling & DevDependencies` to `Vite React UI Screens & Navigation`?**
  _High betweenness centrality (0.302) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `paths`, `nextConfig` to the rest of the system?**
  _144 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vite Root Tooling & DevDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046464646464646465 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Next.js App DevDependencies & Linting` to `Next.js UI Components & Layout`, `Next.js App Router Pages`?**
  _High betweenness centrality (0.294) - this node is a cross-community bridge._
- **Should `Next.js App DevDependencies & Linting` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Vite App Runtime Dependencies` to `Vite Root Tooling & DevDependencies`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Should `Mock Domain Data & Roles (Vite App)` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._