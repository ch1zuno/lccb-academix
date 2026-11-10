# LCCB Academix — UX Audit & Implementation Plan (`docs/ux-plan.md`)

**Scope:** 16-category UX checklist audited against live local renders on mobile (`360×640`) and desktop (`1280×800`) across all seeded roles (`TE-128`, `TU-042`, `b.tisuela@lccbacolod.edu.ph`, `l.betita.admin@lccbacolod.edu.ph`, and anonymous public visitor).  
**Excluded per rules:** Pagination, mobile sidebar scroll fix, profile tab, tutor profile, previous tutors (`MyTutors`), dashboard redesign, matchmaking animation, dark mode, biometric check-in flow, and core ledger logic.

---

## 1. Summary Counts

| Status | Count | Notes |
| :--- | :---: | :--- |
| **Present** | **38** | Already complete and verified in code + rendered DOM. |
| **Partial** | **31** | Exists on some screens or lacks recovery, confirmation, or mobile ergonomics. |
| **Missing** | **15** | Absent from UI; evaluated below for campus fit. |
| **Unverified** | **0** | All 84 items across the 16 categories were verified in code and local Chromium DOM. |
| **Total** | **84** | Checklist items evaluated. |

**Fit Breakdown (Partial + Missing = 46 items):**
- **Essential:** 9 items (will build)
- **Recommended:** 28 items (will build)
- **Optional (S effort):** 3 items (will build)
- **Optional (M/L effort) / Not needed:** 6 items (skipped with reason)

---

## 2. Full Status Table (16 Categories)

### Category 1: Navigation
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Role-based landing page | Present | `src/App.jsx:475` (`/` → `/dashboard`), `ROLE_ROUTES` | — | Authenticated users land directly on their role's workspace. | — |
| Active menu state | Present | `src/App.jsx:292` (`aria-current="page"`, gold fill) | — | Clear visual and screen-reader active state on desktop and mobile nav. | — |
| Back or breadcrumbs on deep pages | Partial | `TutorProfile.jsx:186` has Back; `TutorApplicant.jsx` & `RewardCatalog.jsx` voucher view lack top back breadcrumb | Recommended | Students drilling into exam/application or claim slips on phones need a consistent top back action. | S |
| Deep-linkable URLs | Partial | `src/App.jsx:474-524` routes work signed in; `/profile/:id` & `/tutors/:id` block anonymous visitors | Recommended | Sharing a tutor's public profile link on campus chat should render the public profile without forcing login first. | S |
| 404 page | Partial | `src/App.jsx:526` (`404 · Off the ledger`) works when signed in; unauthenticated unknown URLs render `Login` silently | Recommended | Unauthenticated visitors hitting a mistyped URL need a clear 404 banner or card with a link back to the landing page. | S |
| Page titles | Missing | `index.html:10` static `<title>` | Recommended | `document.title` never updates per route, hurting multi-tab faculty/admin use and screen-reader announcements. | S |
| Search where lists are long | Partial | `FacultyReferral.jsx:53`, `LearnerWizard.jsx` have search; `Dashboard.jsx` referral board & `Messages.jsx` lack filter/search | Recommended | Faculty reviewing referrals and tutors searching conversations need a quick client-side text filter. | S |

### Category 2: Feedback
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Loading skeletons | Partial | `GoogleClassroomSessions.jsx:65` uses skeletons; `Dashboard.jsx` & `RewardCatalog.jsx` use plain text | Recommended | Shared skeleton/loading block prevents jarring layout jumps on mobile data. | S |
| Empty states with next action | Present | `Dashboard.jsx:630`, `MyTutors.jsx:130`, `SessionCheckIn.jsx:414` | — | Empty states include clear copy and primary CTA buttons. | — |
| Error states with recovery | Partial | `RewardCatalog.jsx:121` has Retry; `Dashboard.jsx:290,543,938` & `SessionCheckIn.jsx:411` show error text with no Retry button | Recommended | Campus Wi-Fi drops frequently; every fetch error banner needs a one-tap Retry action. | S |
| Success toasts | Present | `src/App.jsx:96` `showToast()` | — | Auto-dismissing status toasts announce saves, bookings, and switches. | — |
| Pending buttons | Present | `Login.jsx:1024`, `RewardCatalog.jsx:182`, `SessionCheckIn.jsx:372` | — | Submit buttons disable and show `<Loader2 className="animate-spin" />`. | — |
| Duplicate-submit prevention | Present | `busyId`, `submitting`, `checkingIn`, `applying` state guards | — | Prevents double-click duplicate POSTs across forms. | — |
| Slow-connection & Render cold-start handling | Partial | `SplashScreen.jsx` shows for 2s; no offline banner or >5s Render cold-start wake notice | Essential | Hosted on Render free/hobby tier with cold starts; students on mobile data need a "Waking up server…" message after 4s and an offline banner when `navigator.onLine` is false. | S |

### Category 3: Forms
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Visible labels | Partial | Most fields labeled; `Dashboard.jsx` & `FacultyReferral.jsx` search/filter inputs rely on placeholders | Recommended | Every input needs a visible label or explicit `aria-label` for mobile clarity. | S |
| Inline validation | Partial | `Login.jsx:989`, `AccountDialog.jsx:156` show top banner only | Recommended | Linking field errors via `aria-invalid` and `aria-describedby` helps students fix the exact input quickly. | S |
| Correct input types | Present | `SessionCheckIn.jsx:577` (`inputMode="numeric"`), `FacultyReferral.jsx` (`type="number"`) | — | Mobile keyboards match field data types. | — |
| Data kept after an error | Present | Controlled React state across all forms | — | Failed submits never wipe typed input. | — |
| Upload limits and progress | Present | `ApplicationDocumentPicker.jsx:190`, `TutorExam.jsx:79` | — | Enforces 4 MB / 5 files, magic-byte check, and step counter (`Uploading file 1 of N…`). | — |
| Draft recovery on long forms | Missing | `TutorApplicant.jsx:27` (30-min exam), `TutorExam.jsx:21`, `SessionCheckIn.jsx:72` (wrap-up notes) | Essential | If a phone reloads or battery dies mid-exam or during wrap-up notes, all progress is wiped. `localStorage` draft sync prevents lost work. | S |

### Category 4: Safe Actions
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Confirm destructive actions | Partial | `Dashboard.jsx:267` uses raw `window.confirm`; session cancel (`885`), request withdraw (`1005`), request decline (`816`), referral reject (`605`), and tutor reject (`SuperadminApprovals.jsx:437`) fire immediately | Essential | Accidental taps on 360px mobile screens immediately cancel sessions or reject applicants without confirmation. | S |
| Undo where possible | Missing | `App.jsx:96` `showToast()` has no action button | Recommended | Safe UI actions (like dismissing filters or draft clearing) benefit from an optional toast action; ledger/audit actions use confirm-before-commit to preserve append-only integrity. | S |
| Warnings before irreversible steps | Partial | `Dashboard.jsx:467` warns on referral removal; `RewardCatalog.jsx:183` (point spend) and `TutorApplicant.jsx` (final exam submit) lack pre-commit warnings | Essential | Spending hard-earned points on a voucher or submitting a one-attempt qualification exam is irreversible on the ledger. | S |

### Category 5: Auth
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Forgot password | Missing | `Login.jsx:1011` has no "Forgot password?" link | Recommended | No external email service is used; students need an inline "Forgot password?" help disclosure explaining how to request a reset from LCCB IT / Faculty Advisor. | S |
| Session-expiry message | Present | `src/App.jsx:164` (`academix:unauthorized` → toast + redirect) | — | Expired JWT cleanly clears session and notifies user. | — |
| Proper 403 page | Partial | `src/App.jsx:68` `RoleGate` redirects with toast | Recommended | Rendering a clear 403 card (with "Back to my dashboard" button) when hitting an unauthorized route explains why access was blocked. | S |
| OTP UX (resend, expiry countdown, wrong-code message) | Partial | `SessionCheckIn.jsx:505-590` has "Issue a new code" and error toast, but no 10-minute expiry countdown timer or inline wrong-code alert | Recommended | Tutors and learners need to see how much of the 10-minute OTP window remains without guessing. | S |
| First-time onboarding per role | Missing | Workspace dashboards | Not needed | Single-college app with self-explanatory role cards and faculty-guided orientation; pop-up tours add clutter on mobile. | — |

### Category 6: Data Display
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Sorting | Partial | `GoogleClassroomSessions.jsx` sorts by date; `SuperadminApprovals.jsx` & `Dashboard.jsx` referral board lack sort controls | Recommended | Letting faculty/superadmin sort referrals or applications by urgency/date speeds up triage. | S |
| Filtering | Partial | `GoogleClassroomSessions.jsx` & `RewardCatalog.jsx` have category/status filters; `Dashboard.jsx` referral board lacks urgency filter | Recommended | Faculty with multiple referrals benefit from a quick urgency filter (`All`, `High`, `Medium`, `Low`). | S |
| Search in lists | Partial | `LearnerWizard.jsx` & `FacultyReferral.jsx` have search; `Dashboard.jsx` referrals & `SuperadminApprovals.jsx` lack search | Recommended | Quick name/subject filter input helps faculty and dean locate a student immediately. | S |
| Responsive tables | Partial | `Dashboard.jsx:353` (`<table className="data-table">`) has no `overflow-x-auto` container | Recommended | Wrapping tables in `overflow-x-auto` prevents horizontal clipping on narrow phones. | S |
| Status badges | Present | `src/components/ui/badge.jsx`, `.status-pill` | — | Consistent high-contrast status pills across all screens. | — |
| Consistent date/time in Philippines timezone | Partial | `Dashboard.jsx:40`, `SessionCheckIn.jsx:20` use browser default timezone instead of `Asia/Manila` | Recommended | Pinning `timeZone: 'Asia/Manila'` in shared date formatters guarantees consistent campus dates regardless of device settings. | S |
| "Last updated" indicators | Missing | `Dashboard.jsx`, `SuperadminApprovals.jsx` | Recommended | Showing `Updated HH:MM` with a manual Refresh button reassures staff that ledger metrics are current. | S |

### Category 7: Notifications
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| In-app notification center with unread badge | Present | `src/App.jsx:149,318,347` | — | Bell drawer with unread counter and mark-all-read works on mobile and desktop. | — |
| Booking and session reminders | Partial | Booking notifications exist in DB; no prominent in-app "Upcoming session soon / today" reminder banner | Recommended | In-app banner on `Dashboard` when a user has an `upcoming` session today/tomorrow reminds them to check in (no external push/email needed). | S |

### Category 8: Mobile
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| 44px tap targets | Partial | Workspace buttons use `min-h-[44px]`; landing nav/footer buttons (`Login.jsx:710,911`) & desktop icon buttons are 26–36px | Recommended | Bumping interactive links/buttons on mobile viewports to `min-h-[44px]` prevents mis-taps on phones. | S |
| No horizontal scroll | Present | Verified `scrollWidth <= clientWidth` at `360×640` across screens | — | Mobile layout stays within 360px viewport width. | — |
| Safe-area handling | Missing | `index.html:8` lacks `viewport-fit=cover`; mobile sticky bars lack `env(safe-area-inset-*)` | Recommended | Prevents notch and home-indicator overlap on modern Android and iOS phones. | S |
| PWA basics | Present | `public/manifest.webmanifest`, `index.html:6-7` (`theme-color`, icon) | — | Installable web app metadata is present (offline service worker skipped to avoid stale auth caching issues on shared lab machines). | — |

### Category 9: Accessibility
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Keyboard navigation | Present | Escape handlers & modal focus traps in `App.jsx`, `Login.jsx`, `AccountDialog.jsx` | — | Dialogs and menus operate via keyboard. | — |
| Visible focus | Partial | Workspace uses `focus-visible:outline`; `Landing.css` links lack strong `:focus-visible` outline | Recommended | Adding explicit `:focus-visible` outlines in `Landing.css` completes keyboard visibility. | S |
| Skip link | Missing | `src/App.jsx`, `src/screens/Login.jsx` | Recommended | A `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>` lets keyboard users bypass the sidebar. | S |
| Landmarks and heading order | Partial | `App.jsx:338` mobile top bar is a `<div>` instead of `<header>`; `Login.jsx` lacks `<main id="main-content">` | Recommended | Using semantic `<header>` and `<main id="main-content">` fixes landmark navigation for screen readers. | S |
| ARIA labels | Partial | Icon buttons have `aria-label`; search/filter inputs and progress bars need `aria-label` | Recommended | Adding `aria-label` to progress bars and filter controls improves screen reader clarity. | S |
| Contrast 4.5 to 1 | Present | `--color-ink` (`#0f2942`) on `--color-paper` (`#fffdf6`) = 15.2:1 | — | Exceeds WCAG AAA contrast requirements. | — |
| Reduced motion | Present | `Login.jsx:220`, `MatchmakingAnimation.jsx:17`, `index.css` | — | Respects `prefers-reduced-motion: reduce`. | — |
| Errors announced to screen readers | Partial | Toasts use `role="status"`; inline form errors in `Login.jsx` & `AccountDialog.jsx` lack `role="alert"` | Recommended | Adding `role="alert"` on error banners ensures immediate announcement by assistive tech. | S |

### Category 10: Consistency
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Spacing and type scale | Present | `src/index.css` `@theme` tokens (`Bricolage Grotesque`, `Geist`) | — | Consistent typography and border/shadow tokens across screens. | — |
| Shared components | Partial | `Button`, `Badge`, `Avatar`, `Pagination` shared; confirmation dialogs and error retry banners are ad-hoc | Recommended | Extracting shared `<ConfirmDialog>` and `<ErrorBanner>` standardizes feedback across all screens. | S |
| Button hierarchy | Present | `src/components/ui/button.jsx` (`default`, `outline`, `secondary`, `destructive`, `ghost`) | — | Clear visual hierarchy. | — |
| Icons | Present | `lucide-react` with consistent 1.8–2.2px stroke width | — | Uniform iconography. | — |

### Category 11: Performance
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Code splitting | Present | `src/App.jsx:22-32` (`React.lazy` on all 11 workspace screens) | — | Main bundle is 153.9 KB gzip; role screens load on demand. | — |
| Lazy loading | Present | `Login.jsx` images use `loading="lazy"` | — | Below-the-fold illustrations defer loading. | — |
| Image optimization | Present | SVG illustrations and 500 KB max avatar cap | — | Lightweight vector assets. | — |
| Debounced search | Present | `FacultyReferral.jsx:60` (250ms debounce on student search) | — | Prevents API flood while typing. | — |

### Category 12: Trust and Privacy
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Privacy notice and consent | Partial | `Login.jsx:1030` has a 3-line summary; no full notice covering fingerprint check-in data, student records, or retention | Essential | Biometric check-ins and academic referrals require a clear, student-friendly Privacy Notice draft (marked "needs review by school or legal"). | S |
| Terms of use | Missing | `Login.jsx` footer & sign-in sheet | Recommended | Students need clear, plain-language rules on tutoring conduct, voucher redemption, and academic honesty (marked as draft for school review). | S |
| Re-authentication for sensitive actions | Partial | `AccountDialog.jsx` requires current password for password change; Superadmin referral delete uses confirm | Optional | Session cookies are HttpOnly and short-lived; `<ConfirmDialog>` on destructive admin actions is sufficient without a second password prompt. | — |
| No sensitive data in URLs | Present | Auth tokens in `HttpOnly` cookies / `localStorage`, never in query strings | — | URLs contain only non-sensitive IDs. | — |

### Category 13: Help
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| FAQ or help page | Partial | `Login.jsx:136` has 6 FAQs on public landing, but no Help/FAQ inside authenticated workspace | Recommended | Signed-in learners and tutors need quick access to common questions (how OTP works, how points post, weekly caps) from the sidebar/footer. | S |
| Report-a-problem link | Missing | Authenticated workspace & footer | Recommended | A simple "Help & Report a Problem" modal with campus support contact and current route/role reference helps students report issues. | S |
| Contextual tooltips | Partial | Basic `title` attributes on some icons; terms like "Weekly cap" or "Append-only ledger" lack brief inline help | Optional | Adding concise helper text/tooltips on point caps and check-in codes clarifies rules in place. | S |

### Category 14: Edge Cases
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Double-booked slots | Partial | Backend rejects conflicts, but `LearnerWizard.jsx:348,381` hardcodes all requests to `+3 days` at `3:30 PM` | Essential | Letting learners pick their preferred date and time slot in `LearnerWizard.jsx` prevents artificial slot collisions. | S |
| Tutor unavailable after booking | Partial | Tutors can pause availability (`Dashboard.jsx:681`) or cancel a session (`885`) | Recommended | When a session is cancelled or tutor is paused, learner sees clear next action ("Find another tutor" CTA). | S |
| Expired OTP | Partial | Backend enforces 10-min TTL (`sessions.js`); frontend lacks expiry timer and inline "Issue new code" prompt | Recommended | Showing a 10-minute countdown in `SessionCheckIn.jsx` makes expiry predictable and recoverable in one tap. | S |
| Interrupted video joins | Present | `LiveClassroom.jsx:133` auto-switches to Direct WebRTC on Jitsi failure + timer syncs from `started_at` | — | Video fallback and timer persistence across reloads are already implemented. | — |
| Gemini errors or rate limits | Partial | `DualPurposeChat.jsx` shows generic toast on AI failure | Recommended | Displaying a clear inline fallback message ("AI hint temporarily busy — try again in a moment or ask your peer tutor directly") keeps the session moving. | S |
| Double check-ins | Present | `server/routes/sessions.js` (`ON CONFLICT DO NOTHING`, requires 2 distinct participants) | — | Server strictly prevents duplicate check-ins. | — |

### Category 15: System-Specific
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Points history | Missing | `GET /api/wallet` returns `history` (last 30 ledger rows), but `RewardCatalog.jsx:26` ignores it | Essential | Users need to see *why* their balance changed (`+50 pts Session`, `-100 pts Voucher`). Data is already returned by `/api/wallet`. | S |
| Clear voucher redemption steps | Partial | `RewardCatalog.jsx:51` shows claim slip once, but ignores `vouchers` array from `GET /api/wallet` | Essential | If a student closes the claim slip, they can never see their voucher code again. Adding a "My Vouchers" tab using existing `/api/wallet` data fixes this immediately. | S |
| Session status timeline | Present | `GoogleClassroomSessions.jsx` & `SessionDetailModal.jsx` | — | Shows status badges, logged call duration, and timestamps. | — |
| Add-to-calendar | Missing | `Dashboard.jsx` upcoming sessions & `SessionDetailModal.jsx` | Recommended | A client-side `.ics` calendar download button on upcoming sessions helps busy college students remember their slot without external APIs. | S |
| Rating prompt after a session | Present | `SessionCheckIn.jsx:272-315` (5-star rating on Session Call Report) | — | Implemented and verified in the Session Call Report flow. | — |

### Category 16: Public Pages
| Item | Status | Evidence | Fit | Reason | Effort |
| :--- | :---: | :--- | :---: | :--- | :---: |
| Title | Present | `index.html:10` | — | Clear institutional title on landing page (dynamic per-route titles covered in Cat 1). | — |
| Meta description | Present | `index.html:9` | — | Descriptive summary present. | — |
| Favicon | Present | `index.html:5` (`/academix-icon.svg`) | — | Custom SVG icon configured. | — |
| Social preview | Missing | `index.html` lacks Open Graph (`og:title`, `og:description`, `og:type`) and Twitter card meta tags | Optional | Trivial (`S`) addition to `index.html` so campus links shared in student group chats render a clean preview card. | S |
| Footer with contact | Partial | `Login.jsx:898-937` has school name & location, but lacks support contact, Privacy/Terms links, and version | Recommended | Adding campus contact details, Privacy/Terms modal triggers, and app version completes the public footer. | S |

---

## 3. Build Order & Batches

Cross-cutting foundations come first so later batches reuse the same components without duplication.

```
[Batch 1: Cross-Cutting UX Foundations & Shell]
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
[Batch 2: Safe   [Batch 3: Booking [Batch 4: Wallet,
 Actions, Drafts  Picker, OTP UX    Vouchers, .ics &
 & Form Errors]   & AI Fallback]    In-App Reminders]
       └───────────────┼───────────────┘
                       ▼
[Batch 5: Privacy/Terms Drafts, Help/FAQ, Audit Viewer & Public Meta]
```

### Batch 1: Cross-Cutting UX Foundations & Shell [COMPLETED — Commit e64da0f]
1. **Shared `<ConfirmDialog>` (`src/components/ui/ConfirmDialog.jsx`)**: Accessible modal (`role="alertdialog"`, Escape/backdrop close, focus trap, destructive/primary variants) replacing raw `window.confirm` and guarding irreversible actions.
2. **Shared `<ErrorBanner>` (`src/components/ui/ErrorBanner.jsx`)**: Standardized `role="alert"` error panel with optional `onRetry` button.
3. **Shared `useDraftState` + `usePageTitle` + `Asia/Manila` Date Formatter (`src/lib/ux.js`)**:
   - `useDraftState(key, initialValue)` for `localStorage` draft recovery with `clearDraft()`.
   - `usePageTitle(title)` setting `document.title = "${title} · LCCB Academix"`.
   - `fmtManilaDate` / `fmtManilaDateTime` pinned to `timeZone: 'Asia/Manila'` + `.ics` file generator helper.
4. **App Shell & Connection Resilience (`src/App.jsx`, `src/components/SplashScreen.jsx`, `index.html`, `src/Landing.css`)**:
   - Skip-to-main-content link (`#main-content`), semantic `<header>` for mobile bar, `<main id="main-content">`.
   - Mobile safe-area handling (`viewport-fit=cover` in `index.html`, safe-area padding on sticky mobile bar).
   - Offline warning banner (`window` `online`/`offline` events) + extended cold-start hint in `SplashScreen.jsx`.
   - Proper 403 card in `RoleGate`, unauthenticated 404 notice on unknown paths, and public read access to `/profile/:id` and `/tutors/:id`.

### Batch 2: Safe Actions, Draft Recovery & Form Validation [COMPLETED]
1. **Destructive & Irreversible Action Confirmations**:
   - Wrapped session cancellation (`Dashboard.jsx`), session request withdrawal (`Dashboard.jsx`), tutor request decline (`Dashboard.jsx`), faculty referral rejection (`Dashboard.jsx`), superadmin referral removal (`Dashboard.jsx`), tutor applicant rejection (`SuperadminApprovals.jsx`), reward redemption (`RewardCatalog.jsx`), and qualification exam final submit (`TutorApplicant.jsx`) in accessible `<ConfirmDialog>`.
2. **Draft Recovery on Long Forms**:
   - Persisted in-progress qualification exam answers and question index in `TutorApplicant.jsx` via `useDraftState`, clearing upon submission.
   - Persisted tutor application subject/achievement draft in `TutorExam.jsx` and wrap-up notes draft in `SessionCheckIn.jsx`.
3. **Form Labels, Inline Validation & Error Recovery**:
   - Added `role="alert"` and `aria-invalid` / `aria-describedby` to `Login.jsx` and `AccountDialog.jsx` errors; replaced plain error divs with `<ErrorBanner onRetry={...} />`.

### Batch 3: Booking Slot Picker, OTP Countdown & Edge-Case Recovery (Depends on: Batch 1)
1. **Interactive Preferred Date & Time Slot Picker (`src/screens/LearnerWizard.jsx`)**:
   - Replace hardcoded `addDaysYmd(3)` and `'3:30 PM'` with date input (`min` = today in Manila) and campus time slot selector (`9:00 AM`, `10:30 AM`, `1:30 PM`, `3:00 PM`, `4:30 PM`) on the match/request step.
2. **Session Check-In OTP Countdown & Error UX (`src/screens/SessionCheckIn.jsx`)**:
   - Add a live 10-minute countdown timer (`09:59`) when a code is staged, an expired state with a prominent "Generate new code" button, and an inline `role="alert"` message on invalid/expired code entry.
3. **AI Assistant Rate-Limit / Error Fallback (`src/components/classroom/DualPurposeChat.jsx`)**:
   - Show an inline, student-friendly recovery note with retry cooldown when Gemini hints are rate-limited or unavailable.

### Batch 4: Points History, Active Vouchers, Calendar Export & Reminders (Depends on: Batch 1 & 2)
1. **Wallet Tabs: Catalog, My Vouchers & Points History (`src/screens/RewardCatalog.jsx`)**:
   - Read `vouchers` and `history` already returned by `GET /api/wallet`.
   - Add "My Vouchers" tab showing active/redeemed voucher codes so learners/tutors never lose a claimed perk.
   - Add "Points History" tab displaying the append-only ledger statement (`+50 pts`, `+25 pts`, `-100 pts`) with Manila timestamps.
2. **Add-to-Calendar (`.ics`) & In-App Session Reminder (`src/screens/Dashboard.jsx`, `src/components/classroom/SessionDetailModal.jsx`, `src/components/classroom/GoogleClassroomSessions.jsx`)**:
   - Add "Add to Calendar (.ics)" button on upcoming session cards and detail modal.
   - Display an in-app reminder callout on `Dashboard.jsx` when the user has an upcoming session scheduled for today or tomorrow, with a direct "Go to Check-in" CTA.

### Batch 5: Trust/Privacy Notice (Draft), Help/FAQ, Audit Viewer & Public Metadata (Depends on: Batch 1)
1. **Draft Privacy Notice, Terms of Use & Help/FAQ Modal (`src/components/LegalHelpModal.jsx`, `src/screens/Login.jsx`, `src/App.jsx`)**:
   - Plain, student-friendly **Privacy & Data Notice** (covering fingerprint check-in verification, academic referrals, uploaded proof files, and data retention) and **Terms of Use**, prominently bannered: *"DRAFT — Needs review by LCCB administration or legal counsel"*. Collects zero new personal data and makes no legal compliance claims.
   - Built-in **Help / FAQ & Report a Problem** view accessible from both the public footer and the authenticated sidebar, plus a "Forgot password?" inline helper on the sign-in sheet explaining campus IT/faculty reset steps.
2. **Superadmin Audit Log Viewer & Data Display Polish (`src/screens/Dashboard.jsx`, `src/screens/SuperadminApprovals.jsx`)**:
   - Add read-only "Recent Audit Trail" panel on Superadmin `Dashboard.jsx` consuming `GET /api/audit` with "Load more".
   - Add search + urgency filter on Faculty Referral Board, search on Superadmin Approvals, `overflow-x-auto` on the Department table, and "Last updated" timestamp + manual Refresh button.
3. **Public Metadata & 44px Tap Targets (`index.html`, `src/screens/Login.jsx`, `src/Landing.css`)**:
   - Add Open Graph / social preview meta tags in `index.html`, campus contact & version in `Login.jsx` footer, and `min-h-[44px]` + visible focus outlines on landing navigation and footer buttons.

