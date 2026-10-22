# 📑 Product Requirements Document (PRD)
## Intelligent Placement Management System (IPMS Elite)

---

### Document Control
- **Document Version**: `3.0.0`
- **Product Name**: Intelligent Placement Management System (IPMS Elite)
- **Status**: Production Approved
- **Target Audience**: Product Managers, Engineering Leads, System Architects, QA Engineers, University Placement Officers
- **Last Updated**: October 2026

---

## 1. Executive Summary & Vision

University campus placements represent one of the most critical operational milestones for higher education institutions. However, conventional campus placement workflows are plagued by:
- Fragmented communications via spreadsheets, messaging channels, and manual email blasts.
- Inconsistent candidate credential verification and rampant resume inflation.
- Primitive, un-proctored online assessments prone to widespread tab-switching and external gadget cheating.
- Disconnected interview rounds lacking automated cutoff progression and real-time candidate status transparency.
- A complete lack of executive intelligence, forcing placement directors to guess placement statistics instead of querying real-time institutional databases.

**IPMS Elite** is an autonomous, forensic-grade, AI-orchestrated campus recruitment ecosystem designed to unify University Placement Offices, Visiting Enterprise Recruiters, and Student Candidates onto a synchronized, role-gated platform.

---

## 2. Problem Statement & User Personas

### 2.1 Problem Statement
Universities process hundreds of recruitment drives annually, involving thousands of students and dozens of visiting corporate recruiters. Placement offices struggle with manual eligibility screening, coordinating multi-round technical evaluations, preventing examination fraud, and compiling verifiable placement statistics for accreditation bodies (NAAC, NIRF).

### 2.2 User Personas

| Persona | Role | Primary Goals | Key Pain Points |
| :--- | :--- | :--- | :--- |
| **Asha / Hemanth** | Student Candidate (B.Tech) | Discover eligible company drives, verify resume, take proctored assessments, track drive stages in real time. | Anxiety over missed deadlines, lack of feedback on failed assessments, cumbersome document uploads. |
| **Prof. Sharma** | University Placement Director (Admin) | Onboard recruiters, author technical question banks with AI, monitor live exam proctoring, query institutional metrics via natural language. | Manual eligibility filtering, unverified candidate credentials, inaccurate placement reporting spreadsheets. |
| **Priya Mehta** | Lead Talent Acquisition Partner (Company) | Configure multi-round hiring pipelines (OA &rarr; Tech Interview &rarr; HR), evaluate candidate scores, set automated cutoffs, review verified candidate portfolios. | Sifting through unqualified applicants, lack of proctoring transparency, slow candidate round progression. |

---

## 3. Product Features & Functional Requirements

### 3.1 FR-01: Authentication, Authorization & Role-Based Access Control (RBAC)
- **FR-01.1**: The system shall support GoTrue secure authentication via email/password and institutional OAuth.
- **FR-01.2**: User roles shall be strictly enforced at the route level (`ProtectedRoute`) and database level (Row Level Security):
  - `student`: Access restricted to `/dashboard/*`.
  - `admin`: Access restricted to `/admin/*`.
  - `company`: Access restricted to `/company/*`.
- **FR-01.3**: Inactive sessions shall trigger an automatic warning after 25 minutes of inactivity and auto-logout at 30 minutes (`useSessionTimeout`).

### 3.2 FR-02: Student Profile Studio & Document Verification
- **FR-02.1**: Students shall maintain a comprehensive portfolio including basic personal info, degree, branch, CGPA, graduation year, skills tags, and verified project links.
- **FR-02.2**: The system shall enforce strict storage quotas optimized for university free-tier constraints (150 students / 1 GB storage):
  - Resumes: Maximum file size **1 MB** (PDF, DOCX).
  - Certificates: Maximum file size **800 KB** (PDF, PNG, JPG).
  - Profile Avatars: Maximum file size **500 KB** (PNG, JPG, WEBP).
- **FR-02.3**: External profile URLs (LinkedIn, GitHub, LeetCode, HackerRank) shall be auto-normalized to include `https://` protocols to prevent relative navigation errors.
- **FR-02.4**: The system shall calculate a dynamic Profile Completion Percentage (0-100%) and reward 100% completion with a verified credential badge.

### 3.3 FR-03: Assessment Engine & AI Question Bank Generation
- **FR-03.1**: Administrators and recruiters shall create customized assessments with titles, durations, pass criteria, and scheduled timestamps.
- **FR-03.2**: The system shall integrate Groq and Google Gemini 2.5 Flash to automatically synthesize high-quality multiple-choice questions (MCQs) given subject, topic, and difficulty.
- **FR-03.3**: The AI generator shall strictly output structured JSON arrays and include automated deduplication filters to reject malformed responses with duplicate keys.
- **FR-03.4**: Test authors shall upload DOCX/PDF syllabus files, automatically parsed via `mammoth` and `pdfjs-dist` to populate question banks.
- **FR-03.5**: Test authors shall assign custom mark weights per question. Total test marks shall be the dynamic sum of all question weights.
- **FR-03.6**: Assessment deletion shall require an interactive confirmation modal (`AlertDialog`) to prevent accidental data loss.

### 3.4 FR-04: Real-Time Computer Vision & Anti-Cheat Proctoring Engine
- **FR-04.1**: Assessments shall enforce fullscreen lock; exiting fullscreen triggers high-priority warning dialogs.
- **FR-04.2**: The exam engine shall monitor window blur and tab switches via the HTML5 Page Visibility API:
  - Tab Switch 1: Warning audio chime and counter overlay (1/3).
  - Tab Switch 2: High-priority warning overlay (2/3).
  - Tab Switch 3: Immediate exam lockout and automated submission (`auto_submitted = true`).
- **FR-04.3**: Client-side computer vision utilizing TensorFlow.js and COCO-SSD shall inspect webcam video frames locally without transmitting raw video feeds to external servers:
  - Detects `cell phone`, `tablet`, or unauthorized digital devices with > 65% confidence.
  - Detects absence of face or multiple faces in the video frame.
  - Automatically records timestamped violations into `proctor_events` JSON array.
- **FR-04.4**: Gadget detection alarms shall operate universally across all tests without opt-out toggles.

### 3.5 FR-05: Proctor Integrity Score & Forensic Audit Modals
- **FR-05.1**: For every completed exam attempt, the system shall compute an institutional Proctor Integrity Score $S \in [0, 100]$:
  $$S = \max\left(0, \min\left(100, 100 - (N_{\text{tabs}} \times 15) - (G_{\text{gadget}} \times 40)\right)\right)$$
- **FR-05.2**: If a test is terminated due to cheat threshold auto-submission, $S \le 20$.
- **FR-05.3**: Administrators and recruiters shall have a "View Proctor Summary" button opening a forensic modal displaying the candidate's score, tab-switch count, gadget timeline, and integrity status (`Clean`, `Warning`, `Flagged Cheat`).

### 3.6 FR-06: Multi-Round Recruitment Drive Pipeline & Access Gating
- **FR-06.1**: Recruiters shall structure recruitment drives into sequential rounds (e.g. Round 1: OA &rarr; Round 2: Tech Interview &rarr; Round 3: HR).
- **FR-06.2**: The system shall support four automated passing logic engines:
  - `cutoff_score`: Candidates with score $\ge$ cutoff qualify.
  - `top_n`: Top $N$ highest scoring candidates qualify.
  - `top_percent`: Top $P\%$ of candidates qualify.
  - `manual`: Recruiter manually evaluates and tags candidates.
- **FR-06.3**: Strict round gating shall prevent any candidate who is `not_qualified` or `absent` in Round $K - 1$ from attempting Round $K$.
- **FR-06.4**: When `auto_progress = true`, publishing round results shall automatically enroll qualified candidates into the subsequent round.

### 3.7 FR-07: Placement AI Oracle & Live Telemetry Assistant
- **FR-07.1**: The Placement AI Assistant (`/admin/ai`, `/company/ai`, and dashboard modal) shall have verified, live database context via Supabase PostgREST.
- **FR-07.2**: The assistant shall accurately report total registered students, test attendees, passed candidates, failed candidates, and placed candidates without hallucinating missing data.
- **FR-07.3**: The assistant shall render interactive Recharts Bar Charts and KPI metric cards directly within chat messages.
- **FR-07.4**: Tables generated by the AI shall be parsed with `remark-gfm` and styled with responsive borders, zebra striping, and header typography.
- **FR-07.5**: When queried about candidate eligibility, the AI shall evaluate student CGPA, branch, and backlogs against registered company cutoffs and output clean eligibility tables.

### 3.8 FR-08: Persistent Real-Time Notifications Feed
- **FR-08.1**: All three user roles shall have a dedicated "Notifications" navigation item in the left sidebar with unread badge counters.
- **FR-08.2**: Notification history shall remain permanently stored in the database until explicitly deleted by the user.
- **FR-08.3**: Users shall filter notifications by categories: `All`, `Companies & Drives`, `Assessments`, and `Rounds & Results`.

---

## 4. Non-Functional Requirements (NFRs)

### 4.1 Performance & Latency
- **NFR-01**: Single Page Application initial page load (FCP) shall be $\le 1.8$ seconds on standard 4G/broadband connections.
- **NFR-02**: Client-side COCO-SSD object detection inference shall execute at $\ge 5$ FPS with $< 150$ms latency per frame.
- **NFR-03**: Database queries for dashboard summaries shall respond within $\le 350$ms.

### 4.2 Security & Data Protection
- **NFR-04**: All database queries must be protected by PostgreSQL Row Level Security (RLS). Students cannot access peer records.
- **NFR-05**: All external communications must use TLS 1.3 encryption.
- **NFR-06**: Privacy-Preserving Computer Vision: Webcam video frames must never be streamed or saved to disk; all inference occurs in local browser GPU memory.

### 4.3 Scalability & Reliability
- **NFR-07**: System shall support concurrent assessment execution for up to 1,000 students simultaneously.
- **NFR-08**: Application uptime SLA shall target 99.9% availability during active university placement seasons.

---

## 5. System Architecture & Technical Specifications

```
+----------------------------------------------------------------------------------+
|                            Presentation Layer (SPA)                              |
| React 18.3 • TypeScript 5.8 • Vite 5.4 • Tailwind CSS v3 • shadcn/ui • Radix UI  |
+----------------------------------------+-----------------------------------------+
                                         |
                       PostgREST / WebSocket Realtime
                                         |
+----------------------------------------v-----------------------------------------+
|                        Data & Authentication Layer                               |
|        Supabase PostgreSQL 15 • GoTrue Auth • Storage Buckets • Row Level Security|
+----------------------------------------+-----------------------------------------+
                                         |
                       Edge Proxy & External Relay APIs
                                         |
+----------------------------------------v-----------------------------------------+
|                        AI Inference & Utility Layer                              |
| TensorFlow.js (COCO-SSD) • Google Gemini 2.5 Flash • Groq LLM • Nodemailer SMTP  |
+----------------------------------------------------------------------------------+
```

---

## 6. Assumptions & Constraints
- Students possess a standard laptop or desktop with working webcam and microphone.
- Modern web browser support (Google Chrome 110+, Microsoft Edge 110+, Mozilla Firefox 115+, Safari 16+).
- University administration maintains valid Supabase and Google Gemini / Groq API quotas.

---

## 7. Product Release Roadmap

### Version 3.0 (Current Production Release)
- [x] Multi-round recruitment drive engine with sequential gating.
- [x] Computer vision proctoring engine with universal gadget detection.
- [x] Placement AI Assistant with interactive Recharts bar charts and KPI metric cards.
- [x] Persistent sidebar notifications with category filtering.
- [x] Automated test suite (14 suites, 67 unit/integration tests).
- [x] GitHub Actions CI/CD pipelines (`ci.yml`, `backend-test.yml`, `deploy.yml`).

### Version 3.1 (Upcoming Q1 2027)
- [ ] Gaze-tracking model integration (WebGazer.js) to flag prolonged off-screen looking.
- [ ] Real-time interview video room with automated live transcription.
- [ ] Native mobile applicant companion app (React Native / PWA).
