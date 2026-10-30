# 📘 System Technical Documentation & Architectural Blueprint
## Intelligent Placement Management System (IPMS Elite)

---

### Document Information
- **Title**: IPMS Elite Technical Architecture & System Blueprint
- **Version**: 3.1.0 (Enterprise Campus Edition)
- **Target Audience**: Software Engineers, DevOps, System Architects, QA Engineers
- **Maintainers**: Core Platform Engineering Team

---

## 1. System Architecture & High-Level Blueprint

```
                                  +------------------------------------+
                                  |         Web Clients (SPA)          |
                                  | React 18 + Vite + Tailwind + Radix |
                                  +-----------------+------------------+
                                                    |
                                HTTPS / WSS / REST / PostgREST (SSL/TLS)
                                                    |
               +------------------------------------+------------------------------------+
               |                                    |                                    |
+--------------v---------------+    +---------------v----------------+   +---------------v---------------+
|          Supabase            |    |       Vercel Serverless        |   |           AI Engines          |
| • PostgreSQL 15 Database     |    | • /api/gemini (Proxy & Relay)  |   | • Groq (Primary API)          |
| • Row Level Security (RLS)   |    | • /api/send-email (SMTP Relay) |   | • Google Gemini 2.5 Flash     |
| • GoTrue Auth (JWT/OAuth)    |    | • Environment Variable Vault   |   | • Fallback Affinities         |
| • Storage Buckets & Realtime |    +--------------------------------+   +-------------------------------+
+------------------------------+
```

### 1.1 Architectural Layers

1. **Presentation Layer (Frontend Single Page Application)**:
   - **Framework**: React 18.3 with Vite 5.4 bundling for rapid HMR and optimized production treeshaking.
   - **Routing**: React Router DOM v6 with route-level security via `ProtectedRoute` enforcing role access (`student`, `admin`, `company`).
   - **State & Server Cache Management**: TanStack React Query v5 with optimistic UI updates and automated invalidation.
   - **Component System**: shadcn/ui built on headless Radix UI primitives for full keyboard navigation and WAI-ARIA compliance.
   - **Client-Side Neural Network**: TensorFlow.js (`@tensorflow/tfjs` v4.22) running the COCO-SSD object detection model in browser memory for privacy-preserving webcam analysis.
   - **Data Visualization**: Recharts v2.15 for interactive responsive charts; ReactMarkdown v10 with Remark-GFM v4 for formatted tables and KPI cards.

2. **Serverless API Relay Layer (Vercel Functions)**:
   - **`/api/gemini`**: Node.js edge proxy that routes LLM requests between Groq and Google Gemini 2.5 Flash with automatic key rotation and fallback handling. Prevents exposing secret API keys to client browsers.
   - **`/api/send-email`**: Direct Nodemailer IPv4 transport for automated placement drive notifications and student invitations.

3. **Database & Persistence Layer (Supabase / PostgreSQL 15)**:
   - Relational schema enforcing referential integrity across students, recruiters, assessments, attempts, and drives.
   - Row Level Security (RLS) policies evaluated at database engine level.
   - Storage buckets with strict file size and MIME-type restrictions.

---

## 2. Database Schema & Data Dictionary

### 2.1 Core Tables

#### `profiles`
Stores student candidate academic records, credentials, and verification links.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, References `auth.users(id)` | User unique identifier |
| `name` | `text` | Nullable | Full name of candidate |
| `email` | `text` | Nullable | Primary institutional email |
| `usn` | `text` | Unique, Nullable | University Seat Number |
| `branch` | `text` | Nullable | Academic department (CSE, ISE, ECE, etc.) |
| `cgpa` | `numeric` | Nullable | Cumulative Grade Point Average (0.00 to 10.00) |
| `backlogs` | `integer` | Default `0` | Active academic backlog count |
| `profile_completion_percentage` | `integer` | Default `0` | Profile meter metric (0-100%) |
| `resume_url` | `text` | Nullable | Supabase storage URL (quota ≤ 1 MB) |
| `skills` | `text[]` | Default `[]` | Technical skill tags |
| `certifications` | `jsonb` | Default `[]` | Array of credentials and document links |
| `marks_cards` | `jsonb` | Default `[]` | Semester-wise marks card URLs |
| `linkedin_url` | `text` | Nullable | Normalized LinkedIn profile URL |
| `github_url` | `text` | Nullable | Normalized GitHub portfolio URL |

#### `companies`
Stores visiting recruiters, recruitment quotas, and eligibility rules.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, Default `gen_random_uuid()` | Company unique identifier |
| `name` | `text` | Not Null | Corporate entity name (e.g. Google, Microsoft) |
| `job_role` | `text` | Nullable | Designation (e.g. Software Development Engineer) |
| `salary_package` | `text` | Nullable | Compensation range (e.g. 24 - 32 LPA) |
| `job_location` | `text` | Nullable | Work location (e.g. Bengaluru, Remote) |
| `eligibility_criteria` | `jsonb` | Nullable | JSON specifying `min_cgpa`, cutoff thresholds |
| `allowed_branches` | `text[]` | Nullable | Array of eligible departments |
| `max_backlogs` | `integer` | Default `0` | Maximum permissible backlogs |
| `contact_info` | `jsonb` | Nullable | HR contact email, phone, and metadata |
| `user_id` | `uuid` | References `auth.users(id)` | Recruiter account owner |

#### `tests`
Stores technical, aptitude, and coding assessments.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, Default `gen_random_uuid()` | Test unique identifier |
| `title` | `text` | Not Null | Assessment title |
| `company_id` | `uuid` | FK, References `companies(id)` | Sponsoring company (or null for campus-wide) |
| `duration` | `integer` | Not Null, Default `60` | Duration in minutes |
| `scheduled_date` | `timestamptz` | Not Null | Start timestamp |
| `registration_deadline` | `timestamptz` | Nullable | Registration cutoff timestamp |
| `question_bank` | `jsonb` | Not Null, Default `[]` | Array of questions with marks and answers |
| `pass_criteria` | `jsonb` | Nullable | JSON specifying `min_score_percent` |
| `proctor_config` | `jsonb` | Nullable | Anti-cheat flags (gadgets, tab switches) |

#### `test_attempts`
Stores candidate test submissions, forensic proctoring logs, and integrity scores.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, Default `gen_random_uuid()` | Attempt unique identifier |
| `test_id` | `uuid` | FK, References `tests(id)` | Associated assessment |
| `student_id` | `uuid` | FK, References `profiles(id)` | Candidate who took the test |
| `total_score` | `numeric` | Nullable | Total marks earned |
| `passed` | `boolean` | Default `false` | Pass/Fail determination |
| `tab_switches` | `integer` | Default `0` | Number of detected tab switch violations |
| `auto_submitted` | `boolean` | Default `false` | True if terminated due to cheat threshold |
| `proctor_events` | `jsonb` | Default `[]` | Timestamped log of gadget/face detection events |
| `answers` | `jsonb` | Nullable | Candidate response map |
| `completed_at` | `timestamptz` | Nullable | Submission timestamp |

#### `drive_rounds` & `round_participants`
Stores multi-round sequential hiring pipelines and student qualification status.
- `drive_rounds`: `id`, `company_id`, `round_number`, `round_name`, `round_type`, `passing_logic` (`cutoff_score`, `top_n`, `top_percent`, `manual`), `passing_value`, `auto_progress`.
- `round_participants`: `id`, `drive_round_id`, `student_id`, `status` (`pending`, `qualified`, `not_qualified`, `absent`), `score`, `evaluated_at`.

---

## 3. Computer Vision & Anti-Cheat Proctoring Pipeline

```
[Webcam Stream] ──► [TensorFlow.js COCO-SSD] ──► Object Classification
                                                       │
                                 ┌─────────────────────┴─────────────────────┐
                                 ▼                                           ▼
                       Object: "cell phone"                        Face Count != 1
                                 │                                           │
                                 ▼                                           ▼
                      [Gadget Alarm Audio]                       [Proctor Warning Overlay]
                                 │                                           │
                                 └─────────────────────┬─────────────────────┘
                                                       ▼
                                            [Log to proctor_events]
                                                       │
[Window Blur / Tab Switch] ───────────────► [tab_switches += 1]
                                                       │
                                                       ▼
                                             Is tab_switches >= 3?
                                             ├── Yes ──► [Lock & Auto-Submit]
                                             └── No  ──► [Display Warning (N/3)]
```

### 3.1 Proctor Integrity Score Formula
For any candidate attempt, the system computes a standardized Proctor Integrity Score $S \in [0, 100]$:

$$S = \max\left(0, \min\left(100, 100 - (N_{\text{tabs}} \times 15) - (G_{\text{gadget}} \times 40)\right)\right)$$

Where:
- $N_{\text{tabs}}$ is the number of tab switches recorded.
- $G_{\text{gadget}} = 1$ if any digital gadget or cellphone is detected; $0$ otherwise.
- If $A_{\text{auto\_submitted}} = \text{true}$ (test locked for cheating), then $S \le 20$.

**Integrity Status Classification**:
- $S \ge 85$: **Clean / Valid**
- $60 \le S < 85$: **Warning / Suspicious**
- $S < 60$: **Flagged Cheat / High Risk**

---

## 4. Multi-Round Drive Engine & Sequential Gating

```
Round 1: Online Assessment (Cutoff ≥ 60%)
   ├── Candidate Passed (Score: 78%) ──► Qualified ──► Enrolled in Round 2
   └── Candidate Failed (Score: 42%) ──► Not Qualified ──► GATED (Access Blocked)
                                                                 │
                                                                 ▼
Round 2: Technical Interview (Top N: 2)
   ├── Qualified Candidates Evaluated ──► Top 2 Selected ──► Round 3 (HR Drive)
   └── Remaining Candidates ──► Not Qualified
```

### 4.1 Access Gating Rule
Before any student can access assessment or meeting links for Round $K > 1$:
1. The system checks `round_participants` for Round $K - 1$.
2. If `status != "qualified"`, access is strictly denied with an unbypassable dialog.

---

## 5. Placement AI Assistant (Oracle) Architecture

### 5.1 Context Synthesis Pipeline
1. **Database Forensic Extraction**: When the user queries the AI, `gatherRoleDatabaseContext` queries `profiles`, `companies`, `tests`, `test_attempts`, `drive_rounds`, and `round_participants`.
2. **Aggregation**: Computes unique registered students, exam attendees, passers, failers, and placed candidates.
3. **Candidate Directory**: Maps every student's CGPA, branch, and backlogs to registered company cutoffs.
4. **Proctor Logs**: Maps every attempt to its calculated Proctor Integrity Score and violation summary.
5. **Charts-on-Demand Policy**: LLM system prompt mandates that Recharts bar charts are produced IF AND ONLY IF the user explicitly prompts for a chart, preventing unsolicited visual clutter.
6. **Client-Side Rendering**: ReactMarkdown parses tables with `remark-gfm` and dynamically renders Recharts BarCharts and Proctor Gauge cards directly within the chat message.

### 5.2 Think Mode Architecture & Collapsible Forensic Cards
When Deep Thinking mode is enabled:
1. The client prepends a directive commanding the LLM to output its architectural decomposition inside `<think>...</think>` tags.
2. `parseThinkTags(raw)` decomposes the response into `{ thought: string | null, cleanText: string }`.
3. `thought` is rendered inside an interactive collapsible `<Accordion>` labelled *"Forensic Reasoning & Thought Process"*, while `cleanText` renders directly in the main message stream.

### 5.3 Student AI Mentor Privacy Isolation
1. **Query Filter Interceptor**: Incoming queries on `StudentAIAssistant.tsx` pass through a regex pattern guard scanning for cross-candidate inquiries (e.g. `who else`, `highest score`, `class rank`, `database dump`).
2. **Deterministic Security Rejection**: Flagged queries are halted before reaching the network with a privacy protection alert: *"As a student, you only have access to your personal assessment records and career eligibility."*
3. **Scoped System Prompt**: The LLM prompt is strictly bounded to the authenticated student's record (`id = user.id`) and visiting recruiters, disallowing institutional table access.

---

## 6. Session-Scoped State Persistence Engine (`usePersistentState`)

To eliminate filter and pagination resets during cross-portal navigation:
- Hook signature: `usePersistentState<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void]`
- Utilizes browser `sessionStorage` with key namespaces (`ipms_reports_*`, `ipms_analytics_*`).
- Automatically serializes JSON on write and safely hydrates on component mounting with memory fallback.

---

## 7. Assessment Pre-Flight Proctoring Gate (`ProctorGateModal`)

### 7.1 Browser User-Gesture Security Compliance
The HTML5 Fullscreen API (`Element.requestFullscreen()`) strictly requires a transient user gesture token. In previous implementations, invoking `await getUserMedia()` before `requestFullscreen()` consumed the activation window, throwing `SecurityError`.

### 7.2 Two-Stage Pre-Flight Gate Architecture
1. **Stage 1: Camera Streaming Verification**:
   - `navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })` streams to a live video canvas preview.
   - Status badge transitions from `Verifying Camera…` to `Camera Connected`.
2. **Stage 2: Synchronous Fullscreen Launch**:
   - The "Grant Fullscreen & Begin Assessment" button synchronously calls `document.documentElement.requestFullscreen()` as the first statement in its `onClick` callback.
   - Active stream is handed off to `WebcamProctor.tsx` and test timer initiates.

### 7.3 In-Test Screen Lockout & Anti-Cheat Guard
- If fullscreen exits during the exam (`fullscreenchange` event), `isFullscreenLocked = true` immediately overlays an opaque security lockout shield blocking all question cards.
- During test taking (`/dashboard/tests`), the floating AI assistant widget is unmounted from `DashboardLayout.tsx` to prevent candidates from asking AI for answers.

---

## 8. Continuous Integration & Deployment (CI/CD)

### 8.1 GitHub Actions Workflows
- **`ci.yml`**:
  - Triggers on push and pull requests on `main` and `developer`.
  - Runs `tsc --noEmit` typecheck, ESLint, Vitest test suite (71 tests across 15 suites), and production Vite build verification.
- **`backend-test.yml`**:
  - Triggers on changes to backend services and migrations.
  - Executes recruitment engine, proctor scoring, and eligibility test suite (`npm run test:backend`).
  - Validates SQL migration syntax.
- **`deploy.yml`**:
  - Executes pre-deployment validation gates on `main` branch before triggering production deployment.
