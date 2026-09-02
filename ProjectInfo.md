# Intelligent Placement Management System — Detailed Project Information

## 1. Problem Statement

Campus placement management in most educational institutions is a highly fragmented, semi-manual process. Placement officers rely on a patchwork of spreadsheets, WhatsApp groups, email threads, PDF marks cards, printed resumes, and third-party proctoring tools that do not talk to each other. This causes a wide range of real, day-to-day problems:

1. **Eligibility screening is manual and error-prone.**
   Every visiting company has its own eligibility rules — a minimum CGPA, an allowed set of branches, a maximum number of backlogs, mandatory skills, a cut-off semester, and sometimes even a rule about not having been placed already. Faculty coordinators cross-check hundreds of student profiles by hand against these rules for every drive. Mistakes are common: eligible students get missed, ineligible ones get added, and appeals eat up hours.

2. **Communication with students is unreliable.**
   Notifications about upcoming drives, eligibility status, test schedules, venue changes, and result announcements are broadcast over email or messaging apps. Students miss messages, forward wrong information, and constantly ask coordinators for the same details. There is no single source of truth.

3. **Assessment integrity is weak.**
   Institutions either conduct paper-based tests (which are hard to grade at scale and easy to leak) or use lightly proctored online forms where students can tab out, look up answers, use a second device, or have someone else operate their machine. There is no automated audit trail.

4. **Administrative overhead is enormous.**
   Result compilation, rank list generation, offer-letter tracking, retake handling, exception approvals, and report exports for management all consume disproportionate amounts of faculty time. Placement analytics — which branch performs best, which company shortlists what profile, which drive had unusual failure rates — is either absent or produced painfully after the fact.

5. **Data is scattered and not auditable.**
   Historical placement records live in different files, folders, and personal drives. There is no consistent audit log, no role-based access, no way to prove who changed what, and no way to run longitudinal analysis across batches.

6. **Retake and second-chance policies are inconsistent.**
   Institutions frequently allow retakes on compassionate grounds, but there is no controlled way to run them — the same paper is reused, the reason is undocumented, and it is easy to abuse.

7. **False positives in proctoring frustrate honest students.**
   Off-the-shelf proctoring products are opaque black boxes. When they wrongly flag a student — say, because a stray book was on the desk — there is no way for the admin to see the timeline, verify the evidence, or tune the system for the next test.

The net effect is that a process which should be transparent, fair, and data-driven feels stressful and arbitrary — for students, for placement officers, and for the institution's leadership.

---

## 2. Solution We Provide

**Intelligent Placement Management System** is a full-stack, single-tenant web platform that replaces the entire manual pipeline with one coherent, role-based system. It is designed around three principles:

- **One source of truth** — every piece of data (student, company, test, attempt, result, notification, audit event) lives in one database with row-level security.
- **Automation where it counts** — eligibility, notifications, proctoring, question generation, marks-card verification, and reporting are all automated, so humans only handle exceptions.
- **Transparency and control for the admin** — every automated decision is visible, tunable, and reversible. Nothing is a black box.

The platform delivers this through two distinct experiences:

- A **Student Portal** that shows the student their profile, eligibility for every visiting company, upcoming and past tests, results with AI-generated feedback, and a live notification centre.
- An **Admin Portal** that lets placement officers create companies, build tests (manually, from a PDF, or with AI), schedule them, monitor live attempts, review proctoring evidence, tune detection sensitivity per test, export detailed reports, and audit every action.

Both portals share the same design system, authentication layer, and real-time backend, so data updates propagate instantly and consistently.

---

## 3. How the Solution Works — Step by Step

This section walks through the full lifecycle of a placement drive on the Intelligent Placement Management System, from onboarding to offer tracking, and explains what happens at each step.

### Step 1 — Admin Onboarding and Secure Access

1. An initial admin is provisioned. All subsequent admins are added via **token-based invitations**: the primary admin generates an invite (stored in `admin_invites` with an expiry), sends the link to the new admin, and the new admin activates the role on first login.
2. Admin sign-in requires **email/password or Google OAuth**, followed by **mandatory TOTP-based Two-Factor Authentication**. The TOTP secret is stored per-user and enforced on every sign-in, including after OAuth. This is a hard requirement — admins cannot opt out — because admin accounts can modify tests, delete attempts, and export personal data.
3. Every administrative action (creating a test, deleting an attempt, marking a false positive, exporting a CSV, resetting a password) is written to the `audit_logs` table with the actor, target, timestamp, and payload. This gives the institution a full forensic trail.

### Step 2 — Student Onboarding

1. A student signs up with email/password or Google. Email verification is mandatory.
2. On first login, the student is guided through a **strictly ordered profile completion flow**: identity and skills first, then resume upload, then marks-card upload. This ordering is enforced in the UI and in the backend — a student cannot skip ahead. It exists because eligibility computation depends on the earlier fields, and because marks-card verification uses the identity fields for name/USN matching.
3. Marks cards are uploaded to a **private storage bucket** and passed to the `verify-markscard` edge function, which performs AI-based OCR, extracts SGPA per semester, cross-checks name/USN against the profile, and computes the aggregate CGPA. If the AI detects tampering or a name mismatch, the upload is rejected.
4. The resulting profile — USN, branch, semester, SGPA history, CGPA, skills, resume URL — becomes the input for every downstream eligibility check.

### Step 3 — Company Setup by the Admin

1. The admin creates a `companies` record with the visiting company's job details and, most importantly, its **eligibility criteria**: minimum CGPA, allowed branches, maximum backlogs, required skills, allowed semesters, and any custom rules.
2. Once saved, the platform runs the eligibility rules against every student profile. The result is not stored as a snapshot — it is recomputed live so that if a student updates their profile or uploads a new semester's marks, their eligibility status updates immediately.
3. The `send-company-notification` edge function fires: eligible students get an in-app notification (via the Realtime engine) *and* an email (via Resend) telling them the company is visiting and that they are eligible.

### Step 4 — Test Creation

The admin builds a test with fine-grained control:

1. **Questions** can be added in three ways:
   - **Manually** in the UI, one at a time, with options and correct-answer flags.
   - **AI-generated** via the `generate-questions` edge function, which prompts a Lovable AI model with the subject, difficulty, and count.
   - **PDF-extracted** via `extract-questions-pdf`, which parses an uploaded PDF and turns it into structured MCQ objects.
2. **Retake question pool** — a *separate* set of questions can be authored at test creation time, specifically for students who retake the test. When a student launches a retake, the system draws from this pool (and randomises) instead of the original set. This means the retake genuinely tests the student again, rather than letting them re-attempt the same paper.
3. **Anti-cheat and proctoring config** — the admin sets:
   - Warning delay in seconds (grace period after a gadget is detected).
   - Second-offense action (`warn` or `submit`).
   - Detection interval in milliseconds (how often the webcam frames are scanned).
   - Confidence threshold (0.3–0.9) for gadget detection.
   - Consecutive-frames requirement (1–5) — the gadget must appear in this many frames in a row before it counts.
   - A per-test allowlist of gadget classes (`cell phone`, `laptop`, `tv`, `remote`, `keyboard`, `mouse`, `tablet`, `book`) — unchecked classes will not trigger warnings for this test.
4. **Schedule** — start date, duration, cut-off, and pass mark are set. The test appears on eligible students' dashboards and the `send-test-notification` function alerts them.

### Step 5 — The Student Takes the Test

This is the most security-sensitive part of the platform. The following happen in order:

1. **Eligibility recheck** — before the student can start, the system revalidates their eligibility.
2. **Retake gate** — if this is attempt #2, a modal forces the student to enter a written reason. The reason is stored in `test_attempts.retake_reason` and shown to the admin later.
3. **Fullscreen lockdown** — the browser is forced into fullscreen. Exit is monitored via the Fullscreen API.
4. **Anti-cheat engine activates** — right-click, copy, paste, and common developer/keyboard shortcuts are blocked. Tab-switch and visibility-change events are counted. The **second** violation triggers automatic submission.
5. **Webcam proctor activates** — `WebcamProctor.tsx` acquires the camera stream, loads TensorFlow.js and the COCO-SSD object detection model in-browser (no video is sent to any server — the model runs locally on the student's device for privacy). Every `detection_interval_ms`, a frame is sampled. If the model detects one of the allowlisted classes with a score above `confidence_threshold` for `consecutive_frames` frames in a row:
   - **First offense** — a red on-screen warning appears with a live countdown for `warning_delay_seconds`. If the gadget disappears in time, the warning clears. If not, the test auto-submits.
   - **Second offense** — depending on `second_offense_action`, the test either auto-submits immediately or issues another warning. Every event is appended to `test_attempts.proctor_events` with timestamp, gadget class, and action.
6. **Question navigation** — a persistent side navbar shows every question with a green tick for answered ones. The student can jump to any question. All answered/left state is persisted to `localStorage` scoped to the attempt, so a refresh, disconnect, or accidental reload does not lose progress. Previous/Next buttons live side-by-side at the bottom, cleanly separated from the floating webcam preview.
7. **Randomisation** — the question order (and, on retakes, the pool itself) is shuffled per attempt using a seeded shuffle, so no two students see the same order.
8. **Submission** — on manual submit, auto-submit, timer expiry, or proctor auto-submit, the attempt is scored server-side and written to `test_attempts` with `auto_submitted`, `passed`, `total_score`, `attempt_number`, `completed_at`, and `proctor_events`.

### Step 6 — Results and AI Feedback

1. Immediately after submission, `send-result-notification` fires the student an in-app + email alert.
2. When the student opens their result, the platform calls `generate-feedback`, which uses a Lovable AI model to analyse the mistakes and produce a **personalised improvement plan** — which topics to revise, which concepts were misunderstood, and which resources to consult. This turns each test into a learning event, not just a gate.
3. The student can review every question with the correct answer and an AI-generated explanation of their specific mistake.

### Step 7 — Admin Review and Reports

1. The `AdminReports` page lets the admin pick a test and generate the full attempt report. It supports **filters** (company, test, passed/failed, auto-submitted, retake) and **sortable columns** (name, CGPA, score, attempt number, completion time).
2. Each row has a **Proctor Summary** popover showing:
   - The full **event timeline** — every warning and auto-submit event with its exact timestamp and gadget class.
   - The **effective proctor configuration used for that specific attempt** — the confidence threshold, consecutive-frames requirement, warning grace, scan interval, second-offense action, and the per-test allowlist with excluded classes visibly struck through. This is critical for auditability: if a student disputes an auto-submit, the admin can see exactly which settings governed the decision.
   - A **"Mark as false positive"** action on each warning event. Clicking it removes that gadget class from the test's `watched_classes` allowlist, so the same false positive cannot happen again in that test. The change is persisted to `proctor_config` and logged.
3. The admin can **delete individual attempts** or **all attempts for a test** — useful for pre-launch dry runs — and download the filtered report as **CSV** (name, email, CGPA, score, status, attempt, completion time, auto-submitted flag, warning count, gadget list, retake reason, resume URL).
4. The `AdminAnalytics` dashboard turns this raw data into **Recharts visualisations**: score distributions, pass/fail ratios per company, branch-wise performance, retake outcomes, and week-over-week trend lines.
5. The `AdminLeaderboard` computes rankings using a weighted **shortlisting formula**: Test Score (40%) + CGPA (30%) + Improvement over previous attempts (30%). The top three are shown on a podium.

### Step 8 — Notifications, Sessions, and Recovery

1. Every user-facing event (test scheduled, result released, company added, admin invite, password reset) fires an in-app notification (Realtime channel + `notifications` table) and, where appropriate, an email (Resend via `send-email`).
2. **Session policies differ by role**: students have a **tab-lifecycle session** (closing the tab ends the session) to reduce shared-device risk; admins have a **1-hour inactivity timeout** with a countdown warning, implemented in `useSessionTimeout`.
3. **Password reset** is a two-step OTP flow: `send-reset-code` emails a code, `verify-reset-code` validates it, and the recovery link forces an immediate mandatory password update dialog before any other action.

---

## 4. Features We Provide, How They Are Implemented, and Which Technologies Are Used

Below is a feature-by-feature breakdown. Every entry explains **what it does**, **how it is implemented in the codebase**, and **which technology stack piece powers it**.

### 4.1 Authentication and Authorisation

- **What it does.** Handles sign-up, sign-in, Google OAuth, mandatory admin 2FA, password reset, role-based access, and session lifecycle.
- **How it is implemented.**
  - `useAuth.tsx` exposes the current user and role via React Context.
  - `ProtectedRoute.tsx` guards routes and redirects based on role.
  - Roles are stored in a **separate `user_roles` table** (never on `profiles`) with a Postgres enum `app_role` and a `SECURITY DEFINER` function `has_role(_user_id, _role)` used inside RLS policies to avoid recursive checks and privilege escalation.
  - Google OAuth uses direct Supabase OAuth calls with a same-origin `redirect_uri` (`${window.location.origin}/auth/callback`) so that protected routes stay behind the session hydration.
  - TOTP 2FA is enforced client-side on the admin login screen and validated server-side before the admin session is considered fully authenticated.
  - Password reset is OTP-based via the `password_reset_codes` table plus `send-reset-code` / `verify-reset-code` edge functions.
- **Tech used.** Supabase Auth, Postgres RLS + security-definer functions, React Router v6, React Context, Resend (for OTP emails), TOTP library.

### 4.2 Student Profile and Marks Card Verification

- **What it does.** Collects student academic data in a strict order and verifies uploaded marks cards.
- **How it is implemented.**
  - `StudentProfile.tsx` renders the ordered flow (identity/skills → resume → marks card).
  - Files upload to **private Supabase Storage buckets** for resumes and marks cards.
  - `verify-markscard` edge function runs AI vision OCR, extracts SGPA per semester, matches name and USN against the profile, computes CGPA (weighted mean of SGPAs), and either accepts the upload or returns a rejection reason.
- **Tech used.** Supabase Storage, Supabase Edge Functions (Deno), Lovable AI (vision model), React Hook Form + Zod for validation.

### 4.3 Eligibility Engine

- **What it does.** Computes, in real time, which students are eligible for which company.
- **How it is implemented.**
  - `EligibilityChecker.tsx` encodes the rule set (CGPA ≥ min, branch ∈ allowed, backlogs ≤ max, required skills ⊆ student skills, semester rule, custom rules).
  - Live recomputation happens on the client using the fetched profile and company records — no cached "eligible" flag is stored, so profile edits reflect instantly.
  - Unit tests in `EligibilityChecker.test.ts` cover CGPA matching, branch filtering, and skills validation.
- **Tech used.** TypeScript, TanStack React Query for cached fetches, Vitest + React Testing Library.

### 4.4 Test Creation (Manual, AI, and PDF)

- **What it does.** Lets admins author tests three ways and set proctoring parameters.
- **How it is implemented.**
  - `AdminTests.tsx` hosts the create/edit form.
  - `generate-questions` edge function calls a Lovable AI model with prompt engineering to produce MCQs with correct-answer flags.
  - `extract-questions-pdf` uses a PDF parser to structure questions from an uploaded document.
  - A distinct **retake question pool** is stored alongside the main pool in the `tests` row so retakes draw from a different set.
  - Proctor sliders (confidence, consecutive frames), warning delay, scan interval, second-offense action, and the gadget allowlist checkboxes all persist into `tests.proctor_config` (JSONB).
- **Tech used.** Lovable AI Gateway, Deno edge functions, shadcn/ui (Slider, Checkbox, Select), Zod for form validation.

### 4.5 Fullscreen Lockdown and Anti-Cheat Engine

- **What it does.** Prevents casual cheating during a test.
- **How it is implemented.**
  - The Fullscreen API is requested on test start; exits are counted.
  - Keyboard shortcuts (Ctrl+C/V/X/T/N, F12, right-click, selection) are intercepted with capture-phase listeners.
  - `visibilitychange` and `blur` events count as tab switches.
  - **Second violation triggers auto-submit**, matching the design memory.
  - Covered by `AntiCheat.test.ts`.
- **Tech used.** Web APIs (Fullscreen, Visibility, KeyboardEvent), React refs, Vitest.

### 4.6 AI-Based Webcam Proctoring

- **What it does.** Detects digital gadgets on camera during a test and enforces a graduated response.
- **How it is implemented.**
  - `WebcamProctor.tsx` acquires the camera via `getUserMedia`.
  - Loads **TensorFlow.js** and the **COCO-SSD** model **in the browser**, so no video ever leaves the student's device (privacy-preserving).
  - Every `detection_interval_ms`, a frame is scanned. Predictions above `confidence_threshold` whose class is in the per-test `watched_classes` allowlist count as a hit.
  - A `consecutiveHitsRef` counter requires the gadget to persist for `consecutive_frames` frames in a row before a warning fires — this is the primary false-positive dampener.
  - First hit → red on-screen alert + countdown. If cleared in time, warning resets. If not, `onAutoSubmit` fires and a `warning` + `auto_submit` event pair is written to `test_attempts.proctor_events`.
  - Second hit → depending on `second_offense_action`, either auto-submits immediately or warns again.
  - A floating webcam preview stays bottom-left so it does not obscure the Next/Previous buttons.
- **Tech used.** TensorFlow.js, `@tensorflow-models/coco-ssd`, MediaDevices API, React refs and effects, shadcn/ui Alert.

### 4.7 Question Navigation Sidebar with Progress Ticks

- **What it does.** Lets students jump to any question and shows a green tick on answered ones. Persists across refresh.
- **How it is implemented.** In `StudentTests.tsx`, a side navbar renders the question grid. Answered indices are stored in local component state and mirrored to `localStorage` keyed by attempt ID. On mount, the state hydrates from `localStorage`, so a refresh preserves both the current question index and the tick pattern.
- **Tech used.** React state, `localStorage`, shadcn/ui.

### 4.8 Retake Flow with Reason Capture and Randomised Retake Pool

- **What it does.** Enforces a maximum of two attempts, requires a written reason for the second, and serves a distinct randomised question set.
- **How it is implemented.**
  - Attempt count is enforced by RLS + a check in `StudentTests.tsx`.
  - The retake modal captures a mandatory reason string and writes it to `test_attempts.retake_reason`.
  - When the attempt starts, the client picks from the retake question pool authored by the admin and shuffles the order per attempt.
- **Tech used.** Postgres RLS, React modal (shadcn/ui Dialog), Fisher–Yates shuffle.

### 4.9 Notifications (In-App + Email)

- **What it does.** Alerts students on test schedules, results, company visits, and password events.
- **How it is implemented.**
  - `NotificationCenter.tsx` subscribes to a **Supabase Realtime** channel scoped to the current user's `notifications` rows.
  - Edge functions (`send-test-notification`, `send-result-notification`, `send-company-notification`) insert into `notifications` and dispatch email via `send-email` (Resend).
- **Tech used.** Supabase Realtime, Resend, Deno edge functions.

### 4.10 Reports with Filters, Sorting, Timeline, and Effective-Config Panel

- **What it does.** The admin's forensic view of every attempt.
- **How it is implemented.**
  - `AdminReports.tsx` fetches attempts, joins profiles and tests, and renders a filtered/sorted table.
  - Filters: company, test, passed/failed, auto-submitted, retake. Sorting on name, CGPA, score, attempt, completion time.
  - The **Proctor Summary popover** shows:
    - The full **event timeline** (warnings + auto-submit with timestamps and gadget classes).
    - The **effective `proctor_config`** used for that attempt — confidence threshold, consecutive frames, warning grace, scan interval, second-offense action, and the allowlist with excluded classes struck through.
    - A **"Mark as false positive"** action on each warning event that removes the gadget class from `watched_classes` for that test.
  - CSV export honours the active filter set.
  - Individual and bulk deletion supported.
- **Tech used.** React Query, shadcn/ui (Table, Popover, AlertDialog, Select, Badge), `date-fns`, Blob API for CSV download.

### 4.11 Analytics Dashboard

- **What it does.** Turns placement data into visual insight for leadership.
- **How it is implemented.** `AdminAnalytics.tsx` uses **Recharts** to render score distributions, pass/fail ratios per company, branch-wise performance, retake outcome comparisons, and trend lines. Data is aggregated client-side after a filtered fetch.
- **Tech used.** Recharts, React Query.

### 4.12 Leaderboard and Shortlisting Formula

- **What it does.** Ranks students using a policy the institution has agreed on.
- **How it is implemented.** The **shortlisting formula** — Test Score (40%) + CGPA (30%) + Improvement (30%) — is computed in `AdminLeaderboard.tsx`. The top three appear on a podium; the rest render as a ranked list.
- **Tech used.** TypeScript, Recharts (for optional secondary charts), Framer Motion for podium reveal.

### 4.13 Audit Logging and Admin Security

- **What it does.** Records every admin action for accountability.
- **How it is implemented.** `useAuditLog.ts` wraps mutating admin operations and writes to `audit_logs` with actor, target, action, and payload. The audit log viewer lives in `AdminSettings.tsx`. TOTP-based 2FA is mandatory and enforced even after OAuth sign-in. Password resets for admins are dual-factor (email OTP + existing 2FA).
- **Tech used.** Postgres, RLS, TOTP.

### 4.14 Session Management

- **What it does.** Applies different session policies per role.
- **How it is implemented.** Students use a **tab-lifecycle session**; closing the tab logs them out. Admins use a **1-hour inactivity timeout** with a countdown modal, implemented in `useSessionTimeout.ts`. State is recovered on refresh where safe.
- **Tech used.** React hooks, `visibilitychange` / activity listeners.

### 4.15 Design System and UI

- **What it does.** Delivers a consistent, modern, dark-first UI.
- **How it is implemented.** The visual language is **3D monochrome glassmorphism** with **Space Grotesk** headings and **Plus Jakarta Sans** body. Custom 3D components (`Icon3D`, `BentoCard`, `GlassCard`, `AnimatedBackground`) live in `src/components/3d/`. All colours, shadows, and gradients are **semantic tokens defined in `index.css`** and consumed via shadcn/ui variants — no hardcoded colour utilities in components, which keeps dark mode consistent. Framer Motion powers hero, feature, and podium animations.
- **Tech used.** Tailwind CSS v3, shadcn/ui, Framer Motion, custom CSS variables.

### 4.16 Testing Infrastructure

- **What it does.** Locks down critical business logic against regressions.
- **How it is implemented.** Vitest + React Testing Library, with suites for anti-cheat (`AntiCheat.test.ts`), test scoring (`TestScoring.test.ts`), eligibility (`EligibilityChecker.test.ts`), route protection (`ProtectedRoute.test.tsx`), theme toggling (`ThemeToggle.test.tsx`), session timeout (`SessionTimeout.test.ts`), navigation (`Navigation.test.tsx`), and utilities (`Utils.test.ts`). Manual steps live in `TEST.md`.
- **Tech used.** Vitest, React Testing Library, JSDOM.

### 4.17 Deployment

- **What it does.** Ships the app to production.
- **How it is implemented.** Vercel hosts the SPA with rewrites for client-side routing (`vercel.json`). Supabase hosts the database, auth, storage, edge functions, and realtime engine. OAuth redirect flows are configured to route via a same-origin callback so that protected routes only mount after the session is hydrated.
- **Tech used.** Vercel, Supabase, Vite build output.

---

## 5. Complete Technology Stack Reference

| Layer | Technology | Where It Is Used |
|---|---|---|
| Language | TypeScript 5 | Entire frontend and edge functions |
| Frontend framework | React 18 | All UI |
| Build tool | Vite 5 | Dev + production build |
| Styling | Tailwind CSS v3 | All components |
| Component library | shadcn/ui | Buttons, Tables, Dialogs, Selects, Popovers, Sliders, Checkboxes, Badges, Alerts |
| Animations | Framer Motion | Landing page, podium, transitions |
| Routing | React Router v6 | Route table, protected routes |
| State / data | TanStack React Query + React Context | Server state and auth state |
| Forms | React Hook Form + Zod | All admin and student forms |
| Charts | Recharts | Analytics and leaderboard |
| Backend database | Postgres (Supabase) | All persistent data |
| Backend auth | Supabase Auth | Email/password, Google OAuth, TOTP |
| Backend storage | Supabase Storage | Resumes, marks cards (private buckets) |
| Backend realtime | Supabase Realtime | In-app notifications |
| Backend functions | Deno-based Supabase Edge Functions | AI, email, OCR, PDF, notifications |
| AI | Lovable AI Gateway (chat + vision) | Question generation, feedback, marks-card verification |
| ML in browser | TensorFlow.js + COCO-SSD | Webcam gadget detection (runs on student device) |
| Email | Resend | Transactional emails |
| Testing | Vitest + React Testing Library | Unit and integration tests |
| Hosting | Vercel (frontend) + Supabase (backend) | Production deployment |

---

## 6. Database Schema Reference

| Table | Purpose |
|---|---|
| `profiles` | Student academic and personal data (USN, branch, CGPA, SGPA history, skills, resume URL) |
| `user_roles` | Role assignments (`admin`, `student`) — separate from profiles to prevent privilege escalation |
| `companies` | Visiting companies with eligibility criteria and job details |
| `tests` | Test definitions including main pool, retake pool, and `proctor_config` (JSONB) |
| `test_attempts` | Every attempt: score, `passed`, `attempt_number`, `auto_submitted`, `proctor_events`, `retake_reason`, `completed_at` |
| `schedules` | Student-test registration and status |
| `notifications` | In-app notifications with realtime subscriptions |
| `password_reset_codes` | OTPs for password recovery |
| `admin_invites` | Token-based admin invitations with expiry |
| `audit_logs` | Full trail of admin actions |

All tables have **RLS enabled**, per-role **GRANTs** in the same migration, and policies that route access through the `has_role` security-definer function.

---

## 7. Summary

The Intelligent Placement Management System takes a process that most institutions still run on spreadsheets and inbox threads and turns it into a single auditable platform. Students get transparency and personalised feedback. Admins get automation, tunable proctoring, and forensic-grade reports where every automated decision — including which proctor configuration governed each attempt — is visible and reversible. The stack (React 18, TypeScript, Tailwind, shadcn/ui, Supabase, Lovable AI, TensorFlow.js, Recharts, Framer Motion, Vitest, Vercel) is chosen so that the platform is fast to iterate on, safe by default, and honest about how its automated decisions are made.
