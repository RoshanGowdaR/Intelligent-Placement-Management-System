# 📜 Changelog
All notable changes to the **Intelligent Placement Management System (IPMS Elite)** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-10-23

### Added
- **Multi-Dimensional Reports & Analytics Filtering**:
  - Filter console in `AdminAnalytics.tsx` supporting simultaneous slicing by Assessment, Visiting Recruiter, Engineering Branch, Graduation Batch (Year), and Time Horizon (7d, 30d, 90d, All Time).
  - Search and filter bar in `AdminReports.tsx` with dedicated filters for USN / Candidate Name, Engineering Branch, Graduation Year, Recruiter, Pass/Fail Status, Submission Mode (Manual vs Auto-Submitted), and Retake Attempts.
  - Fully filtered CSV export delivering candidate USN, Branch, Graduation Year, CGPA, Score, Status, Attempt Number, and detailed Proctoring Audit Notes.
- **Session-Scoped State Persistence**:
  - Engineered `usePersistentState.ts` custom hook utilizing browser `sessionStorage`.
  - Guarantees search criteria, multi-select dropdown filters, and table pagination remain intact when navigating between portal modules (e.g. Reports ➔ Students ➔ Reports).
- **Mandatory Pre-Flight Assessment Gating & Fullscreen Lockout**:
  - Added `ProctorGateModal` blocking test initialization until webcam video streaming is active and fullscreen mode is entered via a direct, synchronous user gesture.
  - Added in-test fullscreen violation lockout overlay that immediately freezes questions and obscures test content until the candidate restores fullscreen.
  - Guarded active test taking route (`/dashboard/tests`) to completely suppress floating AI assistants to prevent cheating.
- **Enhanced AI Proctoring Sensitivity & Multi-Person Detection**:
  - Lowered TensorFlow.js COCO-SSD detection thresholds to `0.22` for mobile phones and `0.25` for digital gadgets.
  - Implemented multi-person detection (`preds.filter(p => p.class === "person").length > 1`) triggering immediate proctoring violation alarms.
- **Admin Floating AI Assistant & Deep Think Mode**:
  - Bottom-right draggable/resizable floating assistant for administrators with top-left resize handles and minimize/maximize states.
  - Integrated `<think>...</think>` forensic parsing rendering an interactive collapsible "Forensic Reasoning & Thought Process" accordion card.
  - Strict Charts-on-Demand policy: Recharts graphs are strictly generated only when explicitly prompted by the user.
- **Student AI Assistant Privacy Boundary & Clean Typography**:
  - Enforced strict privacy guard blocking student queries that attempt to access cohort rankings, database dumps, or other students' private marks.
  - Removed awkward green pill backgrounds on bold words; added full GitHub-flavored markdown table support with zebra striping.
- **Team Section Image Fallbacks**:
  - Integrated dynamic `onError` avatar fallback on landing page team cards displaying stylized member initials when portrait URLs fail to load.

### Fixed
- Fixed browser security exception: `"Failed to execute 'requestFullscreen' on 'Element': API can only be initiated by a user gesture"` by synchronizing fullscreen requests with direct button click triggers.
- Fixed PostgREST HTTP 400 Bad Request error on test attempt updates by targeting specific IDs instead of chaining unsupported `.order().limit()` on `.update()`.
- Fixed Supabase Edge Function CORS/400 errors (`generate-feedback`, `send-result-notification`) by routing AI generation to Gemini client and notifications to direct table writes.
- Fixed unclosed JSX tags in `StudentTests.tsx` and unescaped triple backticks in `PlacementAIChat.tsx`.

---

## [3.0.0] - 2026-10-22

### Added
- **Placement AI Oracle Forensics**: Live database context gathering in `PlacementAIChat.tsx` and `AdminAIAssistant.tsx` mapping student rosters, test attendees, passed/failed candidates, and company cutoffs without hallucinations.
- **Interactive Generative UI**: Custom code block renderers for `chart`, `kpi`, and `proctor` transforming LLM responses into live Recharts Bar Charts, glowing KPI metric cards, and proctor integrity gauges.
- **Remark-GFM Table Support**: Integrated `remark-gfm` v4 across ReactMarkdown components for responsive HTML table rendering with zebra striping and borders.
- **Proctor Integrity Score**: Mathematical scoring engine ($S = 100 - (Tabs \times 15) - (Gadgets \times 40)$) calculating candidate integrity scores out of 100 with automated violation breakdown.
- **Universal Gadget Detection**: Enforced automatic alarms for cellphones and digital gadgets without requiring manual tester selection.
- **Assessment Deletion Safety**: Added `AlertDialog` confirmation modal to prevent accidental test deletions.
- **TCS Recruiter Branding**: Added crisp Tata Consultancy Services logo asset with standardized 40x40px sizing and vertical flex alignment across admin and assessment views.
- **GitHub Actions CI/CD Pipelines**:
  - `.github/workflows/ci.yml`: Automated TypeScript typecheck, ESLint, Vitest test suite, and production build verification.
  - `.github/workflows/backend-test.yml`: Dedicated recruitment engine, proctor scoring, and SQL migration verification.
  - `.github/workflows/deploy.yml`: Pre-deployment validation gates.
- **Comprehensive Quality & Governance Documentation**:
  - `TEST_PLAN.md`: Master Software Test Plan (IEEE 829 standard).
  - `MANUAL_TESTING.md`: 50 manual test cases with steps, inputs, expected/actual results across all 8 modules.
  - `EXPLORATORY_TESTING.md`: Timeboxed exploratory session charters and formal bug reports (BUG-001 through BUG-006).
  - `docs/PRD.md`: Exhaustive Product Requirements Document v3.0.
  - `docs/architecture.md` & `docs/architecture-diagram.svg`: Vector architectural blueprint and data flow sequence diagrams.
  - `docs/ERD.md` & `docs/ERD.svg`: Relational entity-relationship diagram and data dictionary.
  - `docs/API.md`, `docs/SETUP.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`.
  - `docs/model-card.md`, `docs/data-card.md`, `docs/evaluation.md`.
  - `docs/decisions/`: Architecture Decision Records (ADRs 0001 through 0005).
  - `Dockerfile` & `.dockerignore`: Multi-stage production container build.

### Fixed
- Fixed PostgREST column mismatches (`min_cgpa`, `category`, `score`) causing queries to fail and report 0 companies/tests.
- Fixed unescaped backtick syntax error in template string prompt.
- Fixed Vitest timeout on heavy dynamic full App import in `Navigation.test.tsx`.

---

## [2.5.0] - 2026-10-07

### Added
- **Multi-Round Recruitment Drive Engine**: Sequential drive rounds (Round 1 to Round N) with strict candidate round gating.
- **Automated Passing Logic**: Implemented `cutoff_score`, `top_n`, `top_percent`, and `manual` evaluation modes.
- **Document Quotas**: Enforced file size limits optimized for university free-tier constraints (Resume $\le 1$MB, Certs $\le 800$KB, Avatars $\le 500$KB).
- **Persistent Sidebar Notifications**: Centralized notification feeds for students, admins, and recruiters.

---

## [2.0.0] - 2026-09-15

### Added
- **AI Assessment Builder**: Groq and Google Gemini automated MCQ question generation.
- **Computer Vision Anti-Cheat**: Client-side TensorFlow.js COCO-SSD object detection for live webcam feeds.
- **Tokenized Recruiter Invitations**: Direct Gmail SMTP relay dispatching onboarding links.

---

## [1.0.0] - 2026-08-01

### Added
- Initial release with Supabase GoTrue authentication, role-based routing, student profile creation, assessment scheduling, and basic admin oversight.
