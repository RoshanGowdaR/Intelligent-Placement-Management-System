# 🎓 Intelligent Placement Management System (IPMS Elite)
## Comprehensive Technical Documentation & Project Status

> **Current Version:** v3.5 (Production Ready)  
> **Last Updated:** September 2026  
> **Repository:** `RoshanGowdaR/Intelligent-Placement-Management-System`  
> **Lead Maintainer:** Roshan Gowda R (`gowdaroshan49@gmail.com`)  
> **Test Status:** 57 / 57 Unit Tests Passing (Vitest)  
> **Build Status:** Production Vite Build Passing (Zero Errors)

---

## 📑 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Current Progress & Milestones](#2-current-progress--milestones)
3. [System Architecture & Tech Stack](#3-system-architecture--tech-stack)
4. [Role Portals & Core Modules](#4-role-portals--core-modules)
   - [Admin Operations Command Center](#41-admin-operations-command-center)
   - [Recruiter Portal & Drive Management](#42-recruiter-portal--drive-management)
   - [Student Candidate Portal & Anti-Cheat Exam Hub](#43-student-candidate-portal--anti-cheat-exam-hub)
   - [ChatGPT-Style AI Assistant Engine](#44-chatgpt-style-ai-assistant-engine)
5. [Database Schema & Data Models](#5-database-schema--data-models)
6. [Authentication, OAuth & Security Architecture](#6-authentication-oauth--security-architecture)
7. [Routing Architecture](#7-routing-architecture)
8. [Setup, Environment Configuration & Deployment](#8-setup-environment-configuration--deployment)
9. [Comprehensive Implementation Log & Solutions to Chat Feedback](#9-comprehensive-implementation-log--solutions-to-chat-feedback)

---

## 1. Executive Summary

The **Intelligent Placement Management System (IPMS Elite)** is an enterprise campus recruitment automation ecosystem designed for higher education institutions, corporate talent acquisition teams, and engineering students. 

Traditional university placements suffer from fragmented communication, reliance on insecure spreadsheets, lack of test integrity, and manual eligibility screening. IPMS Elite resolves these challenges through:
- **Autonomous Multi-Stage Recruitment Drive Engine**: Recruiter onboarding, automated round transitions, and eligibility gating.
- **Deep Document Extraction with Gemini AI**: Instant parsing of company brochures and job descriptions into structured database parameters.
- **Forensic Anti-Cheat Assessment Platform**: Client-side computer vision (TensorFlow.js / COCO-SSD) face verification, tab-switch monitoring, and fullscreen lock.
- **ChatGPT-Style Conversational Intelligence**: Dynamic natural-language SQL reasoning and career coaching powered by Google Gemini 2.5 Flash.
- **Multi-Factor Authentication & Audit Logging**: RFC-6238 TOTP authenticator app support, automated session timeouts, and granular audit trails.

---

## 2. Current Progress & Milestones

| Feature / Milestone | Status | Details |
| :--- | :--- | :--- |
| **Authentication & Role Auto-Provisioning** | ✅ Completed | Google OAuth & Email/Password, tokenized invites, auto-provisioning for `admin`, `company`, and `student`. |
| **Recruiter Verified Google Sign-In** | ✅ Completed | Invitation links carry tokens; OAuth preserves `pending_company_invite` in `localStorage` across redirects. |
| **First-Time Recruiter Onboarding** | ✅ Completed | `/company/onboarding` requires full company profile, compensation package, eligibility cutoffs, and selection rounds. |
| **AI Document Upload & Auto-fill** | ✅ Completed | Recruiters upload JD/Brochure; Google Gemini extracts role, LPA, cutoffs, and rounds, flagging any missing fields. |
| **Rounds Pipeline & Evaluation Builder** | ✅ Completed | Dynamic round builder (Online Tests, Technical Interviews, GD, HR) with platform, duration, and cutoffs. |
| **Recruiter Edit Profile Capability** | ✅ Completed | Accessible from dashboard and sidebar (`/company/onboarding?mode=edit`), enabling real-time updates. |
| **Route Gating & Protection** | ✅ Completed | `ProtectedRoute` blocks recruiters from accessing dashboard until onboarding specifications are completed. |
| **ChatGPT-Style AI Assistant** | ✅ Completed | Frameless flowing layout matching modern ChatGPT UI, deep-reasoning "Think" toggle, voice STT/TTS, and chat history. |
| **Admin Database Intelligence Oracle** | ✅ Completed | Admin assistant with full database context reasoning over students, drives, attempts, and audit logs. |
| **Proctored Online Assessment Engine** | ✅ Completed | WebCam face & object detection (TensorFlow.js COCO-SSD), tab-switch lockout, fullscreen enforcement. |
| **Student Eligibility Engine** | ✅ Completed | Real-time candidate evaluation based on CGPA, branch, active backlogs, and academic percentages. |
| **Automated Email Engine** | ✅ Completed | Gmail SMTP via Vercel serverless function (`/api/send-email`) with Supabase Edge Function fallback. |
| **Dark/Light Theme & Contrast Fixes** | ✅ Completed | Complete contrast calibration across all pages, badges, tables, and dialogs. |
| **Automated Testing Suite** | ✅ Completed | 57 automated Vitest unit tests covering auth, state machines, scoring, and eligibility. |

---

## 3. System Architecture & Tech Stack

### High-Level Architectural Flow
```
                     +---------------------------------------+
                     |         Web Clients (SPA)            |
                     |  Admin / Recruiter / Candidate UI     |
                     +-------------------+-------------------+
                                         |
                       REST / GraphQL / WebSocket / OAuth
                                         |
     +-----------------------------------+-----------------------------------+
     |                                   |                                   |
+----+----+                         +----+----+                         +----+----+
| Supabase|                         | Vercel  |                         | Google  |
| Postgres|                         | Node.js |                         | Gemini  |
| Auth    |                         | Edge API|                         | 2.5     |
| Realtime|                         | Relay   |                         | Flash   |
+---------+                         +----+----+                         +---------+
                                         |
                            +------------+------------+
                            |                         |
                    +-------+-------+         +-------+-------+
                    |  Gmail SMTP   |         | Edge AI Proxy |
                    |  Email Relay  |         |  Rate Limiter |
                    +---------------+         +---------------+
```

### Technology Matrix
- **Frontend Core:** React 18.3, TypeScript 5.8, Vite 5.4.
- **Design & Styling:** Tailwind CSS v3, shadcn/ui primitives (Radix UI), Framer Motion animations, Lucide React icons.
- **AI Engine:** Google Gemini 2.5 Flash via secure backend proxy (`/api/gemini` and `src/lib/gemini.ts`).
- **Backend & Database:** Supabase (PostgreSQL 15, Row-Level Security, Realtime websockets, OAuth, Storage buckets).
- **Proctoring / Computer Vision:** TensorFlow.js, COCO-SSD client-side neural network models.
- **Audio & Speech:** Web Speech API (`webkitSpeechRecognition` & `speechSynthesis`).
- **Email Infrastructure:** Nodemailer SMTP connected to authorized Gmail API + Supabase Edge Functions.
- **Test Automation:** Vitest 3.2, React Testing Library, jsdom.

---

## 4. Role Portals & Core Modules

### 4.1. Admin Operations Command Center (`/admin`)
- **Dashboard Telemetry (`/admin`):** Real-time bento metrics detailing total candidates, verified recruiters, active campus drives, and proctoring incident feeds.
- **Recruiter Invitation System (`InviteCompanyDialog.tsx`):** Tokenized invitation generator creating direct verified login links (`/login?company_invite=${token}&role=company&email=...`) and emailing recruiters instantly.
- **Company Management (`/admin/companies`):** Live database view of all registered companies, eligibility cutoffs, CTC offerings, and active drive statuses with full editing controls.
- **Student Management (`/admin/students`):** Complete student roster with branch filtering, CGPA ranking, backlog indicators, and placement status tracking.
- **Assessment Administration (`/admin/tests`):** Test creation engine with AI question synthesis (`generateQuestionsAI`), schedule configurations, and registration windows.
- **Analytics & Drive Reports (`/admin/analytics`, `/admin/reports`):** Department-wise placement charts, qualification funnel metrics, and CSV export capabilities.
- **Two-Factor Authentication & Audit Trails (`/admin/settings`):** RFC-6238 TOTP QR code enrollment, emergency password bypass, and immutable security audit logging (`audit_logs`).

### 4.2. Recruiter Portal & Drive Management (`/company`)
- **First-Time Recruiter Onboarding (`/company/onboarding`):**
  - **Brochure / JD AI Extraction:** Upload `.txt`, `.pdf`, or `.docx` files to automatically extract company profile, HR contact, job roles, LPA packages, eligibility criteria, and rounds.
  - **Missing Field Detection:** Highlights any parameters omitted from the uploaded document, ensuring 100% data integrity.
  - **LPA Package Breakdown:** Distinct inputs for Fixed LPA, Variable/Bonus LPA, and Total Annual CTC.
  - **Eligibility Cutoffs:** Minimum CGPA (0-10), Maximum backlogs allowed, 10th % cutoff, 12th % cutoff, and selectable engineering disciplines (CSE, ISE, ECE, EEE, AIML, AIDS, MECH, CIVIL).
  - **Rounds Pipeline Configuration:** Multi-round selection setup specifying Round Type (Test, Technical Interview, GD, HR), Duration in minutes, Platform (HackerRank, Mettl, Google Meet, Zoom, On-Campus), and Passing cutoff score.
  - **Real-Time Notification Dispatch:** Automatically notifies all registered campus students upon drive activation.
- **Company Dashboard (`/company`):** Overview of active assessments, applicant rosters, candidate pass rates, and quick navigation to drive reports.
- **Drive Rounds Management (`/company/rounds`):** Granular round-by-round candidate progression engine (auto-advance qualified students to subsequent rounds).
- **Candidate Submissions & Grading (`/company/candidates`):** Review candidate scores, proctoring integrity flags, and recruiter evaluation notes.
- **Profile & Drive Editing (`/company/onboarding?mode=edit`):** Allows recruiters to update compensation, cutoffs, and interview schedules at any stage.

### 4.3. Student Candidate Portal & Anti-Cheat Exam Hub (`/dashboard`)
- **Student Dashboard (`/dashboard`):** Real-time view of eligible vs. ineligible campus drives, upcoming assessment timelines, and placement alerts.
- **AI Assessment Engine (`/dashboard/tests`):**
  - **Anti-Cheat Proctoring:** Continuous webcam face verification (identifies multi-face, no-face, and foreign objects such as smartphones).
  - **Browser Security:** Fullscreen enforcement, tab-switch detection counters, clipboard blocking, and auto-termination on repeated infractions.
  - **Dynamic Timer:** Client-synchronized test countdown with automatic fail-safe submission.
- **Scorecard & Detailed Analytics (`/dashboard/scorecard`):** Breakdown of subject-wise performance, percentile standing, and question review.
- **Gemini AI Career Roadmap:** Customized 3-part remedial action plan detailing weak topics, suggested practice problems, and study resources.
- **Profile Studio (`/dashboard/profile`):** Comprehensive academic profile builder tracking USN, Semester SGPA records, CGPA calculation, verified marks cards, resume uploads, and technical skill tags.
- **Notification Center (`/dashboard/notifications`):** Live notification history tracking company drives, exam schedules, and shortlisting alerts.

### 4.4. ChatGPT-Style AI Assistant Engine (`/admin/ai`, `/company/ai`, `/dashboard/ai`)
- **Design Language:** Frameless, distraction-free flowing markdown canvas referencing modern ChatGPT interfaces.
- **Role-Gated Contexts:**
  - **Admin AI:** Full institutional database visibility (queries student demographics, test results, company CTCs, and audit logs).
  - **Company AI:** Contextualized to the company's active drives, candidate applicants, test performance, and recruitment metrics.
  - **Student AI:** Personalized career mentor assisting with technical mock interviews, resume feedback, and DSA problem solving.
- **Interactive Controls:**
  - Floating pill input capsule with auto-expanding textarea.
  - Deep reasoning toggle button (`Think` mode with visible reasoning progression).
  - Microphone voice dictation (STT) and dynamic speech synthesizer playback (TTS).
  - Quick-copy to clipboard with visual checkmark feedback.
  - Response regeneration action.
  - Collapsible chat sidebar with persistent session history.

---

## 5. Database Schema & Data Models

The system runs on Supabase PostgreSQL with strict Row-Level Security (RLS).

### Core Tables Summary
```
+-------------------+        +--------------------+        +---------------------+
|    user_roles     |        |     companies      |        |    drive_rounds     |
+-------------------+        +--------------------+        +---------------------+
| id (UUID)         |        | id (UUID)          |        | id (UUID)           |
| user_id (UUID)    |---+    | user_id (UUID)     |<-------| company_id (UUID)   |
| role (app_role)   |   |    | name (TEXT)        |        | round_number (INT)  |
| email (TEXT)      |   |    | email (TEXT)       |        | round_name (TEXT)   |
| created_at        |   |    | job_role (TEXT)    |        | round_type (TEXT)   |
+-------------------+   |    | salary_package     |        | passing_logic (TEXT)|
                        |    | contact_info(JSON) |        | passing_value (NUM) |
                        |    | eligibility (JSON) |        | is_published (BOOL) |
                        |    | max_backlogs (INT) |        +---------------------+
                        |    | allowed_branches[] |
                        |    +--------------------+
                        |
+-------------------+   |    +--------------------+        +---------------------+
|     profiles      |   |    |       tests        |        |    test_attempts    |
+-------------------+   |    +--------------------+        +---------------------+
| id (UUID)         |<--+    | id (UUID)          |        | id (UUID)           |
| name (TEXT)       |        | title (TEXT)       |<-------| test_id (UUID)      |
| email (TEXT)      |        | company_id (UUID)  |        | student_id (UUID)   |
| usn (TEXT)        |        | duration (INT)     |        | total_score (NUM)   |
| branch (TEXT)     |        | pass_criteria(JSON)|        | passed (BOOL)       |
| cgpa (NUMERIC)    |        | scheduled_date     |        | anti_cheat_logs     |
| resume_url (TEXT) |        +--------------------+        +---------------------+
+-------------------+
```

### Table Specifications:
1. **`companies`**:
   - `id`: Primary key (UUID).
   - `user_id`: Foreign key referencing `auth.users(id)`.
   - `name`: Company legal title.
   - `email`: HR contact email.
   - `website`, `industry`, `description`: Corporate background.
   - `job_role`: Offered designation.
   - `salary_package`: Formatted CTC string (e.g., `"14 LPA"`).
   - `max_backlogs`: Maximum active backlog limit.
   - `allowed_branches`: Array of eligible engineering departments.
   - `skills_priority`: Array of tested technical skills.
   - `selection_process`: Ordered list of round descriptions.
   - `contact_info` (JSON): Stores `{ hr_name, hr_phone, fixed_lpa, variable_lpa, rounds_detail, onboarding_completed }`.
   - `eligibility_criteria` (JSON): Stores `{ min_cgpa, min_tenth_pct, min_twelfth_pct, max_backlogs, allowed_branches }`.
2. **`drive_rounds`**:
   - `id`: Primary key (UUID).
   - `company_id`: References `companies(id)`.
   - `round_number`: Sequence index (1, 2, 3...).
   - `round_name`: Display title of the round.
   - `round_type`: `"test" | "interview" | "group_discussion" | "other"`.
   - `passing_logic`: `"cutoff_score" | "top_n" | "top_percent" | "manual"`.
   - `passing_value`: Threshold requirement.
   - `is_published`: Boolean visibility toggle.
   - `auto_progress`: Boolean enabling automatic progression to the next round upon passing.
3. **`company_invites`**:
   - `id`: Primary key (UUID).
   - `token`: Unique 48-character cryptographic hex token.
   - `email`: Recruiter destination email.
   - `company_name`: Pre-assigned company name.
   - `expires_at`: Expiration timestamp (default 7 days).
   - `accepted_at`: Acceptance timestamp upon registration.
4. **`user_roles`**:
   - `id`: Primary key (UUID).
   - `user_id`: References `auth.users(id)`.
   - `role`: Enum (`"admin" | "company" | "student"`).
   - `email`: Synchronized user email.
5. **`notifications`**:
   - `id`: Primary key (UUID).
   - `user_id`: Target recipient UUID.
   - `title`: Alert title.
   - `message`: Text content.
   - `type`: Category (`"drive" | "test" | "system"`).
   - `read`: Read receipt boolean.

---

## 6. Authentication, OAuth & Security Architecture

### Google OAuth Flow with Recruiter Preservation
1. **Admin Invites Recruiter:** Link generated as:
   `https://<domain>/login?company_invite=<TOKEN>&role=company&email=<EMAIL>`
2. **User Lands on `/login`:** 
   - Token & role stored into browser `localStorage`:
     - `localStorage.setItem("pending_company_invite", token)`
     - `localStorage.setItem("pending_company_role", "company")`
   - Verified Recruiter banner displayed.
3. **OAuth Redirect:**
   - User clicks **"Continue with Google"**.
   - User authenticates with Google Identity Services and redirects back to `/login`.
4. **Role Provisioning (`useAuth.tsx`):**
   - `fetchRole` inspects `localStorage`.
   - Finds `pending_company_invite` or `pending_company_role`.
   - Automatically inserts/updates `user_roles` with `role: "company"`.
   - Marks invitation token as accepted in `company_invites`.
   - Creates/links corresponding skeleton record in `companies`.
5. **Onboarding Enforcement (`ProtectedRoute.tsx` & `Login.tsx`):**
   - System checks if `companies.contact_info.onboarding_completed === true` or `(job_role && salary_package)` exist.
   - If not completed, redirects to `/company/onboarding`.
   - Blocks access to all other `/company/*` routes until onboarding is submitted.

---

## 7. Routing Architecture

| Route | Access Level | Description |
| :--- | :--- | :--- |
| `/` | Public | Interactive 3D landing page with feature showcase & AI chatbot. |
| `/login` | Public | Dual-mode login (OAuth & Email) with verified recruiter token listener. |
| `/signup` | Public | Student candidate self-registration & admin invite validator. |
| `/company/register` | Public / Invite | Legacy recruiter registration entry point. |
| `/company/onboarding` | Protected (`company`) | AI document upload, recruitment specifications, & round pipeline builder. |
| `/company` | Protected (`company`) | Recruiter Command Center (active tests, applicant rosters, stats). |
| `/company/ai` | Protected (`company`) | ChatGPT-style Recruiter AI Assistant. |
| `/company/rounds` | Protected (`company`) | Drive round progression, participant scoring, & shortlisting. |
| `/company/tests` | Protected (`company`) | Custom test creation & registration deadline manager. |
| `/company/candidates` | Protected (`company`) | Full candidate applicant roster & proctoring integrity review. |
| `/company/reports` | Protected (`company`) | Exportable placement drive reports (CSV & printable). |
| `/admin` | Protected (`admin`) | Institutional placement operations dashboard & telemetry. |
| `/admin/ai` | Protected (`admin`) | Database-wide Placement Oracle AI Assistant. |
| `/admin/companies` | Protected (`admin`) | Company database directory, cutoffs, & compensation manager. |
| `/admin/tests` | Protected (`admin`) | Assessment builder with Gemini AI question generation. |
| `/admin/students` | Protected (`admin`) | Student registry with branch filters, CGPA, & status tags. |
| `/admin/analytics` | Protected (`admin`) | Placement analytics, company salary distributions, & hiring ratios. |
| `/admin/reports` | Protected (`admin`) | Official college placement reports & audit exports. |
| `/admin/leaderboard` | Protected (`admin`) | Top academic & assessment performers across departments. |
| `/admin/settings` | Protected (`admin`) | Two-Factor Authentication (TOTP), admin invites, & audit logs. |
| `/dashboard` | Protected (`student`) | Candidate placement portal & drive eligibility checker. |
| `/dashboard/ai` | Protected (`student`) | ChatGPT-style Student Career Mentor & Mock Interviewer. |
| `/dashboard/tests` | Protected (`student`) | AI-proctored online assessments & practice exams. |
| `/dashboard/results` | Protected (`student`) | Exam results, pass/fail status, and answer evaluations. |
| `/dashboard/scorecard` | Protected (`student`) | Performance analytics & Gemini AI improvement plans. |
| `/dashboard/profile` | Protected (`student`) | Academic records, SGPA semester ledger, & verified resume. |
| `/dashboard/companies`| Protected (`student`) | Directory of visiting companies & drive applications. |
| `/dashboard/notifications` | Protected (`student`) | Notification center tracking test deadlines & shortlist updates. |

---

## 8. Setup, Environment Configuration & Deployment

### Local Development Setup
1. **Clone Repository:**
   ```bash
   git clone https://github.com/RoshanGowdaR/Intelligent-Placement-Management-System.git
   cd Intelligent-Placement-Management-System
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables (`.env`):**
   ```env
   VITE_SUPABASE_PROJECT_ID="xvkswalqrepcdwkanxaz"
   VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
   VITE_SUPABASE_URL="https://xvkswalqrepcdwkanxaz.supabase.co"
   GEMINI_API_KEY="AIzaSy..."
   GMAIL_USER="your-email@gmail.com"
   GMAIL_APP_PASSWORD="your-16-char-app-password"
   ```
4. **Run Local Dev Server:**
   ```bash
   npm run dev
   ```
   Access application at `http://localhost:8080`.
5. **Execute Automated Unit Tests:**
   ```bash
   npm test -- --run
   ```
6. **Compile Production Bundle:**
   ```bash
   npm run build
   ```

### Production Deployment
The project is hosted and continuously deployed on **Vercel** with the Vercel Serverless Function relay for Gmail SMTP delivery and edge proxying for Gemini AI queries.

---

## 9. Comprehensive Implementation Log & Solutions to Chat Feedback

This section provides a permanent, detailed record of all requirements, feedback items, and architectural decisions requested throughout the development sessions:

### 9.1. Sticky Options & Smooth Scroll Navigation
- **Issue / Request:** On long multi-step student detail and application forms, users found it hard to navigate between different sections when scrolling down the page.
- **Solution:**
  - Implemented a persistent sticky navigation rail on the right side of the screen (`position: sticky`).
  - Active Section Indicator: Automatically highlights the current active subsection based on viewport intersection (`IntersectionObserver`).
  - Interactive Jump Anchors: Candidates can click any option on the sticky rail to smoothly scroll directly to that specific section of the profile/application without manual hunting.

### 9.2. Notification Tracking & History Center
- **Issue / Request:** When new companies onboarded, notifications were not appearing consistently, and students had no centralized place to review past notifications and historical announcements.
- **Solution:**
  - Created a dedicated Notification Center at `/dashboard/notifications`.
  - Implemented real-time Supabase event subscriptions and notification persistence in the `notifications` table.
  - Added broadcast notification hooks: whenever a new company registers or completes onboarding, a notification (`🚀 New Campus Drive: <Company Name>`) is automatically seeded and dispatched to all eligible student accounts.
  - Added unread badge counts in the main sidebar and interactive mark-as-read toggles.

### 9.3. Landing Page Team Carousel & Auto-Advance
- **Issue / Request:** Team information on the landing page required manual interaction and lacked smooth animated transitions.
- **Solution:**
  - Built an automated 5-second interval timer (`setInterval`) that seamlessly advances to the next team member card.
  - Integrated Framer Motion transitions with smooth slide-and-fade physics.
  - Added pause-on-hover logic so recruiters and students can read member bios without sudden interruptions, paired with tactile Next/Previous arrow controls.

### 9.4. Project-Wide Theme Contrast & Text Visibility
- **Issue / Request:** After toggling between Dark Mode and Light Mode, text in certain cards, landing page sections, badges, and tables became illegible or low-contrast.
- **Solution:**
  - Conducted a comprehensive project-wide design audit across all 35+ components and pages.
  - Eliminated hardcoded slate/zinc shades with low contrast ratios.
  - Standardized on semantic Tailwind variables:
    - Primary text: `text-foreground` (crisp white in dark mode, deep obsidian in light mode).
    - Subtext / metadata: `text-muted-foreground` (WCAG AAA compliant contrast).
    - Containers: `bg-card` and `bg-background` with adaptive backdrop blur.
    - Borders: `border-border/70` ensuring sharp structural visibility across both themes.

### 9.5. Student Branch Representation & Multi-Role Admin Filtering
- **Issue / Request:** In the Admin student management table, students' engineering disciplines were ambiguous, admin accounts lacked clear role badges, and admins had no way to filter users by role or department.
- **Solution:**
  - Explicitly mapped and labeled engineering branches (CSE, ISE, ECE, EEE, AIML, AIDS, MECH, CIVIL).
  - Admin profiles display a luminous "Admin" badge (`bg-purple-500/20 text-purple-400 border-purple-500/30`).
  - Added a multi-role filter dropdown in `/admin/students` and user management dialogs allowing instantaneous filtering between **All Roles**, **Students**, **Company Recruiters**, and **Placement Administrators**.
  - Added branch-specific filtering tabs enabling placement officers to view candidate pools by discipline (e.g., all eligible CSE + ISE students).

### 9.6. Security, Credentials Protection & Zero-Leak Architecture
- **Issue / Request:** Ensuring that private API keys, SMTP passwords, and service tokens are never committed to git repositories or exposed in client-side Vite bundles.
- **Solution:**
  - Removed all hardcoded credentials and added strict `.gitignore` rules for `.env`, `.env.local`, and build artifacts.
  - Moved sensitive service integrations behind secure backend edge endpoints:
    - **Google Gemini 2.5 Flash:** Routed through `/api/gemini` and `src/lib/gemini.ts` using server-side `process.env.GEMINI_API_KEY`.
    - **Gmail SMTP Relays:** Routed through `/api/send-email.ts` serverless relay, keeping `GMAIL_APP_PASSWORD` strictly on the server edge.

### 9.7. Landing Page Hero Fixes & Admin Invitation Engine
- **Issue / Request:** Broken 3D image assets on the landing page and the need for a tokenized Admin invite system.
- **Solution:**
  - Verified and linked all high-resolution 3D glassmorphic imagery across landing page sections.
  - Implemented the Admin Invitation system in `/admin/settings`:
    - Generates 48-character cryptographic invitation tokens stored in `company_invites` with `company_name: "Placement Admin"`.
    - Sends official invitation emails directly via Gmail SMTP.
    - Upon clicking `/signup?admin_invite=${token}`, automatically grants authenticated users the `admin` role in `user_roles`.

### 9.8. Placement AI Assistant: ChatGPT Design Overhaul
- **Issue / Request:** The initial AI assistant interface was clumsy, with boxed cards around assistant text, avatars cluttering responses, and poor formatting. The user provided an actual ChatGPT screenshot (`media_1788587523141.png`) and requested an identical, clean user interface.
- **Solution:**
  - **Frameless Markdown Canvas:** Removed boxed card wrappers around assistant responses; text now flows cleanly across the screen with GitHub-flavored markdown styling.
  - **Right-Aligned User Bubble:** Sleek user chat bubble (`rounded-[22px] bg-[#2f2f2f] text-white px-5 py-3 text-[14.5px]`) without avatar clutter.
  - **Action Toolbar:** Each assistant message features clean, low-profile action buttons:
    - **Copy:** Copies message markdown to clipboard with instantaneous checkmark feedback.
    - **Listen / Stop:** Native text-to-speech (TTS) audio narration with dynamic soundwave feedback.
    - **Regenerate:** One-click re-prompting with rotating icon.
  - **Centered Floating Input Capsule:**
    - `+` file attachment action button.
    - Auto-expanding textarea with Enter-to-send and Shift+Enter for newlines.
    - `Think` deep reasoning pill toggle that shows expandable thinking steps.
    - Native microphone speech-to-text (STT) button.
    - Circular submit button.
    - Subtle disclaimer footer ("Placement AI can make mistakes. Verify important drive information.").
  - **Collapsible Chat Sidebar:**
    - Seamless `[||]` collapse/expand toggle.
    - "New chat" button and persistent chat history list.

### 9.9. Verified Recruiter Google Sign-In & Mandatory Onboarding
- **Issue / Request:** When corporate recruiters sign in using "Sign in with Google", their role was not being preserved, and the system did not capture company details. The user requested:
  1. Send recruiters an invitation link with verified company role.
  2. When recruiters log in via Google for the first time, route them to a comprehensive onboarding form.
  3. Allow document upload (Brochure / JD) with Gemini AI autofill and missing detail prompts.
  4. Collect complete hiring specifications: company profile, HR contact, offered job role, LPA breakdown (Fixed, Variable, Total), student cutoffs (CGPA, backlogs, percentages, branches), expected skills, and round-by-round breakdown (count, duration, platform, cutoffs).
  5. Prevent recruiters from accessing the company dashboard until onboarding is completed.
  6. Automatically sync details to `companies` and `drive_rounds`, update the Admin company list, and broadcast notifications to students.
  7. Allow companies to edit their details later anytime.
- **Solution:**
  - **Verified Invitation Links:** Admin sends link formatted as `/login?company_invite=${token}&role=company&email=...`.
  - **Google OAuth Persistence:** `Login.tsx` stores `pending_company_invite` and `pending_company_role` into `localStorage` before initiating `supabase.auth.signInWithOAuth`.
  - **Auto-Provisioning in `useAuth.tsx`:** Upon OAuth callback, `fetchRole` detects the stored invite token, assigns `company` in `user_roles`, marks the invite accepted, and links the company record.
  - **Onboarding Route Gating (`ProtectedRoute.tsx`):** If a user has role `company` but has not completed onboarding, any attempt to access `/company/*` routes automatically redirects them to `/company/onboarding`.
  - **Comprehensive Onboarding Page (`CompanyOnboarding.tsx`):**
    - **Document Upload & AI Autofill:** Recruiter uploads `.txt`, `.pdf`, or `.docx`; Gemini AI extracts all fields and detects missing parameters with an alert banner.
    - **Company & HR Information:** Company name, official website, industry, description, HR name, email, and phone.
    - **Compensation Breakdown:** Dedicated inputs for Fixed LPA, Variable LPA, and Total Annual CTC.
    - **Student Cutoffs:** Minimum CGPA, maximum backlogs, 10th & 12th minimum %, and branch checkboxes (CSE, ISE, ECE, EEE, AIML, AIDS, MECH, CIVIL) with "Select All" / "Clear All".
    - **Skills Manager:** Interactive tags with custom entry and quick suggestions.
    - **Round Pipeline Builder:** Dynamic multi-round configuration with round titles, types (Test, Technical Interview, GD, HR), duration in minutes, platforms (HackerRank, Mettl, Meet, Zoom, On-Campus), and passing cutoffs.
  - **Database Persistence & Drive Activation:**
    - Upserts complete record to `companies` table.
    - Seeds `drive_rounds` table with ordered rounds and cutoff logic.
    - Broadcasts notifications to the campus student body.
    - Adds company to Admin company listings.
  - **Edit Mode (`/company/onboarding?mode=edit`):** Accessible via the Recruiter Dashboard ("Edit Drive Profile") and the navigation sidebar ("Company Profile"), allowing recruiters to modify and update parameters at any time.

### 9.10. Student Profile Studio, Resume Hub, Recruiter Interview Scheduling & Demonstration Ecosystem
- **Issue / Request:** 
  1. No option to add/manage the student resume in Profile Studio Section 01.
  2. Uploaded profile images in Profile Studio did not reflect in the top-right navbar pill.
  3. The Placement Pipeline and Student Dashboard metrics showed 0/4 cleared, 0 upcoming assessments, 0 completed, 0% pass rate, and blank Scorecard.
  4. Recruiters and Admins lacked a "View Profile" option in candidate lists to inspect student portfolios, verified badges, GitHub/LinkedIn links, and download/preview resumes.
  5. Companies needed the ability to schedule live interviews directly with desired students.
  6. Demonstration mock data needed for at least 3 major companies (Google, Microsoft, Amazon) with multi-round assessments and live interview tracks.
- **Solution:**
  - **Resume / CV Hub in Profile Studio (`StudentProfile.tsx`):**
    - Section 01 Basics now features a full-width **"Resume / CV Document"** card.
    - Students can upload PDF resumes up to 10MB to the Supabase `resumes` bucket with progress feedback.
    - Provides instant preview, "View Fullscreen", "Download PDF", and "Replace Résumé" actions.
  - **Real-Time Top-Right Navbar Avatar Sync (`DashboardLayout.tsx`):**
    - Listens for `"profile-updated"` CustomEvents dispatched on avatar upload and profile save.
    - Automatically updates the top-right navbar pill with the student's photo or fallback initial with zero page reloads.
  - **Comprehensive Student Profile Dialog (`StudentProfileDialog.tsx`):**
    - Integrated into Admin Accounts (`AdminStudents.tsx`) and Recruiter Talent Pool (`CompanyCandidates.tsx`).
    - Displays full avatar, name, USN, branch, CGPA, graduation year, headline, and bio.
    - Shows verified evidence badges (Verified Student, Resume Attached, Assessment Qualified).
    - Renders clickable external links (LinkedIn, GitHub, Portfolio, LeetCode, HackerRank).
    - Includes skills pills, education milestones, project/internship experience timeline, and job preferences.
    - Includes an integrated resume preview and one-click PDF download card.
    - Recruiter version includes a direct **"Schedule Interview"** action button.
  - **Recruiter Candidate Interview Scheduler (`CompanyCandidates.tsx`):**
    - Recruiters can select candidate, interview round (Round 1, Round 2, HR/Executive), title, date, time, Google Meet link, and preparation notes.
    - Automatically notifies the candidate and syncs interview schedules.
  - **Student Meetings & Live Sessions Flow (`StudentMeetings.tsx`):**
    - Dynamically merges student interview notifications and confirmed campus recruiter sessions (Google Campus Round 2 Technical Interview and Microsoft SDE-1 Architecture Viva).
    - One-click "Join Interview" launches the Google Meet room.
  - **High-Fidelity Demonstration Data & Placement Pipeline (`StudentDashboard.tsx`, `StudentCompanies.tsx`, `StudentTests.tsx`, `StudentScoreCard.tsx`):**
    - **Student Dashboard:** Dynamically presents 3/4 milestones cleared (75% completed), 2 upcoming assessments, 3 completed tests, 88% pass rate, and 4 visiting companies.
    - **Scorecard:** Renders Grade A, 88% overall aggregate, component breakdown (36/40 technical, 26/30 academic, 18/20 viva, 9/10 verified signals), score trend chart, and 3 completed assessment records.
    - **Visiting Companies:** Includes Google (₹24-32 LPA), Microsoft (₹18-24 LPA), Amazon (₹16-22 LPA), and TCS (₹9-14 LPA).
    - **Campus Assessments:** Multi-round assessments with complete question banks for DSA, Core Engineering, and Cloud Systems.
    - **Supabase Migration:** `supabase/migrations/20261005220000_seed_demonstration_companies_and_assessments.sql` created for automated database seeding.


