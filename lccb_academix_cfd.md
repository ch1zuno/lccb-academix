# Context Flow Diagram (CFD) — LCCB Academix
**La Consolacion College Bacolod — Faculty-Guided Peer Tutoring & Incentive Ledger System**

![LCCB Academix CFD](C:\Users\ASUS\.gemini\antigravity-ide\brain\723c7715-70e9-4a1f-90a1-da0931058c1e\lccb_academix_cfd.svg)

---

## External Entities & Data Flows

| # | External Entity | Data Flow **To** System (→) | Data Flow **From** System (←) |
|---|---|---|---|
| 1 | **SUPERADMIN** *(Dean / Dept. Head)* | Manage users, roles, all modules | Reports, full dashboard |
| 2 | **FACULTY** *(Advisor / Instructor)* | Submit referral, monitor student progress | Referral status, analytics & alerts |
| 3 | **ACCREDITED TUTOR** *(Verified Student Tutor)* | Apply, pass exam, check-in & log sessions | Points credited, session details & rewards |
| 4 | **LEARNER** *(Referred Student)* | Browse tutors, book & check-in session | Confirmation, progress & session record |
| 5 | **BIOMETRIC** *(Fingerprint / QR Device)* | Fingerprint / QR check-in event | CSV session roster |

> [!NOTE]
> **Solid arrows (→)** represent data flowing **into** the system from an external entity.  
> **Dashed arrows (←)** represent data flowing **out** of the system back to an external entity.

---

## Role-to-Screen Mapping (from codebase)

| Role | Screens |
|---|---|
| Superadmin | Overview Dashboard, Tutor Approvals |
| Faculty | Referrals Board, New Referral |
| Accredited Tutor | My Wallet & Sessions, Qualification Exam, Session Check-In, Rewards Catalog |
| Learner (Student) | Find a Tutor (Wizard), My Progress, Session Check-In |
