# Intelligent Placement Management System — Project Documentation

## Overview

**Intelligent Placement Management System** is a full-stack placement management platform designed for educational institutions. It streamlines the process of managing campus placements by connecting administrators, students, and companies in a unified system.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui components |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, Realtime, Storage) |
| State Management | TanStack React Query, React Context |
| Routing | React Router v6 |
| Charts | Recharts |
| Forms | React Hook Form + Zod validation |

## Architecture

```
src/
├── components/         # Reusable UI components
│   ├── ui/             # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── DashboardLayout.tsx   # Sidebar + header layout
│   ├── NotificationCenter.tsx # Real-time bell notifications
│   ├── ProtectedRoute.tsx     # Role-based route guard
│   ├── ThemeProvider.tsx      # Dark/light theme support
│   └── ThemeToggle.tsx
├── hooks/              # Custom React hooks
│   ├── useAuth.tsx     # Authentication context & helpers
│   ├── useAuditLog.ts  # Admin audit trail logging
│   └── use-mobile.tsx  # Responsive breakpoint detection
├── integrations/
│   └── supabase/       # Auto-generated Supabase client & types
├── pages/
│   ├── admin/          # Admin dashboard, tests, students, companies, analytics
│   └── student/        # Student dashboard, tests, results, profile, schedule
└── lib/
    └── utils.ts        # Utility functions (cn, etc.)

supabase/
├── config.toml         # Supabase project configuration
├── migrations/         # Database migration files
└── functions/          # Edge Functions (serverless backend)
    ├── extract-questions-pdf/    # PDF question extraction
    ├── generate-feedback/        # AI-powered test feedback
    ├── generate-questions/       # AI question generation
    ├── send-company-notification/ # Company update alerts (in-app + email)
    ├── send-email/                # Generic Resend email sender
    ├── send-reset-code/           # Password reset OTP via email
    ├── send-result-notification/  # Test result alerts (in-app + email)
    ├── send-test-notification/    # New test scheduled alerts (in-app + email)
    ├── verify-markscard/          # Marks card verification
    └── verify-reset-code/         # Verify OTP and reset password
```

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Student profile data (USN, branch, CGPA, semester, resume, marks cards) |
| `user_roles` | Role-based access control (admin / student) |
| `companies` | Placement companies with eligibility criteria |
| `tests` | Assessment definitions (questions, duration, pass criteria) |
| `test_attempts` | Student test submissions, scores, anti-cheat data |
| `schedules` | Student-test registration tracking |
| `notifications` | In-app notification system |
| `password_reset_codes` | OTP codes for password reset via email |
| `audit_logs` | Admin action audit trail |
| `admin_invites` | Secure admin invitation tokens |

### Enums

- `app_role`: `admin`, `student`
- `schedule_status`: `registered`, `completed`, `missed`

### Key Database Functions

- `has_role(user_id, role)` — Security definer function for RLS policy checks
- `handle_new_user()` — Trigger: auto-creates profile and assigns student role on signup
- `update_updated_at_column()` — Trigger: auto-updates timestamps

## Features

### Admin Features
- **Dashboard** — Overview stats, recent activity
- **Company Management** — Add/edit/delete companies, set eligibility criteria (CGPA, year, skills cutoff)
- **Test Management** — Create tests with AI-generated or PDF-extracted questions, schedule dates, set pass criteria
- **Student Management** — View all students, profiles, eligibility status
- **Analytics** — Charts and metrics on placement performance
- **Leaderboard** — Ranked student performance
- **Reports** — Exportable placement reports
- **Settings** — Admin invitations, audit logs
- **Notifications** — Auto-notify students on new tests, company visits, eligibility changes

### Student Features
- **Dashboard** — Upcoming tests, recent results, profile completion
- **Tests** — Take scheduled tests with timer, anti-cheat monitoring (tab-switch detection, copy/right-click disabled)
- **Results** — View scores, pass/fail status, AI-generated feedback and explanations
- **Schedule** — View registered and upcoming assessments
- **Profile** — Manage personal info, upload resume, upload marks cards with OCR verification
- **Notifications** — Real-time bell alerts for new tests, results, company updates

### Security
- Row-Level Security (RLS) on all tables
- Role-based route protection (admin vs student)
- Anti-cheat: tab-switch detection, auto-submit on 2nd violation, copy/context-menu disabled
- Audit logging for admin actions
- Secure admin invite system with expiring tokens

### Authentication
- Email/password signup and login
- Email verification required
- Password reset with email OTP verification code (via Resend)
- Transactional email notifications for test results, company visits, and eligibility updates
- Auto-profile creation on signup via database trigger

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

### Edge Function Secrets (configured in Supabase)

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Internal Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin-level DB access |
| `SUPABASE_ANON_KEY` | Anon key for edge functions |
| `RESEND_API_KEY` | Resend API key for transactional email notifications |
| `LOVABLE_API_KEY` | AI gateway key for feedback/question generation |

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `resumes` | No | Student resume uploads |
| `markscards` | No | Student marks card images |
