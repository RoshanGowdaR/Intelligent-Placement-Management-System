# 📘 System Technical Documentation & Architectural Blueprint
## Intelligent Placement Management System (IPMS Elite)

---

### Document Information
- **Title**: IPMS Elite Technical Architecture & System Blueprint
- **Version**: 2.5 (Enterprise Campus Edition)
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
5. **LLM Synthesis**: Submits prompt to Google Gemini / Groq with instructions to return:
   - Visual ````kpi` metric blocks.
   - Visual ````chart` bar chart payloads for Recharts.
   - Individual candidate ````proctor` cards.
   - Formatted Markdown tables using GitHub Flavored Markdown.
6. **Client-Side Rendering**: ReactMarkdown parses tables with `remark-gfm` and dynamically renders Recharts BarCharts and Proctor Gauge cards directly within the chat message.

---

## 6. Continuous Integration & Deployment (CI/CD)

### 6.1 GitHub Actions Workflows
- **`ci.yml`**:
  - Triggers on push and pull requests on `main` and `developer`.
  - Runs `tsc --noEmit` typecheck, ESLint, Vitest test suite (62 tests), and production Vite build verification.
- **`backend-test.yml`**:
  - Triggers on changes to backend services and migrations.
  - Executes recruitment engine, proctor scoring, and eligibility test suite (`npm run test:backend`).
  - Validates SQL migration syntax.
- **`deploy.yml`**:
  - Executes pre-deployment validation gates on `main` branch before triggering production deployment.
