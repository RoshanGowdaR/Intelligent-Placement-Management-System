# 📋 Master Software Test Plan (IEEE 829 Standard)
## Intelligent Placement Management System (IPMS Elite)

---

### Document Control
- **Document ID**: `IPMS-STP-2026-V1.0`
- **Project**: Intelligent Placement Management System (IPMS Elite)
- **Author**: Lead QA & System Engineering Team
- **Status**: Approved & Active
- **Target Release**: Campus Recruitment Cycle 2026

---

## 1. Introduction & Executive Summary

The **Intelligent Placement Management System (IPMS Elite)** is a full-stack, mission-critical university campus placement platform. It provides role-gated interfaces for three distinct personas:
1. **Student Candidates**: Profile creation, resume/certificate verification, assessment enrollment, real-time AI-proctored test execution, drive round tracking, and notifications.
2. **Placement Administrators**: Institutional oversight, company registration & invitations, AI-assisted question generation, exam scheduling, live proctoring audit trails, candidate forensics, and AI placement analytics.
3. **Visiting Recruiters / Companies**: Multi-round drive pipeline management, custom assessment cutoffs, applicant evaluation, round progression (gating), and hiring analytics.

This Master Test Plan defines the formal testing strategy, execution methodology, pass/fail criteria, risk mitigation, and automated CI/CD integration to ensure flawless operation under real-world campus recruitment conditions.

---

## 2. Test Scope & Boundaries

### 2.1 In-Scope Functional Modules
- **Authentication & RBAC**: GoTrue OAuth, Email/Password login, session timeout enforcement, role-based route gating (`ProtectedRoute`), and password reset OTP workflows.
- **Student Profile Studio**: 100% completion metrics, document verification quotas (Resume ≤ 1 MB, Certificates ≤ 800 KB, Avatars ≤ 500 KB), LinkedIn/GitHub URL normalization, and lateral entry handling.
- **Assessment Management**: Manual question authoring, Groq & Google Gemini AI question generation (JSON array formatting), DOCX/PDF syllabus parsing, question weighting, and scheduling.
- **Computer Vision & Anti-Cheat Proctoring Engine**: Fullscreen enforcement, multi-display & window blur detection, tab-switch telemetry counter, TensorFlow.js (COCO-SSD) webcam device/cellphone detection, cheat threshold auto-submission, and proctor integrity score calculation (out of 100).
- **Multi-Round Recruitment Drive Engine**: Drive round sequencing (Round 1 to Round N), passing logic engines (`cutoff_score`, `top_n`, `top_percent`, `manual`), round participant gating, and automated qualification notifications.
- **Placement AI Assistant (Oracle)**: Live forensic database context gathering (Supabase PostgREST), Remark-GFM Markdown rendering, interactive Recharts bar charts, KPI metric cards, and candidate proctoring audit cards.
- **Real-Time Notification System**: Persistent cross-role notification feeds, unread counters, category filtering, and bulk clearance.
- **Institutional Analytics & Reports**: Live pass/fail ratios, company CTC comparisons, podium student rankings, and PDF report downloads.

### 2.2 Out-of-Scope
- Physical hardware webcam hardware driver failures on client machines.
- Institutional ISP outages external to Supabase cloud hosting.

---

## 3. Test Strategy & Quality Levels

```
                   ▲
                  / \     E2E / Exploratory Testing (Cypress / Manual UI)
                 /   \    Role-based user journeys, negative boundary tests
                /-----\
               /       \   Integration & Service Tests (Vitest)
              /         \  Drive Engine, RLS, PostgREST, Post-hoc Scoring
             /-----------\
            /             \  Unit Tests (Vitest + RTL)
           /               \ Pure math, anti-cheat rules, URL normalization, state machines
          /-----------------\
         /                   \ Static Analysis & Quality Gates
        /_____________________\ TypeScript (tsc --noEmit), ESLint, GitHub Actions CI
```

### 3.1 Static Code Analysis & Type Safety
- **Tool**: TypeScript compiler (`tsc --noEmit`), ESLint with React Hooks & TypeScript rules.
- **Requirement**: Zero type errors (`TS0000`), zero undeclared variables.

### 3.2 Unit Testing
- **Framework**: Vitest 3.x.
- **Focus**: Pure utility functions, state machine transitions (`RoundStateMachine.test.ts`), passing criteria logic (`PassingLogic.test.ts`), scoring algorithms (`TestScoring.test.ts`), and anti-cheat event handlers (`AntiCheat.test.ts`).

### 3.3 Integration & Security Testing
- **Focus**: Supabase Row Level Security (RLS) policies, session timeout handling (`SessionTimeout.test.ts`), round access gating (`RoundGating.test.ts`), and AI Context database payload synthesis (`AIAssistantContext.test.ts`).

### 3.4 System & Exploratory Testing
- **Focus**: Unscripted exploratory sessions, rapid user inputs, edge-case file uploads, concurrent exam attempts, and intentional cheating triggers (e.g., deliberate tab switching, secondary monitor detection, holding smartphone in camera view).

---

## 4. Test Environment & Infrastructure

| Environment | URL / Host | Purpose | Database |
| :--- | :--- | :--- | :--- |
| **Local Dev** | `http://localhost:5173` | Developer unit & feature testing | Supabase Development Instance |
| **CI Runner** | GitHub Actions (`ubuntu-latest`) | Automated lint, build & test suites | Mock Supabase Client / InMemory Test Harness |
| **Staging** | Vercel Preview Deployments | Exploratory and multi-user testing | Supabase Shared Testing Sandbox |
| **Production** | Vercel Production Domain | Live recruitment drives | Supabase Production Tier (PostgreSQL 15) |

---

## 5. Entry & Exit Criteria

### 5.1 Entry Criteria (Phase Gate)
- Git branch cleanly compiles with `npm run build`.
- Zero TypeScript syntax or typecheck errors (`npm run typecheck`).
- Dependencies successfully installed without peer dependency conflicts.

### 5.2 Exit Criteria (Release Readiness)
- 100% of Vitest unit and integration test suites pass (`npm test -- --run`).
- Zero High/Critical security vulnerabilities in `npm audit`.
- Manual test execution matrix has 100% execution rate with 0 open Critical/High severity defects.
- All 3 user roles (Student, Admin, Recruiter) validated across core journeys.
- Placement AI Assistant correctly returns forensic student rosters, proctor scores, and renders interactive Recharts charts without formatting anomalies.

---

## 6. Defect Severity & Escalation Hierarchy

| Severity | Definition | Target Resolution Time | Example |
| :--- | :--- | :--- | :--- |
| **S1 - Critical** | System crash, data corruption, security breach, inability to submit exam | < 2 Hours | Test answers not persisting to Supabase; exam lock failure |
| **S2 - High** | Major feature broken with no workaround; cheating bypass | < 6 Hours | Camera object detection fails to flag cellphones; round gating permits rejected candidates |
| **S3 - Medium** | Feature works but with cosmetic/UI flaw or partial degradation | < 24 Hours | Markdown table renders unstyled; chart tooltip misalignment |
| **S4 - Low** | Minor visual glitch, typo, or minor performance notice | Next Sprint | Badge color contrast inconsistency; spacing in table rows |

---

## 7. Deliverables & Artifacts
1. **`TEST_PLAN.md`**: Master Test Plan (this document).
2. **`MANUAL_TESTING.md`**: Detailed Test Cases & Execution Matrix (50+ cases).
3. **`EXPLORATORY_TESTING.md`**: Exploratory testing charters, negative input logs, and historical bug reports.
4. **`docs/TECHNICAL_DOCUMENTATION.md`**: Complete system technical blueprint.
5. **`.github/workflows/ci.yml`**: Continuous Integration automation pipeline.
6. **`.github/workflows/backend-test.yml`**: Backend & database logic test pipeline.
7. **`.github/workflows/deploy.yml`**: Continuous Deployment pipeline.
