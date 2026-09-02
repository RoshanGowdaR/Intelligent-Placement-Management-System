# Intelligent Placement Management System — Complete Project Information

A single reference document covering the project idea, the full folder/file structure, the database design, every feature implemented, and how each feature works.

---

## 1. Project Idea

### 1.1 Problem
Campus placement preparation in most institutions is fragmented and manual:

- Student academic records (SGPA/CGPA), resumes and marks cards live in spreadsheets and email threads.
- Company eligibility criteria (CGPA cutoff, branch, backlogs, skills) are checked by hand for every drive.
- Mock aptitude/technical tests are conducted on paper or on generic tools with **no proctoring**, so results are unreliable.
- Students get a score but no actionable feedback on *why* they failed.
- Placement officers have no dashboard, analytics or exportable reports.

### 1.2 Solution
**Intelligent Placement Management System** is a full-stack, role-based placement management platform that unifies the entire cycle:

`Student onboarding → Profile & document verification → Eligibility matching → Proctored online assessment → AI feedback → Analytics & reporting`

Two roles share one application:

| Role | Purpose |
|------|---------|
| **Admin** (placement officer) | Manage companies, author tests, monitor proctoring, analyse performance, export reports |
| **Student** | Build a verified profile, check eligibility, take proctored tests, review AI feedback, track results |

### 1.3 What makes it different
1. **AI-assisted test authoring** — questions generated from a subject/topic prompt or extracted from an uploaded PDF.
2. **Webcam proctoring with on-device ML** — TensorFlow.js COCO-SSD detects phones/tablets/laptops in frame; no video ever leaves the browser.
3. **Per-test tunable proctoring** — admins set confidence thresholds, allowlists, grace periods and second-offense behaviour per test.
4. **Document verification via AI vision** — marks cards are OCR-checked against the student's name and USN, and CGPA is auto-derived from SGPA.
5. **Retake governance** — retakes require a written justification and can draw from a separate admin-authored question bank.

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Design language | 3D monochrome glassmorphism; Space Grotesk (headings) / Plus Jakarta Sans (body) |
| Animation | Framer Motion |
| Routing | React Router v6 |
| Server state | TanStack React Query |
| Forms & validation | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Supabase — PostgreSQL, Auth, Row Level Security, Realtime, Storage, Edge Functions (Deno) |
| AI | Lovable AI Gateway → `google/gemini-2.5-flash` (text + vision) |
| On-device ML | `@tensorflow/tfjs` + `@tensorflow-models/coco-ssd` |
| Email | Resend (transactional) |
| Testing | Vitest + React Testing Library |
| Deployment | Static SPA build (Vercel-compatible), edge functions on Supabase |

---

## 3. Complete Project Structure

```
intelligent-placement-management-system/
├── index.html                       # SPA shell, SEO meta tags
├── package.json                     # deps + scripts (dev/build/test/lint)
├── vite.config.ts                   # dev server on port 8080, @ alias
├── vitest.config.ts                 # jsdom env, setup file
├── tailwind.config.ts               # design tokens, fonts, animations
├── postcss.config.js
├── eslint.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── components.json                  # shadcn/ui config
├── vercel.json                      # SPA rewrite rules
├── .env                             # VITE_SUPABASE_* (public keys only)
│
├── README.md                        # project proposal
├── PROJECT.md                       # architecture summary
├── ProjectInfo.md                   # detailed problem/solution/implementation
├── SETUP.md                         # local development guide
├── TEST.md                          # manual test steps per feature
├── info.md                          # this document
│
├── public/
│   ├── robots.txt
│   └── placeholder.svg
│
├── src/
│   ├── main.tsx                     # React root, providers
│   ├── App.tsx                      # routes, QueryClient, ThemeProvider, Toaster
│   ├── index.css                    # Tailwind layers + semantic design tokens (HSL)
│   ├── App.css
│   ├── vite-env.d.ts
│   │
│   ├── components/
│   │   ├── DashboardLayout.tsx      # sidebar + header shell for both roles
│   │   ├── ProtectedRoute.tsx       # auth + role guard
│   │   ├── NotificationCenter.tsx   # realtime bell dropdown
│   │   ├── EligibilityChecker.tsx   # student ↔ company criteria matcher
│   │   ├── WebcamProctor.tsx        # COCO-SSD gadget detection + warnings
│   │   ├── ThemeProvider.tsx        # dark/light persistence
│   │   ├── ThemeToggle.tsx
│   │   ├── NavLink.tsx
│   │   ├── 3d/
│   │   │   ├── AnimatedBackground.tsx
│   │   │   ├── BentoCard.tsx
│   │   │   ├── GlassCard.tsx
│   │   │   └── Icon3D.tsx
│   │   ├── landing/
│   │   │   ├── LandingNav.tsx
│   │   │   ├── LandingHero.tsx
│   │   │   ├── LandingFeatures.tsx
│   │   │   ├── LandingCTA.tsx
│   │   │   └── LandingFooter.tsx
│   │   └── ui/                      # 50+ shadcn primitives (button, dialog,
│   │                                # table, popover, slider, sidebar, chart…)
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx              # session context, role resolution, sign-in/out
│   │   ├── useAuditLog.ts           # writes admin actions to audit_logs
│   │   ├── useSessionTimeout.ts     # 1h admin idle timeout / tab-scoped student session
│   │   └── use-mobile.tsx / use-toast.ts
│   │
│   ├── lib/
│   │   ├── utils.ts                 # cn() and shared helpers
│   │   └── authRedirects.ts         # OAuth redirect URL resolution
│   │
│   ├── integrations/
│   │   ├── supabase/client.ts       # typed Supabase client (auto-generated)
│   │   ├── supabase/types.ts        # DB types (auto-generated)
│   │   └── lovable/index.ts
│   │
│   ├── pages/
│   │   ├── Index.tsx                # public landing page
│   │   ├── Login.tsx                # email/password + Google OAuth + admin 2FA
│   │   ├── Signup.tsx
│   │   ├── ForgotPassword.tsx       # OTP request
│   │   ├── ResetPassword.tsx        # OTP verify + mandatory password update
│   │   ├── NotFound.tsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx   # KPIs, recent activity
│   │   │   ├── AdminCompanies.tsx   # company CRUD + eligibility criteria
│   │   │   ├── AdminTests.tsx       # test authoring, AI/PDF questions,
│   │   │   │                        # retake bank, proctor settings
│   │   │   ├── AdminStudents.tsx    # roster, profiles, eligibility view
│   │   │   ├── AdminAnalytics.tsx   # Recharts performance dashboards
│   │   │   ├── AdminLeaderboard.tsx # ranked students, top-3 podium
│   │   │   ├── AdminReports.tsx     # filters, sorting, proctor timeline,
│   │   │   │                        # exports, attempt deletion
│   │   │   └── AdminSettings.tsx    # admin invites, 2FA, audit logs
│   │   └── student/
│   │       ├── StudentDashboard.tsx
│   │       ├── StudentProfile.tsx   # identity, skills, resume, marks cards
│   │       ├── StudentTests.tsx     # proctored test runner
│   │       ├── StudentResults.tsx   # scores + AI review/explanations
│   │       ├── StudentSchedule.tsx
│   │       ├── StudentCompanies.tsx
│   │       └── CompanyDetail.tsx
│   │
│   └── test/
│       ├── setup.ts
│       ├── AntiCheat.test.ts
│       ├── EligibilityChecker.test.ts
│       ├── TestScoring.test.ts
│       ├── SessionTimeout.test.ts
│       ├── ProtectedRoute.test.tsx
│       ├── Navigation.test.tsx
│       ├── ThemeToggle.test.tsx
│       ├── Utils.test.ts
│       └── example.test.ts
│
└── supabase/
    ├── config.toml
    ├── migrations/                  # ordered SQL: tables, enums, RLS, policies,
    │                                # functions, triggers, storage buckets
    └── functions/
        ├── generate-questions/        # AI question generation
        ├── extract-questions-pdf/     # PDF → question objects
        ├── generate-feedback/         # AI explanations for wrong answers
        ├── verify-markscard/          # AI vision OCR + name/USN match
        ├── send-email/                # generic Resend sender
        ├── send-test-notification/    # new test scheduled
        ├── send-result-notification/  # result published
        ├── send-company-notification/ # company/eligibility updates
        ├── send-reset-code/           # password reset OTP
        └── verify-reset-code/         # OTP verify + password reset
```

---

## 4. Database Design

### 4.1 Tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `profiles` | Student profile | user_id, full_name, usn, branch, semester, sgpa[], cgpa, skills, resume_url, markscard_urls, verification flags |
| `user_roles` | RBAC (separate table — never on profiles) | user_id, role (`app_role`) |
| `companies` | Drives + eligibility criteria | name, role, package, min_cgpa, allowed_branches, required_skills, max_backlogs, visit_date |
| `tests` | Assessment definitions | title, subject, questions (jsonb), retake_questions (jsonb), duration, pass_percentage, scheduled_at, proctor_config (jsonb) |
| `test_attempts` | Submissions | user_id, test_id, answers, score, passed, auto_submitted, tab_switches, proctor_events (jsonb), retake_reason, attempt_number |
| `schedules` | Test registration | user_id, test_id, status (`schedule_status`) |
| `notifications` | In-app alerts | user_id, title, body, read, type |
| `password_reset_codes` | Email OTP | email, code_hash, expires_at, used |
| `audit_logs` | Admin action trail | actor_id, action, entity, metadata |
| `admin_invites` | Expiring admin invite tokens | email, token, expires_at, accepted |

### 4.2 Enums
- `app_role`: `admin`, `student`
- `schedule_status`: `registered`, `completed`, `missed`

### 4.3 Functions & triggers
- `has_role(_user_id, _role)` — `SECURITY DEFINER` helper used inside RLS policies to avoid recursive checks.
- `handle_new_user()` — on `auth.users` insert, creates a `profiles` row and assigns the `student` role.
- `update_updated_at_column()` — timestamp maintenance trigger.

### 4.4 Security model
- RLS enabled on every public table; explicit `GRANT`s for `authenticated` / `service_role`.
- Students can only read/write their own rows (`auth.uid()` scoped).
- Admin-only policies use `has_role(auth.uid(), 'admin')` — including the delete policy on `test_attempts`.
- Storage buckets `resumes` and `markscards` are **private**, accessed through signed URLs.

---

## 5. Complete Feature List

### 5.1 Authentication & Access Control
1. Email/password signup with email verification.
2. Google (and Apple) sign-in via direct Supabase OAuth calls.
3. **Admin 2FA (TOTP)** enforced on *both* password and Google sign-in paths.
4. Password reset by emailed OTP code (`send-reset-code` → `verify-reset-code`), followed by a mandatory password-update dialog.
5. Role-based routing via `ProtectedRoute` (admin vs student vs public).
6. Session policies: students are tab-lifecycle scoped; admins expire after 1 hour idle (`useSessionTimeout`).
7. Secure, expiring admin invite tokens (`admin_invites`).
8. Audit logging of admin actions (`useAuditLog` → `audit_logs`).

### 5.2 Student Profile & Documents
9. Mandatory profile sequence: identity + skills must be completed before resume/marks card upload.
10. Resume upload to the private `resumes` bucket.
11. Marks card upload to the private `markscards` bucket.
12. **AI vision verification** (`verify-markscard`) — OCR reads the document, matches the printed name and USN against the profile, and extracts SGPA.
13. Auto-computed CGPA as the average of verified SGPA values.
14. Profile completion percentage surfaced on the student dashboard.

### 5.3 Companies & Eligibility
15. Admin CRUD for companies with full criteria (min CGPA, branches, skills, backlogs, package, visit date).
16. `EligibilityChecker` cross-references a student's academics and skills against each company and shows pass/fail per criterion.
17. Student company list + detail pages with a live eligibility verdict.
18. Automated notifications on company additions and eligibility-affecting changes.

### 5.4 Test Authoring (Admin)
19. Create tests with title, subject, duration, pass percentage and schedule.
20. **AI question generation** (`generate-questions`, Gemini 2.5 Flash) by subject/topic/count/type/difficulty.
21. **PDF question extraction** (`extract-questions-pdf`) from an uploaded question paper.
22. Manual question authoring (MCQ and coding types).
23. **Retake bank** — a separate question set authored up front, used only by students retaking the test.
24. Question randomisation per attempt.
25. **Per-test proctor settings**: confidence threshold slider, consecutive-frame requirement, warning grace period, detection interval, second-offense action (warn vs auto-submit), and a **gadget class allowlist** to exclude false-positive-prone classes.

### 5.5 Test Taking (Student)
26. Attempt limit of 2 per test.
27. **Fullscreen lockdown** — the Fullscreen API is engaged on start; exiting counts as a violation.
28. **Shortcut blocking** — Alt+Tab, Ctrl+T/W/N, F-keys, copy/paste and context menu are suppressed during the test.
29. **Tab-switch detection** — one warning, auto-submit on the second violation.
30. **Webcam proctoring** — permission is requested before the test starts; denial blocks entry with clear re-enable instructions and a Retry button.
31. **On-device gadget detection** — COCO-SSD scans the webcam feed on the configured interval for phones, tablets, laptops, TVs, remotes, keyboards, mice and books (minus allowlisted classes). Video never leaves the device.
32. **Two-strike rule** — first detection shows a banner with a 5-second countdown; clearing the gadget resumes the test, while a later detection auto-submits immediately.
33. Every warning and auto-submit is recorded with a timestamp and gadget class into `proctor_events`.
34. **Question sidebar** — full question list with answered/unanswered status, green ticks and direct navigation.
35. Previous/Next buttons placed side by side; webcam preview pinned bottom-left so it never overlaps navigation.
36. Countdown timer with auto-submit at expiry.
37. **Refresh-safe persistence** — current question, answers, timer and green ticks are stored locally per user+test and restored on reload; cleared on submit/exit.
38. **Retake flow** — clicking Retake opens a dialog requiring a written justification (≥10 characters), persisted with the attempt; retakes draw from the retake bank when one exists.

### 5.6 Results & Feedback
39. Automatic scoring against the answer key with pass/fail evaluation.
40. Post-submission review showing each question, the student's answer and the correct answer.
41. **AI explanations** (`generate-feedback`) for incorrect answers plus an improvement plan.
42. Result history across attempts.

### 5.7 Analytics, Leaderboard & Reports (Admin)
43. Dashboard KPIs and recent activity.
44. Recharts analytics: score distributions, pass rates and performance trends.
45. Leaderboard ranking with a top-3 podium, based on scores and pass rates.
46. **Shortlisting score** = Test Score 40% + CGPA 30% + Improvement 30%.
47. **Reports** with filters (test, company, passed/failed, auto-submitted, retake) and sortable columns.
48. **Proctor summary popover** — full event timeline with gadget types and exact timestamps, plus the *effective* `proctor_config` used for that attempt (thresholds, consecutive frames, grace, interval, second-offense action, allowlist with excluded classes struck through).
49. **Mark as false positive** — a "Stop flagging {gadget}" action on any warning event that adds the class to the test's allowlist.
50. Attempt record management — delete a single attempt or all attempts for a test, guarded by confirmation dialogs and an admin-only RLS delete policy.
51. Exports: CSV / Excel / PDF for results, passed students and leaderboards.

### 5.8 Notifications
52. Realtime in-app bell (`NotificationCenter`) backed by Supabase Realtime.
53. Transactional emails via Resend for new tests, published results and company updates.

### 5.9 Platform & UX
54. Dark/light theme with persistence.
55. 3D monochrome glassmorphism design system with semantic HSL tokens (no hardcoded colours).
56. Framer Motion transitions, animated background, bento/glass cards.
57. Fully responsive layouts with a collapsible dashboard sidebar.
58. Public landing page (hero, features, CTA, footer) with SEO meta tags.
59. Timezone handling for Asia/Kolkata (IST) with 12-hour formatting.

---

## 6. How the System Works — End to End

1. **Signup** → `handle_new_user()` creates the profile and assigns the `student` role.
2. **Profile build** → the student enters identity and skills, then uploads a resume and marks cards; `verify-markscard` OCR-verifies the documents and CGPA is derived from SGPA.
3. **Eligibility** → `EligibilityChecker` compares the verified profile against every company's criteria and shows the verdict per drive.
4. **Test creation** → the admin authors a test (AI-generated, PDF-extracted or manual), optionally adds a retake bank, and tunes the proctor config; `send-test-notification` alerts eligible students in-app and by email.
5. **Test taking** → the student grants camera access, the app enters fullscreen, shortcuts are blocked, and COCO-SSD monitors the frame. Violations follow the two-strike rule and are logged to `proctor_events`. State is persisted locally so refreshes are safe.
6. **Submission** → answers are scored, pass/fail is computed, the attempt (with proctor events and retake reason) is written to `test_attempts`, and `send-result-notification` fires.
7. **Feedback** → the student reviews the attempt and reads AI explanations for wrong answers.
8. **Admin review** → Reports filters and sorts attempts, exposes the proctor timeline with the effective config, allows false-positive tuning and record deletion; Analytics and Leaderboard aggregate results and the shortlisting score drives selection.

---

## 7. Edge Functions Reference

| Function | Trigger | Responsibility |
|----------|---------|----------------|
| `generate-questions` | Admin, test authoring | Gemini generates a JSON array of MCQ/coding questions |
| `extract-questions-pdf` | Admin, PDF upload | Parses a question paper into structured questions |
| `generate-feedback` | Student, result review | Explains wrong answers and suggests an improvement plan |
| `verify-markscard` | Student, document upload | AI vision OCR; matches name/USN, extracts SGPA |
| `send-email` | Internal | Generic Resend sender used by the notification functions |
| `send-test-notification` | Test scheduled | In-app + email alert to eligible students |
| `send-result-notification` | Result published | In-app + email score alert |
| `send-company-notification` | Company added/updated | In-app + email drive alert |
| `send-reset-code` | Forgot password | Generates and emails an OTP |
| `verify-reset-code` | Reset password | Validates the OTP and resets the password |

### Edge function secrets
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `LOVABLE_API_KEY`.

---

## 8. Testing

| File | Covers |
|------|--------|
| `AntiCheat.test.ts` | Tab-switch counting, violation thresholds, auto-submit rules |
| `TestScoring.test.ts` | Score computation, pass/fail boundaries |
| `EligibilityChecker.test.ts` | CGPA/branch/skill/backlog matching |
| `SessionTimeout.test.ts` | Idle expiry and role-based session policy |
| `ProtectedRoute.test.tsx` | Auth and role guard redirects |
| `Navigation.test.tsx` | Route rendering per role |
| `ThemeToggle.test.tsx` | Theme switch and persistence |
| `Utils.test.ts` | `cn()` and shared helpers |

Commands: `npm test`, `npm run test:watch`, `npm run lint`, `npm run build`.
Manual, step-by-step verification for every feature lives in `TEST.md`.

---

## 9. Future Enhancements

- Placement application tracker (applied → shortlisted → interviewed → selected/rejected).
- Bulk resume ZIP download for admins.
- Full video/audio recording proctoring with post-hoc review.
- Face-presence and multiple-person detection alongside gadget detection.
- Coding tests with a sandboxed code runner and hidden test cases.
- Interview scheduling with calendar sync.
- Native mobile application for students.
- Institution-level benchmarking and year-over-year placement analytics.
