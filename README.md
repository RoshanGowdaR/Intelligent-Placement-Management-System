# Intelligent Placement Management System — Project Proposal

## 1. Introduction

**Intelligent Placement Management System** is a comprehensive, full-stack campus placement management platform engineered for educational institutions. It digitises and streamlines the end-to-end placement lifecycle — from company onboarding and eligibility verification to assessment administration, result analysis, and offer tracking — through a single unified portal accessible to administrators and students alike.

---

## 2. Problem Statement

Campus placement processes in most institutions are managed through spreadsheets, emails, and manual coordination. This leads to:

- **Inefficient eligibility screening** — manual cross-referencing of student profiles against company criteria.
- **Lack of transparency** — students remain uninformed about upcoming drives, eligibility status, and results.
- **Assessment integrity risks** — paper-based or loosely proctored online tests are vulnerable to malpractice.
- **Administrative overhead** — repetitive tasks such as notifications, report generation, and data collation consume significant faculty time.
- **No centralised data** — placement records are scattered, making analytics and auditing difficult.

---

## 3. Proposed Solution

The Intelligent Placement Management System addresses these challenges through a role-based web application with the following pillars:

| Pillar | Description |
|--------|-------------|
| **Centralised Management** | Single platform for companies, tests, students, and results |
| **Automated Eligibility** | Real-time matching of student profiles against company criteria |
| **Secure Assessments** | Fullscreen-locked, proctored online tests with anti-cheat mechanisms |
| **AI-Powered Insights** | Automated question generation, feedback, and marks card verification |
| **Real-Time Communication** | In-app and email notifications for every placement event |

---

## 4. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS v3, shadcn/ui component library |
| Backend | PostgreSQL, Authentication, Edge Functions, Realtime, Storage (Cloud-hosted) |
| State Management | TanStack React Query, React Context API |
| Routing | React Router v6 |
| Charts & Visualisation | Recharts |
| Forms & Validation | React Hook Form + Zod |
| Animation | Framer Motion |
| Testing | Vitest + React Testing Library |

---

## 5. System Architecture

```
┌──────────────────────────────────────────────────┐
│                   Frontend (SPA)                 │
│  React 18 · TypeScript · Tailwind · shadcn/ui    │
└────────────────────┬─────────────────────────────┘
                     │ HTTPS / REST / Realtime
┌────────────────────▼─────────────────────────────┐
│                  Backend Cloud                    │
│  ┌────────────┐ ┌──────────┐ ┌───────────────┐   │
│  │  Auth       │ │ Database │ │ Edge Functions│   │
│  │  (OAuth,    │ │ (Postgres│ │ (AI, Email,   │   │
│  │   2FA,      │ │  + RLS)  │ │  OCR, PDF)    │   │
│  │   OTP)      │ │          │ │               │   │
│  └────────────┘ └──────────┘ └───────────────┘   │
│  ┌──────────────────┐ ┌─────────────────────┐     │
│  │  Realtime Engine  │ │  Storage Buckets    │     │
│  │  (Notifications)  │ │  (Resumes, Marks)   │     │
│  └──────────────────┘ └─────────────────────┘     │
└──────────────────────────────────────────────────┘
```

---

## 6. Core Features

### 6.1 Authentication & Security

| Feature | Description |
|---------|-------------|
| Email/Password Authentication | Signup with mandatory email verification |
| Google OAuth | One-click sign-in via Google |
| Admin Two-Factor Authentication | TOTP-based 2FA enforced for all admin accounts, including after OAuth |
| Password Reset | Secure OTP-based reset flow via email |
| Role-Based Access Control | Separate admin and student dashboards with route-level protection |
| Session Timeout | Automatic logout after configurable inactivity period |
| Audit Logging | Comprehensive trail of all admin actions |
| Row-Level Security | Database-enforced access policies on every table |

### 6.2 Student Module

| Feature | Description |
|---------|-------------|
| Profile Management | USN, branch, CGPA, semester, SGPA history, skills |
| Resume Upload | Secure file upload to private storage |
| Marks Card Upload & OCR | Upload semester marks cards with AI-powered verification |
| Eligibility Checker | Automatic matching against company criteria (CGPA, branch, backlogs, skills) |
| Test Taking | Timed assessments with randomised question selection |
| Fullscreen Lockdown | Tests enforce fullscreen mode; exit attempts are tracked and penalised |
| Anti-Cheat System | Tab-switch detection, keyboard shortcut blocking, right-click/copy disabled, auto-submit on violations |
| Results & AI Feedback | Detailed score breakdown with AI-generated personalised improvement plans |
| Company Directory | Browse visiting companies with eligibility status indicators |
| Real-Time Notifications | In-app bell alerts and email notifications for tests, results, and company updates |

### 6.3 Admin Module

| Feature | Description |
|---------|-------------|
| Dashboard | Overview statistics, recent activity feed |
| Company Management | Full CRUD with eligibility criteria, job details, selection process |
| Test Management | Create tests with manual, AI-generated, or PDF-extracted questions |
| AI Question Generation | Automated question creation using integrated AI models |
| PDF Question Extraction | Parse questions from uploaded PDF documents |
| Student Management | Search, filter, and view all student profiles and eligibility |
| Analytics Dashboard | Placement performance charts and trend visualisation |
| Leaderboard | Ranked student performance across assessments |
| Reports | Exportable placement data and statistics |
| Admin Invitation System | Secure token-based invitations with expiry |
| Notification Dispatch | Automated email and in-app alerts to students on key events |
| Settings & Configuration | System preferences, audit log viewer |

### 6.4 User Interface

| Feature | Description |
|---------|-------------|
| Dark / Light Theme | System-wide toggle with persistent preference |
| Responsive Design | Mobile-first layout adapting to all screen sizes |
| Animated Landing Page | Framer Motion powered hero and feature sections |
| Bento Grid Dashboard | Modern card-based layout with 3D icon accents |

---

## 7. Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | Student academic and personal data |
| `user_roles` | Role-based access control mapping |
| `companies` | Company details with eligibility criteria |
| `tests` | Assessment definitions and question banks |
| `test_attempts` | Student submissions, scores, anti-cheat data |
| `schedules` | Student-test registration and status tracking |
| `notifications` | In-app notification records |
| `password_reset_codes` | OTP codes for password recovery |
| `audit_logs` | Admin action audit trail |
| `admin_invites` | Secure admin invitation tokens |

---

## 8. Edge Functions (Serverless Backend)

| Function | Purpose |
|----------|---------|
| `generate-questions` | AI-powered test question generation |
| `extract-questions-pdf` | PDF document question parsing |
| `generate-feedback` | AI-generated personalised test feedback |
| `verify-markscard` | OCR-based marks card verification |
| `send-email` | Transactional email delivery |
| `send-test-notification` | New test alerts (in-app + email) |
| `send-result-notification` | Test result alerts (in-app + email) |
| `send-company-notification` | Company update alerts (in-app + email) |
| `send-reset-code` | Password reset OTP dispatch |
| `verify-reset-code` | OTP verification and password update |

---

## 9. Security Measures

- **Row-Level Security (RLS)** on all database tables with security-definer helper functions
- **TOTP-based 2FA** mandatory for admin accounts
- **Fullscreen lockdown** during assessments with exit detection
- **Anti-cheat engine** — tab switching, keyboard shortcuts, clipboard, and context menu all blocked during tests
- **Auto-submission** on second anti-cheat violation
- **Private storage buckets** for resumes and marks cards
- **Secure admin invitations** with expiring tokens
- **Session timeout** with configurable inactivity threshold
- **Comprehensive audit logging** of all administrative operations

---

## 10. Testing

The project includes a comprehensive test suite built with **Vitest** and **React Testing Library**:

| Test File | Coverage Area |
|-----------|--------------|
| `AntiCheat.test.ts` | Question shuffling, tab-switch detection, fullscreen exit handling |
| `TestScoring.test.ts` | Score calculation, percentage computation, subject breakdowns |
| `EligibilityChecker.test.ts` | CGPA matching, branch filtering, skills validation |
| `ProtectedRoute.test.tsx` | Authentication guards, role-based redirects |
| `ThemeToggle.test.tsx` | Dark/light mode switching |
| `SessionTimeout.test.ts` | Inactivity detection, countdown timer |
| `Navigation.test.tsx` | Route transitions, sidebar navigation |
| `Utils.test.ts` | Utility function correctness |

Refer to `TEST.md` for detailed manual testing procedures.

---

## 11. Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Placement Tracker** | Allow students to track application status across companies (applied → shortlisted → interviewed → selected/rejected) |
| **Interview Scheduling** | Calendar-based interview slot booking between companies and students |
| **Video Proctoring** | Webcam-based proctoring with AI anomaly detection during assessments |
| **Bulk Resume Download** | Admin ability to download all eligible student resumes as a ZIP archive |
| **Alumni Network Integration** | Connect placed alumni with current students for mentorship |
| **Company Portal** | Dedicated login for company HR to manage drives, view shortlisted candidates, and schedule interviews |
| **SMS Notifications** | Multi-channel alerts via SMS in addition to email and in-app |
| **Advanced Analytics** | Predictive placement probability scoring using historical data |
| **Multi-Institution Support** | White-label deployment for multiple colleges under a single platform |
| **Mobile Application** | Native iOS/Android companion app for students |
| **Offer Letter Management** | Digital offer letter generation, acceptance tracking, and archival |
| **Skills Assessment Engine** | Domain-specific skill tests (coding, aptitude, verbal) with adaptive difficulty |

---

## 12. Project Team

| Role | Responsibility |
|------|---------------|
| Project Lead | Architecture, planning, and coordination |
| Frontend Developer | UI/UX implementation, component development |
| Backend Developer | Database design, edge functions, security policies |
| QA Engineer | Test suite development, manual and automated testing |

---

## 13. Conclusion

The Intelligent Placement Management System transforms the campus placement process from a fragmented, manual operation into a streamlined, secure, and intelligent digital workflow. By automating eligibility checks, securing assessments with fullscreen lockdown and anti-cheat mechanisms, and leveraging AI for question generation and feedback, the platform significantly reduces administrative burden while providing students with a transparent, fair, and efficient placement experience.

---

*© 2026 Intelligent Placement Management System. All rights reserved.*
