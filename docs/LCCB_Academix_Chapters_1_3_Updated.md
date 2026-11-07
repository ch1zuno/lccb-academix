# LCCB ACADEMIX: FACULTY-GUIDED PEER TUTORING AND INCENTIVE LEDGER SYSTEM FOR LA CONSOLACION COLLEGE BACOLOD

**Submitted In Partial Fulfillment of the Requirements for**  
**ITS 222: System Analysis and Design**  
**1st Semester, S.Y. 2026–2027**  

**Submitted by:**  
Cemer Daniel Miranda — *Project Manager*  
Jose Ady Tornea — *Project Assistant*  

**Submitted to:**  
Mrs. Bethel B. Tisuela, MSCS — *Subject Teacher*  

**November 2026**

---

# Chapter 1: Introduction

In every academic institution, the learners who fall behind are rarely the ones who cannot be helped — they are usually the ones who are simply not noticed early enough, or noticed but never given a structured way to recover. Peer tutoring remains one of the most cost-effective and consistently validated responses to this problem: decades of research confirm that when students are tutored by fellow students, the tutee gains measurable academic improvement while the tutor deepens and reinforces his or her own mastery of the subject. For a college such as La Consolacion College Bacolod, peer tutoring is not merely an accommodation service; it is a formal obligation under student-welfare programs, and the service hours completed by student-tutors are meant to be recognized with community-service incentives.

However, despite the maturity of the practice, most tutorial programs in local colleges — including La Consolacion College Bacolod — continue to run through traditional, manual means. Faculty members flag at-risk learners through verbal reminders, paper referral slips, or personal chat messages. Students find tutors through word-of-mouth. Session attendance is "confirmed" by the memory and honesty of the participants themselves. The community-service hours of tutors are tallied on scattered spreadsheets or handwritten certificates, and the points a learner or tutor has supposedly earned cannot be verified, audited, or redeemed against any official catalog. This fragmentation creates what is effectively an invisible program: real hours are rendered and real help is given, but no official institutional record ever proves it.

La Consolacion College Bacolod, an Augustinian institution in Bacolod City, exemplifies this operational reality. The college has accredited student-tutors across its departments — Information Technology, Accountancy, Education, Business Administration — and faculty members who actively refer students for remediation, yet the entire cycle from referral to incentive lives on disconnected forms and informal accounts. The absence of a unified digital platform not only exposes the program to disputes, duplicated claims, and audit failure, but also denies the college the one thing a service program needs to justify its budget and scale: reliable data on who is being helped, by whom, and how effectively.

By implementing LCCB ACADEMIX — a faculty-guided peer tutoring and incentive ledger system — the college will not only resolve its immediate record-keeping bottlenecks but also transform peer tutoring from an unrecorded favor into an official, quotable program. Faculty referrals are tracked to resolution; tutor matching is performed through a verifiable directory of accredited, available tutors per subject; session attendance is double-confirmed through one-time identification tokens or through a fingerprint-capable check-in device; and every completed session closes with a tutor's note, a learner rating, an automatic hour deduction from the referral, and an automatic posting of community points to a permanent, append-only ledger that learners can redeem against an official campus rewards catalog. The college gains a single dashboard of live analytics — active tutors, delivered hours, points issued, referral recovery rate — that turns the tutoring program into a defensible, data-driven institutional service.

## Statement of the Problem

The study aims to design and develop a Faculty-Guided Peer Tutoring and Incentive Ledger System for La Consolacion College Bacolod.

Specifically, it seeks to answer the following questions:

1. What is the current status of the peer tutoring operations of La Consolacion College Bacolod in terms of:
   1. Referral handling for at-risk learners and tutor matching per subject;
   2. Session scheduling, attendance, and check-in verification;
   3. Service-hour recording, community-points accounting, and reward redemption?
2. What are the challenges encountered by the faculty, learners, accredited tutors, and administrators using the current manual procedures?
3. What is the level of acceptability of the developed system in terms of:
   1. Functional Suitability
   2. Performance Efficiency
   3. Usability
   4. Security

## Objectives of the Study

### General Objective
To design, develop, and evaluate a centralized, auditable, Faculty-Guided Peer Tutoring and Incentive Ledger System for La Consolacion College Bacolod that integrates referral tracking, tutor matching, verified session attendance, automatic service-hour and community-points accounting, anti-farming integrity caps, reward redemption, tutor accreditation, and immutable audit logging into a single digital platform.

### Specific Objectives
1. To assess the current status of peer tutoring operations at La Consolacion College Bacolod regarding referral handling, session attendance, and service-hour and reward recording.
2. To identify manual operational challenges and develop a web-based system featuring:
   - A faculty referral management board with assignment, rejection, and CSV export capabilities;
   - An accredited tutor matching wizard with availability filtering and double-booking prevention;
   - A dual-confirmation attendance verification module using short-lived (10-minute) OTP/QR tokens and physical biometric fingerprint device integration;
   - An atomic session wrap-up transaction that deducts mandatory hours, auto-resolves completed referrals, and enforces rolling weekly points caps (500 pts for tutors, 250 pts for learners) to prevent session farming;
   - A server-side stock-locked rewards redemption catalog issuing unique cryptographic voucher codes;
   - A rigorous tutor accreditation module featuring multi-file document upload (PDF/DOCX/PNG up to 4 MB each in PostgreSQL `bytea`), a 30-minute server-timed qualification examination with concealed answer keys, and a superadmin approval board;
   - Dual trigger-enforced append-only database ledgers (`points_ledger` and `audit_log`) providing immutable financial and administrative audit trails; and
   - A superadmin institutional dashboard with CTE-powered real-time analytics, six-week trend lines, and departmental breakdowns.
3. To evaluate the level of acceptability of the developed system among learners, tutors, faculty, and administrators based on ISO/IEC 25010 software quality standards in terms of Functional Suitability, Performance Efficiency, Usability, and Security.

## Significance of the Study

The development of the Faculty-Guided Peer Tutoring and Incentive Ledger System is expected to provide significant improvements to the tutoring program of La Consolacion College Bacolod. Specifically, the following groups will benefit from this study:

- **Faculty / Academic Advisers:** Teachers no longer have to chase paper referral slips or wonder whether a referred student is actually attending sessions. The referral board gives them live status visibility for every flagged learner — flagged, assigned, in-progress, resolved, or rejected — together with the remaining mandatory hours and the tutor's accompanying notes after every wrap-up. Early intervention becomes measurable: a professor can see at a glance which referrals are recovering and which have stalled.
- **Students (Learners):** The system gives learners a transparent path from being "flagged" to being "resolved." Instead of waiting for a faculty member to personally arrange a tutorial, the learner can search an official directory of accredited tutors by subject and availability, book a session, confirm attendance with a one-time code, and watch attendance credits post directly to a personal ledger. The clouds of uncertainty over "did my hours count?" are eliminated.
- **Accredited Student-Tutors:** Tutors earn verifiable community service points (+50 per completed session), achievement badges, and a permanent service record that survives beyond the semester. Their accreditation status is official and searchable, and their accumulated points can be redeemed from an official campus rewards catalog with automatically issued vouchers — ending the informal IOU-style recognition that previously depended on incomplete handwritten records.
- **College Administration (Superadmin / Dean):** The administrator gains a single "bird's-eye view" of the entire tutoring program through a dashboard of CTE-powered analytics: active accredited tutors, delivered hours, points issued, referral recovery rates, per-department breakdowns, and six-week trends. Every approval (tutor accreditation, with the dean's certification recorded) and every high-value event sits on an immutable, trigger-enforced audit log, giving the college a trustworthy audit trail it has never had.
- **Future Researchers:** This research provides IT students who want to develop institutional record systems with a complete, reproducible technical reference — a web architecture (React + Express + PostgreSQL) that unites role-based access control, one-time-token attendance verification, atomic ledger transactions, server-timed qualification examinations, in-database binary document storage, and trigger-enforced append-only audit logging.

## Scope and Limitations of the Study

### Scope
The study focuses on the development and implementation of a web-based peer tutoring and incentive ledger system tailored specifically for the operations of La Consolacion College Bacolod. The system's primary capabilities are bound by the following features:

1. **Referral Management:** A faculty-and-superadmin module for flagging at-risk learners. Each referral records the learner, subject, urgency, topic, and required number of hours, and is tracked through a strict lifecycle (**flagged → assigned → in-progress → resolved / rejected**), with a provision that the referral auto-resolves when its remaining hours reach zero. Faculty may reject unneeded referrals, superadmins may remove rejected entries, and referral records can be exported into formula-safe CSV reports.
2. **Tutor Matching and Booking:** A public tutor directory filterable by subject accreditation and availability, and a learner matching wizard that produces session requests carrying topic, preferred date, time, and room. Only tutors accredited for the requested subject may accept, and double-booking is strictly prevented by a server-level unique constraint (`uq_sessions_active_slot`).
3. **Session Check-In:** A two-party attendance verification module. The tutor stages a one-time identification token (OTP/QR code pair) with a ten-minute validity; both participants must confirm the token before the session officially starts. A secondary physical channel allows a fingerprint-capable device to import a session roster (`/device/import-roster`) and verify participants (`/device/verify`) through a secured device key (`X-Device-Key`).
4. **Session Wrap-Up & Incentive Ledger Core:** A single atomic transaction that closes the session by recording the tutor's notes and the learner's 1–5 rating, debiting hours from the referral, crediting the points ledger (+50 to the tutor, +25 to the learner), and awarding achievement badges. To prevent collusion and session farming, the system enforces **rolling weekly caps (500 points for tutors, 250 points for learners)**; sessions exceeding the cap complete normally for academic credit while withholding excess reward points.
5. **Rewards Catalog and Redemption:** An official campus catalog of rewards priced in community points, with server-side stock control (row-locked `FOR UPDATE` decrements), a ledger debit against validated user balances, and an automatically generated voucher (`LCCB-XXXXXXXX`) on successful redemption.
6. **Tutor Accreditation & Examination:** A learner-initiated application (target subjects, academic achievement notes, and supporting achievement documents). Applicants can upload up to five supporting files (PDF, DOC/DOCX, PNG, JPG/WEBP up to 4 MB each) stored directly in PostgreSQL as binary (`bytea`) with MIME and magic-byte validation to eliminate third-party cloud storage dependencies. Applicants undergo a one-shot, 30-minute server-timed qualification examination (answers are never exposed to the client). The superadmin approval board enforces a strict validation policy: approval is blocked until the candidate has completed the exam and attached at least one supporting document. Superadmins can also reset stranded exam attempts without invalidating the application.
7. **Session Security & Audit Logging:** An append-only `audit_log` protected by database triggers that records administrative approvals, exam attempts, redemptions, cancellations, and authentication events with actor IDs, IP addresses, and JSON payloads. Authentication utilizes JSON Web Tokens (JWT) stored in HttpOnly, SameSite=Strict cookies with database `token_version` tracking for immediate multi-device session revocation upon password rotation or global logout.
8. **Institutional Analytics and Public View:** A superadmin dashboard of aggregated CTE-powered KPIs, six-week trends, and department-level statistics; and an anonymous public landing page showing live community ledger totals (verified tutors, hours delivered, points issued, active subjects, and honor roll).
9. **Data Privacy and Retention Compliance:** Automated data subject export (`npm run db:export`) and retention purge routines (`npm run db:purge`) compliant with the Philippine Data Privacy Act of 2012 (RA 10173).

### Limitations of the Study
To ensure the project remains focused and achievable, the proposed system is subject to the following limitations:

1. **Notification Delivery:** Notifications are delivered in-app only. The system does not integrate SMS or external e-mail gateways, so urgent alerts (a referral flag, a check-in window opening) rely on in-app polling or existing institutional communication channels.
2. **Payment Processing:** The system calculates point debits and issues claim vouchers, but the physical release of merchandise or privileges is handled manually by the campus office. It does not process cash or e-wallet transactions (GCash/Maya).
3. **Real-Time Biometric Sync:** The system does not pull live fingerprint streams over the cloud. The physical device operates in batch mode, importing session rosters and posting verification records over HTTPS with an API authentication key, keeping the web application independent of specific biometric hardware vendors.
4. **Native Mobile Application:** The system is built as a responsive Progressive Web Application (PWA) accessed through standard web browsers. Offline session check-in requires an active network connection to the school's server.
5. **Academic Records Integration:** The system's analytics are limited to the data it captures. It does not directly interface with the registrar's grading database or the campus Learning Management System (LMS); referral urgency and academic evaluation remain under faculty discretion.

## Definition of Terms

- **Accreditation:**  
  *Conceptual:* The formal process by which an institution certifies that an individual possesses the competence to perform a specific service or role.  
  *Operational:* The workflow in the system where a learner submits an application with supporting documents (up to 5 files, 4 MB each, stored as `bytea`), completes a 30-minute server-graded qualification exam, and receives superadmin approval, which flags the account as an officially verified tutor (`is_verified = true`, `certified_by_id`).

- **Attendance Credit:**  
  *Conceptual:* An official recognition of a person's verified presence at a scheduled activity.  
  *Operational:* The +25 community points automatically posted to a learner's ledger when a checked-in session is wrapped up.

- **Audit Log / Audit Trail:**  
  *Conceptual:* A secure, chronological record of system activities that enables the reconstruction and examination of events.  
  *Operational:* The database-trigger protected, append-only `audit_log` table recording actor IDs, IP addresses, action types, entity references, and JSON detail payloads for all critical transactions (logins, password rotations, approvals, redemptions, exam attempts, cancellations).

- **Badge:**  
  *Conceptual:* A visual emblem awarded to recognize the completion of a notable accomplishment.  
  *Operational:* The achievement markers (e.g., "First Session", "Rising Star") the system automatically grants upon completing specified milestones during session wrap-up transactions.

- **Check-In:**  
  *Conceptual:* The act of registering one's presence at a scheduled event or session.  
  *Operational:* The two-party verification step where both tutor and learner confirm the same one-time token (or where a device verifies participants by fingerprint) before a session transition from `upcoming` to `in-progress`.

- **Community Points:**  
  *Conceptual:* A unit-based incentive currency earned through verified service or participation and redeemable for benefits.  
  *Operational:* The ledger entries (+50 to tutors, +25 to learners) issued only upon completion of a double-confirmed session, subject to rolling weekly anti-farming caps (500 pts for tutors, 250 pts for learners), permanently recorded in an append-only ledger and redeemable from the campus rewards catalog.

- **JWT (JSON Web Token):**  
  *Conceptual:* An open-standard, digitally signed token used to securely verify a user's identity between software systems.  
  *Operational:* The digitally signed authentication token transmitted via HttpOnly, SameSite=Strict cookies, validated against a database `token_version` column to enable immediate global session revocation upon password rotation or account logout.

- **Ledger (Points Ledger):**  
  *Conceptual:* A permanent, append-only record of every value-generating or value-consuming transaction in a system.  
  *Operational:* The system's authoritative `points_ledger` table, protected by PostgreSQL database triggers that strictly prohibit UPDATE and DELETE operations, serving as the official financial audit trail of student incentives.

- **Learner / Tutee:**  
  *Conceptual:* A student who has been identified as needing remediation in a specific subject area.  
  *Operational:* The user role that receives faculty referrals, searches accredited tutors, books sessions, confirms check-ins, and redeems points toward campus rewards.

- **OTP (One-Time Password) Token:**  
  *Conceptual:* A temporary, single-use password used to verify identity for a single event within a limited time window.  
  *Operational:* The six-digit code pair (e.g., "836701-793354") staged by the tutor with a ten-minute validity, which both participants must confirm once each before the session starts; reuse and expired tokens are rejected.

- **Referral:**  
  *Conceptual:* A formal recommendation directing a person toward a specific support service.  
  *Operational:* The faculty-initiated record carrying a learner, subject, urgency, topic, and required hours, tracked through the lifecycle statuses `flagged`, `assigned`, `in-progress`, `resolved`, and `rejected`.

- **Rewards Catalog:**  
  *Conceptual:* An official list of items or privileges available to participants in exchange for their accumulated reward currency.  
  *Operational:* The college's official list of campus perks (library passes, photocopy vouchers, printing credits) priced in community points, featuring row-locked `FOR UPDATE` stock decrementing and unique voucher issuance per successful redemption.

- **Session:**  
  *Conceptual:* A scheduled, bounded meeting between a service provider and a recipient for a specific purpose.  
  *Operational:* The booked tutoring hour between an accredited tutor and a learner, carrying a topic, subject, date, time, room, numeric duration, and a status progressing from `upcoming` through `in-progress` to `completed`.

- **Superadmin:**  
  *Conceptual:* The highest-level administrator of a system, with unrestricted access to all modules and data.  
  *Operational:* The dean-level role that manages tutor accreditation approvals, rewards stock, referral oversight, audit logs, and institutional analytics for the college.

- **Token Versioning:**  
  *Conceptual:* A stateful invalidation mechanism used to revoke cryptographically signed stateless tokens.  
  *Operational:* The integer counter `token_version` stored in the `users` table, which is incremented upon password changes or global logout requests to immediately invalidate all pre-existing JWTs across all devices.

- **Voucher:**  
  *Conceptual:* A document or alphanumeric code that entitles its holder to claim a specific good or privilege.  
  *Operational:* The automatically generated, cryptographically random claim code (e.g., "LCCB-A6CC65C0") issued to a learner's account upon a successful points redemption transaction.

- **Wrap-Up:**  
  *Conceptual:* The formal closing stage of an activity in which results are evaluated and recorded.  
  *Operational:* The single atomic transaction that ends a session, saves tutor notes and learner 1–5 ratings, debits hours from the associated referral, auto-resolves exhausted referrals, applies weekly cap checks, and posts points and badges to the ledger.

---

# Chapter 2: Review of Related Literature and Studies

This chapter presents a concise review of academic literature and existing systems that establish the foundation for the Faculty-Guided Peer Tutoring and Incentive Ledger System for La Consolacion College Bacolod. The gathered materials highlight gaps in mentoring program record-keeping and the necessity of verified attendance and incentive accounting in educational service programs.

## Review of Related Literature

This section evaluates key concepts and evidence regarding peer tutoring as an academic intervention and the incentive/recognition structures that sustain it.

### Foreign Related Literature
**Peer Tutoring Effectiveness and Reward Structure.** Meta-analytic evidence across decades confirms that peer-assisted learning reliably raises achievement for tutees and tutors alike, with the largest gains accruing to the youngest, lowest-performing, and highest-need students. Crucially, these analyses also demonstrate that the effect of a tutoring program is amplified when reward contingencies are interdependent — that is, when both parties visibly benefit, the evaluation is ipsative (self-referenced progress against one's own baseline) and the participant retains autonomy (Rohrbeck, Ginsburg-Block, Fantuzzo & Miller, 2003). This directly explains why an institution cannot simply "encourage" struggling students to find help: the program must be structured so that progress is visible, benefits flow automatically, and matching remains learner-initiated where possible.

**Gamified Incentives in Digital Learning Environments.** Gamification research in university settings shows that points, badges, and leaderboards can produce meaningful improvements in effort and engagement, but only when the game elements are anchored to verifiable learning activity rather than participation theater — superficial points awarded for mere presence produce no benefit and can even crowd out intrinsic motivation (Domínguez, de Navarrete, de Marcos, Fernández-Sanz, Pagés & Martínez-Herráiz, 2013). This finding establishes the design rule adopted by the present system: points are never issued for accounts or activity; they post only after a double-verified session has closed, and badges serve as legible milestones on an audited service record.

### Local Related Literature
**Peer Tutoring in the Philippine Setting.** Local quasi-experimental evidence strongly parallels the foreign findings. At a Philippine university, struggling Grade 8 science students who accepted peer tutoring showed better participation, stronger expert-like perceptions of science, and higher exam performance than similarly struggling peers who did not attend sessions (Bellen & Jomoc, 2017). In another study, Grade 5 pupils in Sanchez Mira, Cagayan experienced significant, large-effect improvement in mathematics after structured peer tutoring — leading the author to stress that a tutoring program's effect depends critically on how well its structure is engineered (Danga, 2022). Both works share a common undertone for the present study: in the Philippine context, the tutoring itself works, but it is the record-keeping around it that usually collapses — referrals circulate informally, sessions are attended without verification, and service hours are stacked on paper.

### Synthesis of Related Foreign and Local Literature
The reviewed literature establishes that structured peer tutoring is a validated high-impact intervention and that its effectiveness is magnified by automatic reward contingencies and learner autonomy. Both global meta-analytic evidence and local Philippine experimental studies converge on the same principle: the tutoring works, but only when its structure — matching, verification, and recognition — is engineered deliberately rather than administered by memory. This justifies the present system's design of an institution-backed directory, an automatic double-confirmation check-in, anti-farming integrity caps, and an append-only incentive ledger.

## Review of Related Studies

This section presents existing research on implemented systems for tutoring program administration, verified attendance systems, and incentive ledgers.

### Foreign Related Studies
**Peer Tutoring Program Administration in Higher Education.** A recent comprehensive meta-analysis focused specifically on peer tutoring in higher education confirmed significant positive effects on tutees' academic performance and, importantly for system builders, isolated the conditions under which programs succeed: structured sessions, explicit role expectations, and clear reporting (Zhang, Sun, Jiang et al., 2025). These moderators map directly to software features: a session cannot exist without both parties' roles being fixed at creation, and cannot be "counted" without a completed wrap-up record.

**Verified Digital Attendance Systems.** QR code-based attendance implementations have demonstrated that short-lived, digitally verified codes substantially reduce manual record errors and eliminate proxy attendance compared with pen-and-paper logs (Amin, Lusiana, Hartono & Wahyu, 2024). At the same time, these studies identify the key security risk of digital check-in — token replay and reuse — which the present system neutralizes by issuing strictly one-shot identification tokens with a ten-minute validity and rejecting any reuse with an immediate server-side rejection.

### Local Related Studies
**Peer Tutorial Programs and Student Recognition.** A study of a university-based peer tutorial program in the Philippines documented through thematic analysis the programs' benefits to students who were at risk of failing: good study habits, improved academic performance, reinforced subject mastery, and confidence — but also emphasized that participation and recognition must be made visible and institutionally backed for these benefits to be sustained (Tan, 2020). This validates the present system's insistence that recognition be mechanical rather than occasional: each completed wrap-up posts credits and badges regardless of whether anyone remembers to do so manually.

**Web-Based Biometric and QR Attendance Systems in Philippine Institutions.** A system developed for a state university in Sorsogon demonstrated that QR-based recording dramatically reduced manual verification time and produced defensible, timestamped attendance records in an institutional setting (Agripa & Astillero, 2022). This supports the present system's dual-channel design: a fully digital check-in (OTP/QR confirmations) for online or device-capable sessions, and a device-fingerprint channel (`/device/import-roster`, `/device/verify` secured by a device key) for physically held laboratory sessions where participants lack reliable personal devices.

### Synthesis of Related Foreign and Local Studies
Existing studies consistently demonstrate that structured, verified, and recognized tutoring programs outperform informal ones, and that digital verification of attendance is the single most defensible way to anchor claims about service rendered. While foreign and local research frequently addresses each component in isolation — either tutoring outcomes or attendance devices or gamified incentives — a gap remains for a unified platform tailored to the complete cycle of a college peer tutoring program: referral → matching → verified attendance → wrap-up → automatic points → redemption → accreditation, all under one append-only ledger. This is the specific gap that the LCCB ACADEMIX system fills.

---

# Chapter 3: Methodology

The system was developed through iterative sprints (an Agile-style workflow) so that each module — referral, matching, check-in, wrap-up, rewards, accreditation, and institutional auditing — was demonstrated to stakeholders before the next was built. The methodology chapter presents the system analysis through its Context Flow Diagram (CFD) and Data Flow Diagram (DFD Level 0), the project timeline through a Gantt chart, and the project's financial viability through its development cost, operating cost, and cost–benefit analysis.

## Context Flow Diagram (CFD)

The Context Flow Diagram presented below illustrates the highest-level overview of the Faculty-Guided Peer Tutoring and Incentive Ledger System developed for La Consolacion College Bacolod. It depicts the system as a single central process — represented by a circular process symbol (process bubble 0.0) labeled "LCCB ACADEMIX" — surrounded by all external entities that interact with it. The CFD does not show internal processes or data stores; instead, it focuses on identifying the key actors in the system and the nature of the data that flows between them and the system as a whole. Six external entities are identified in the diagram:

1. **Superadmin (Dean / Department Head):** Manages user accounts, role allocations, tutor accreditation reviews, rewards stock levels, and referral audits; in return, receives full institutional analytics, system audit trails, and financial ledger reports.
2. **Faculty / Academic Adviser:** Submits academic referrals for flagged at-risk learners, assigns tutors, or rejects invalid referrals; in return, receives real-time referral tracking, remaining mandatory hours, and session notes.
3. **Accredited Student-Tutor:** Submits accreditation applications with supporting achievement documents, takes the server-timed qualification examination, accepts or declines session requests, stages check-in tokens, and submits wrap-up notes; in return, receives session schedules, community-point credits (up to weekly caps), achievement badges, and verifiable service records.
4. **Learner (Tutee):** Searches accredited tutors, books tutoring requests, confirms check-ins via OTP/QR, and redeems accumulated points; in return, receives booking confirmations, session attendance credits, referral recovery progress, and redemption claim vouchers.
5. **Biometric / Check-In Device:** Transmits imported session rosters and fingerprint verification events via an HTTPS API client authenticated with a secured device key (`X-Device-Key`), receiving roster validation statuses in return.
6. **General Public (Visitor):** Interacts without authentication via the public landing page to inspect live community ledger statistics (verified tutors, hours delivered, points issued, active subjects, and the student honor roll).

*(Refer to Figure 1 below for the visual diagram.)*

## Data Flow Diagram (Level 0 DFD)

The Data Flow Diagram at Level 0 decomposes the central system into its seven major processes and identifies the underlying data stores, represented using the standard open-ended rectangle notation as DS1 through DS7:

- **DS1: Users & Profiles** (`users`, `user_subjects`, `tutor_availability`): Stores credentials, roles, profile bios, department affiliations, accreditation status, and `token_version` counters.
- **DS2: Referrals** (`referrals`): Stores faculty-initiated remedial referrals, urgency levels, remaining hours, and lifecycle statuses (`flagged`, `assigned`, `in-progress`, `resolved`, `rejected`).
- **DS3: Sessions & Attendance** (`sessions`, `session_check_ins`, `check_in_tokens`, `session_requests`): Stores scheduled bookings, active slot locks, 10-minute check-in tokens, and dual-party confirmation timestamps.
- **DS4: Points Ledger** (`points_ledger`): Stores an append-only, trigger-protected ledger of all credit (+50 tutor, +25 learner) and debit (redemption) point movements.
- **DS5: Rewards & Redemptions** (`rewards`, `redemptions`): Stores campus perks catalog, stock quantities, and issued redemption claim vouchers (`LCCB-XXXXXXXX`).
- **DS6: Tutor Applications & Supporting Documents** (`tutor_applications`, `application_subjects`, `application_documents`, `exam_questions`): Stores accreditation applications, binary document attachments (`bytea`), and server-side exam scoring records.
- **DS7: Audit Log** (`audit_log`): Stores an append-only, trigger-protected record of high-value administrative and security operations (logins, approvals, redemptions, cancellations, exam resets).

### Process Descriptions

- **Process 1 (P1) — Login, Authentication, and Session Security:** Handles credential verification against DS1 using bcrypt password hashing. Upon successful validation, issues a signed JSON Web Token (JWT) transmitted via an HttpOnly, SameSite=Strict cookie. Checks `token_version` on every authenticated request to support instant session revocation upon password change or global logout. Failed login attempts are throttled by an IP-based rate limiter.
- **Process 2 (P2) — Referral Management:** Operated by Faculty and Superadmin to record at-risk learners into DS2. Enforces the referral lifecycle (`flagged → assigned → in-progress → resolved / rejected`). Provides filtering, tutor assignment, rejection handling, and formula-safe CSV data export for departmental meetings.
- **Process 3 (P3) — Matching and Session Request:** Allows learners to search accredited, available tutors in DS1. Generates session requests containing subject, topic, date, time, and location. Tutors can accept or decline requests; on acceptance, writes an active session to DS3 while enforcing server-side unique constraints (`uq_sessions_active_slot`) to prevent double-booking.
- **Process 4 (P4) — Check-In and Verification:** Receives single-use tokens staged by tutors (valid for 10 minutes) and validates confirmations from both participants. Also receives batch roster import and fingerprint verification events from the physical Biometric Device. Transitions session status to `in-progress` once dual confirmation is established.
- **Process 5 (P5) — Wrap-Up and Incentive Ledger:** Executes a single atomic database transaction at session conclusion. Records tutor notes and learner 1–5 ratings, debits session duration from DS2 referral hours (auto-resolving at zero hours remaining), evaluates rolling 7-day weekly caps (500 pts tutor, 250 pts learner), appends credits to DS4, and awards milestone badges.
- **Process 6 (P6) — Rewards Redemption:** Receives point redemption requests from learners. Evaluates current balances against DS4 using `FOR UPDATE` row-locking, decrements inventory stock in DS5, posts debit ledger rows to DS4, logs an audit entry in DS7, and issues an alphanumeric claim voucher (`LCCB-XXXXXXXX`).
- **Process 7 (P7) — Tutor Accreditation and Examination:** Manages the candidate accreditation workflow. Ingests supporting achievement documents (up to 5 files, 4 MB each, stored as binary `bytea` in DS6 with MIME/magic-byte validation). Administers a 30-minute server-timed qualification examination where answer keys remain server-side. Provides superadmins with an approval board where approval is strictly blocked unless the exam is passed and at least one document is attached, with an option to reset stranded exam attempts.

*(Refer to Figure 2 below for the visual Level 0 DFD.)*

## Project Gantt Chart

The project timeline spanned requirements gathering and system analysis during early summer, followed by eight development sprints (authentication & session revocation, referral lifecycle, matching & slot constraints, dual check-in channels, wrap-up ledger transaction & weekly caps, rewards & stock control, accreditation & document ingestion, and analytics with audit logging), followed by rigorous e2e testing and ISO 25010 evaluation.

*(Refer to Figure 3 below for the Gantt Chart.)*

## Development Cost

The total development cost amounts to **₱2,900.00**, covering only the fixed and unavoidable expenses of domain registration (₱800.00), web hosting / cloud deployment (₱1,500.00), and physical printing and binding of the research paper (₱600.00). All development labor, system design, database modeling, core coding, testing, and documentation were performed by the researchers at no charge, as this system was built in-house as part of an academic thesis requirement. The application runs on free-tier cloud services, and the embedded PostgreSQL database runs locally for demonstrations, so no commercial software licenses were purchased.

### Figure 4. Development Cost of the LCCB Academix Peer Tutoring and Incentive Ledger System

| Item | Particulars | Cost (₱) |
| :---: | :--- | :---: |
| 1 | Domain registration (1 year) | 800.00 |
| 2 | Web hosting / cloud deployment | 1,500.00 |
| 3 | Printing & binding of research papers | 600.00 |
| **Total** | **Total Development Cost** | **₱2,900.00** |

## Operating Cost

The projected annual operating cost is **₱2,800.00**, which accounts for future system upkeep and a maintenance safety margin. This includes a ₱500.00 contingency buffer allocated for unexpected operational issues, minor local repairs, or physical supplies (rewards voucher paper, evaluation forms). The remaining ₱2,300.00 covers the deferred annual renewal expenses for domain registration (₱800.00) and shared web hosting (₱1,500.00). These web fees are currently non-incurred and will only apply if the management decides to migrate the software permanently online, as the platform is currently fully operational using free-tier hosting (Vercel Hobby tier and a free managed PostgreSQL instance). All other recurring operational needs — including system maintenance, database backups, rewards stock updates, exam-question refreshes, and continuous staff training — are managed directly by the researchers at zero cost, as they have been formally designated to oversee the system administration upon deployment.

### Figure 5. Operating Cost of the LCCB Academix Peer Tutoring and Incentive Ledger System

| Item | Particulars | Annual Cost (₱) |
| :---: | :--- | :---: |
| 1 | Contingency buffer (repairs, supplies, voucher forms) | 500.00 |
| 2 | Deferred domain renewal | 800.00 |
| 3 | Deferred shared web hosting | 1,500.00 |
| 4 | System maintenance, backups, staff training (researchers) | 0.00 |
| **Total** | **Total Annual Operating Cost** | **₱2,800.00** |

## Cost-Benefit Analysis

The cost–benefit analysis compares the system's total cash outlay against the tangible annual savings it generates for the college once manual record-keeping is retired.

**Tangible Annual Benefits:** The system eliminates four major recurring expenses of the manual process:
1. **Manual encoding:** Staff and faculty encoding of referrals, service-hour certificates, and redemptions consumes approximately 4 hours per week, valued at ₱250.00 per hour, for an annual saving of **₱40,000.00**.
2. **Paper and printing supplies:** Printed forms, certificates, and approval slips previously used average around 400 pages per term, or **₱8,000.00** per year.
3. **Dispute reconciliation:** Verified digital check-in and immutable ledgers eliminate disputed and duplicated service-hour claims that typically consume 20 staff hours per year to reconcile, valued at **₱5,000.00**.
4. **Catalogue inventory reconciliation:** Automated stock decrements and voucher generation remove manual catalog audits during redemption periods, worth roughly **₱3,000.00** per year.

The total tangible annual benefit is therefore **₱56,000.00**, exclusive of significant intangible benefits — complete auditability, faster administrative decisions, student motivation through transparent rewards, and data-driven deployment of tutors to subjects of greatest need.

### Figure 6. Cost–Benefit Analysis Summary (5-Year Horizon, in Philippine Pesos)

| Year | Recurring Cash Cost (₱) | Cumulative Total Cost (₱)* | Annual Benefit (₱) | Net Cumulative Benefit (₱) |
| :---: | :---: | :---: | :---: | :---: |
| 0 (build) | 2,900.00 (one-time) | 2,900.00 | 0.00 | -2,900.00 |
| 1 | 2,800.00 | 5,700.00 | 56,000.00 | +50,300.00 |
| 2 | 2,800.00 | 8,500.00 | 56,000.00 | +102,800.00 |
| 3 | 2,800.00 | 11,300.00 | 56,000.00 | +155,300.00 |
| 4 | 2,800.00 | 14,100.00 | 56,000.00 | +207,800.00 |
| 5 | 2,800.00 | 16,900.00 | 56,000.00 | +263,100.00 |

*\* Cumulative total cost = development cost + cumulative operating cost.*

**Payback Period:** The ₱5,700.00 first-year total cash outlay is fully recovered by the ₱56,000.00 annual tangible savings within approximately the first two (2) months of operation, after which the system yields a net annual benefit of roughly ₱53,000.00 to the college.

**Return on Investment (5-Year):**  
$$	ext{ROI} = \left(rac{	ext{₱}263,100.00}{	ext{₱}16,900.00}ight) 	imes 100 pprox 1,556\%$$  
The figure is driven primarily by the fact that development labor was donated by the researchers. Even excluding the labor exemption, the system remains decisively positive because its recurring operational cost is negligible against the administrative labor it displaces.

---

# References / Webliographies

- Agripa, D. J. B., & Astillero, S. (2022). Development of employee attendance and management system using Quick Response (QR) code in Sorsogon State University, Castilla Campus, Philippines. *European Journal of Education Studies*, 9(11). https://doi.org/10.46827/ejes.v9i11.4545
- Amin, I., Lusiana, V., Hartono, B., & Wahyu, D. (2024). QR code-based attendance system for contact tracking post-pandemic. *CogITo Smart Journal*, 10(1), 436–450. https://doi.org/10.31154/cogito.v10i1.490.436-450
- Bellen, J. A., & Jomoc, A. B. (2017). Supporting struggling Grade 8 science students' motivation, participation and performance through peer-tutoring approach. *Annals of Tropical Research*, 39(1). https://ejournals.ph/article.php?id=26895
- Danga, M. O. (2022). Peer tutoring: Its effects on academic performance of 5th grade students in mathematics at Sanchez Mira Central Elementary School. *AIDE Interdisciplinary Research Journal*, 2(1). https://ejournals.ph/article.php?id=18148
- Domínguez, A., de Navarrete, J., de Marcos, L., Fernández-Sanz, L., Pagés, C., & Martínez-Herráiz, J. (2013). Gamifying learning experiences: Practical implications and outcomes. *Computers & Education*, 63, 380–392. https://doi.org/10.1016/j.compedu.2013.01.004
- International Organization for Standardization. (2011). *ISO/IEC 25010: Systems and software engineering — Systems and software quality requirements and evaluation (SQuaRE)*. https://www.iso.org/standard/35733.html
- Internet Engineering Task Force. (2015). *RFC 7519: JSON Web Token (JWT)*. https://datatracker.ietf.org/doc/html/rfc7519
- Republic of the Philippines. (2012). *Republic Act No. 10173: Data Privacy Act of 2012*. Official Gazette of the Republic of the Philippines.
- Rohrbeck, C. A., Ginsburg-Block, M. D., Fantuzzo, J. W., & Miller, T. R. (2003). Peer-assisted learning interventions with elementary school students: A meta-analytic review. *Journal of Educational Psychology*, 95(2), 240–257. https://doi.org/10.1037/0022-0663.95.2.240
- Tan, C. (2020). Peer tutorial: Championing students at risk. *International Journal of Learning, Teaching and Educational Research*, 19(6). http://www.ijlter.org/index.php/ijlter/article/view/2203
- Zhang, C., Sun, N., Jiang, Y., et al. (2025). The impact of peer tutoring programs on students' academic performance in higher education: A meta-analysis. *The Asia-Pacific Education Researcher*, 34, 1495–1506. https://doi.org/10.1007/s40299-024-00960-0
