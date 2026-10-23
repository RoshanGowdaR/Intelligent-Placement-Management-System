# 🕵️ Exploratory Testing & Bug Investigation Report
## Intelligent Placement Management System (IPMS Elite)

---

## 1. Exploratory Testing Methodology & Charters

Exploratory testing was conducted following timeboxed session charters to examine real-world edge behaviors, intentional cheating triggers, boundary input failures, and UI interactions.

---

### ⏱️ Session Charter 1: Student Profile Studio & Document Boundary Stress

- **Charter Goal**: Evaluate profile form input resilience, file upload quota enforcement, and URL formatting edge cases.
- **Tester Role**: Student Candidate (`hemanth@univ.edu`)
- **Duration**: 45 Minutes

#### Scenarios & Edge Cases Tested:
1. **Oversized Resume File**:
   - *Action*: Uploaded a 4.2 MB scanned PDF resume.
   - *Behavior*: Rejected immediately on client-side before network upload with toast error: `"File size exceeds 1MB limit for resumes"`. Network tab confirmed 0 bytes sent to Supabase storage.
2. **Unsupported File Extensions**:
   - *Action*: Attempted uploading `.exe` and `.zip` disguised as certificates.
   - *Behavior*: File picker restricted to `.pdf`, `.png`, `.jpg`. Manual drag-and-drop blocked by mime-type validation.
3. **Malformed External URLs**:
   - *Action*: Entered `linkedin.com/in/hemanth-dev`, `https://github.com/hemanth`, `www.leetcode.com/hemanth`, and plain string `hemanth_profile`.
   - *Behavior*: Sanitizer prepends `https://` protocol if missing; clicking external icon opens direct profile in a new tab without navigation loops.
4. **Rapid Re-clicking / Double-Submit**:
   - *Action*: Rapidly clicked "Save Profile" 5 times in 1 second.
   - *Behavior*: Button disabled during async mutation with loading spinner; single database write confirmed in Supabase audit logs.

---

### ⏱️ Session Charter 2: Exam Proctoring Evasion & Integrity Triggers

- **Charter Goal**: Stress-test anti-cheat engine by attempting common student exam evasion techniques.
- **Tester Role**: Test Taker (`candidate_exam_user`)
- **Duration**: 60 Minutes

#### Scenarios & Evasion Attempts Tested:
1. **Tab Switch & Window Blur (Alt+Tab)**:
   - *Action*: While exam was active, switched to another browser tab (`Ctrl+Tab`) and pressed `Alt+Tab` to switch applications.
   - *Behavior*: Exam screen immediately displayed high-priority red warning dialog with sound: `"Warning: Tab switch detected! (1/3)"`.
   - *Result*: Incremented `tab_switches` counter from 0 to 1, then from 1 to 2.
2. **Cheating Threshold Auto-Submission**:
   - *Action*: Switched tabs a 3rd time to trigger limit.
   - *Behavior*: Test locked immediately; form inputs disabled; exam auto-submitted with `auto_submitted: true`. Candidate redirected to score report.
3. **Cell Phone / Digital Gadget Evasion**:
   - *Action*: Held an iPhone in camera view while reading questions.
   - *Behavior*: TensorFlow.js COCO-SSD neural network detected `cell phone` with 78% confidence score; logged event to `proctor_events` JSON array and triggered audio alert.
4. **Camera Lens Occlusion**:
   - *Action*: Covered webcam lens with dark tape.
   - *Behavior*: Zero faces detected event triggered warning: `"No face detected in video feed. Please stay in camera view."`.
5. **Universal Gadget Enforcement**:
   - *Action*: Verified that exam creator does not allow disabling specific gadgets.
   - *Behavior*: Gadget detection operates universally across all tests for smartwatches, mobile phones, and audio devices.

---

### ⏱️ Session Charter 3: Multi-Round Recruitment Drive & Round Gating

- **Charter Goal**: Verify sequential recruitment drive pipelines, automated passing calculations, and strict round gating.
- **Tester Role**: Recruiter & Student
- **Duration**: 45 Minutes

#### Scenarios Tested:
1. **Round 1 (Online Assessment) Execution**:
   - *Action*: Set cutoff score = 60%. Candidate scored 22% (Failed).
   - *Behavior*: Candidate marked `not_qualified` in `round_participants`.
2. **Access Gating to Round 2 (Technical Interview)**:
   - *Action*: Failed candidate attempted to open Round 2 test URL directly via browser address bar.
   - *Behavior*: Access strictly blocked; dialog displayed: `"Access Gated: Candidate status is not_qualified in Round 1."`.
3. **Top N Passing Logic**:
   - *Action*: Evaluated 5 candidates with `top_n: 2`. Scores: [95, 88, 82, 70, 65].
   - *Behavior*: Exactly top 2 candidates marked `qualified`; automated notification dispatched to their notification inbox.

---

### ⏱️ Session Charter 4: Placement AI Assistant Forensic Querying & Table Styling

- **Charter Goal**: Query AI assistant in Admin and Recruiter portals to verify live database fidelity, proctor scoring, and formatting.
- **Tester Role**: Placement Administrator (`admin@univ.edu`)
- **Duration**: 40 Minutes

#### Scenarios Tested:
1. **Querying Placement Summary**:
   - *Prompt*: *"Give me the placement summary"*
   - *Output*: Returned 5 KPI cards + interactive Recharts Bar Chart (Registered: 9, Attended: 1, Passed: 0, Failed: 1, Placed: 0).
2. **Querying Candidate Exam Attendance**:
   - *Prompt*: *"Who attended the exams and what were the scores?"*
   - *Output*: Rendered Markdown table with Candidate Name: Hemanth, Score: 22, Result: Failed, Proctor Score: 70/100 (2 tab switches flagged).
3. **Markdown Table Styling**:
   - *Behavior*: Clean HTML table with borders, zebra striping, and header styling. No collapsed raw pipe strings.

---

## 2. Formal Bug Reports & Defect Log

### 🐛 BUG-001: Supabase PostgREST Column Mismatch in AI Assistant Context
- **Severity**: S1 - Critical
- **Component**: `src/pages/ai/PlacementAIChat.tsx` & `src/components/assistant/AdminAIAssistant.tsx`
- **Symptom**: AI Assistant claimed 0 companies registered, 0 tests conducted, and no student profile data stored, despite active records in database.
- **Root Cause**:
  `gatherRoleDatabaseContext` queried non-existent columns:
  - `companies.min_cgpa` & `companies.hr_name` (actual: in `eligibility_criteria` JSONB)
  - `tests.category` & `tests.pass_percentage` (actual: in `pass_criteria` JSONB)
  - `test_attempts.score` (actual: `total_score`)
  Supabase PostgREST returned HTTP 400 Bad Request, causing queries to evaluate to `null` and fallback to empty arrays `[]`.
- **Fix Implemented**:
  Updated queries to select exact schema columns and pre-computed total registered students, unique test attempters, passers, failers, placed candidates, and student roster with company eligibility.
- **Verification**: Verified AI Assistant now correctly returns 9 students, 4 companies, and candidate Hemanth's attempt details. Status: **RESOLVED**.

---

### 🐛 BUG-002: Markdown Tables Rendered as Raw Pipe Strings in AI Chat
- **Severity**: S3 - Medium
- **Component**: `PlacementAIChat.tsx` & `AdminAIAssistant.tsx`
- **Symptom**: Tables rendered as single lines of raw markdown (`| Metric | Value ||--------|-------|| Total...`) instead of formatted HTML tables.
- **Root Cause**: `ReactMarkdown` v10 does not parse GFM table AST nodes by default without `remark-gfm` plugin.
- **Fix Implemented**:
  1. Installed `remark-gfm` v4.0.1.
  2. Passed `remarkPlugins={[remarkGfm]}` to `<ReactMarkdown>` components.
  3. Styled `table`, `th`, `td` with clean Tailwind border and background classes.
- **Verification**: Verified all markdown tables render as responsive HTML tables with clean column alignment. Status: **RESOLVED**.

---

### 🐛 BUG-003: Accidental Assessment Deletion Without Confirmation Modal
- **Severity**: S2 - High
- **Component**: `src/pages/admin/AdminTests.tsx`
- **Symptom**: Clicking delete icon immediately deleted the assessment without prompting for user confirmation.
- **Root Cause**: Handler invoked `supabase.from("tests").delete()` directly upon click.
- **Fix Implemented**:
  Introduced an `AlertDialog` confirmation modal requiring explicit confirmation before calling deletion API.
- **Verification**: Clicking delete opens confirmation dialog; cancellation preserves test; confirmation safely removes test. Status: **RESOLVED**.

---

### 🐛 BUG-004: Duplicate JSON Keys in AI-Generated Questions
- **Severity**: S2 - High
- **Component**: Question Generation Service (`src/services/aiQuestionGen.ts`)
- **Symptom**: Gemini AI generated questions with repeated `"correct_answer"` and `"explanation"` keys, causing JSON parse errors in browser console.
- **Root Cause**: LLM prompt lacked strict single-key deduplication rules.
- **Fix Implemented**:
  Added regex pre-parser to sanitize repeated JSON keys and enforced strict output schema in system prompt.
- **Verification**: Verified AI question generation successfully produces clean JSON arrays across Aptitude and Technical topics. Status: **RESOLVED**.

---

### 🐛 BUG-005: Missing TCS Company Logo & Sizing Inconsistency
- **Severity**: S3 - Medium
- **Component**: `src/components/CompanyLogo.tsx`
- **Symptom**: TCS company card had no logo displayed; other recruiter logos were small and misaligned.
- **Root Cause**: Missing SVG/PNG asset mapping for TCS; logo container lacked vertical flex alignment.
- **Fix Implemented**:
  Added high-resolution TCS logo asset, standardized logo containers to 40x40px with rounded border, and centered vertically alongside company titles.
- **Verification**: Verified crisp logo presentation across Admin Overview, Assessment cards, and Recruiter lists. Status: **RESOLVED**.

---

### 🐛 BUG-006: Device Selection Toggle Allowed Proctoring Evasion
- **Severity**: S2 - High
- **Component**: `src/pages/admin/AdminTests.tsx` (Proctoring Config)
- **Symptom**: Test creator permitted deselecting gadgets from triggering alarms.
- **Root Cause**: Individual checkbox toggles for phone, smartwatch, and audio devices allowed opting out.
- **Fix Implemented**:
  Removed device selection checkboxes. Configured proctoring engine to trigger universal alarms for all digital gadgets automatically.
- **Verification**: Verified universal gadget detection in webcam stream. Status: **RESOLVED**.

---

### 🐛 BUG-007: Fullscreen API Execution Fails on Asynchronous Gate
- **Severity**: S1 - Critical
- **Component**: `src/pages/student/StudentTests.tsx`
- **Symptom**: Clicking "Start Test" resulted in browser security exception: `Failed to execute 'requestFullscreen' on 'Element': API can only be initiated by a user gesture.`.
- **Root Cause**: An asynchronous `await getUserMedia()` preceded `requestFullscreen()`, consuming the transient user gesture token before calling the Fullscreen API.
- **Fix Implemented**:
  Engineered dedicated `ProctorGateModal` that verifies camera connectivity first, then provides a dedicated "Grant Fullscreen & Begin Assessment" button where `requestFullscreen()` is the synchronous first operation in the user click event.
- **Verification**: Verified fullscreen mode transitions smoothly on all major browsers without permission errors. Status: **RESOLVED**.

---

### 🐛 BUG-008: Candidate Test Started Without Mandatory Camera & Fullscreen Gating
- **Severity**: S1 - Critical
- **Component**: `src/pages/student/StudentTests.tsx`
- **Symptom**: Candidates could bypass camera access or fullscreen requirements by dismissing browser dialogs and taking assessments unmonitored.
- **Root Cause**: Lack of a pre-flight modal gate intercepting test session instantiation.
- **Fix Implemented**:
  1. Mandatory `ProctorGateModal` enforces active video streaming before start button is unlocked.
  2. In-test `isFullscreenLocked` overlay obscures questions and freezes exam interactions if fullscreen is exited mid-exam until re-entered.
  3. Floating AI assistant is completely unmounted on `/dashboard/tests` to prevent candidate cheating.
- **Verification**: Verified tests cannot start without active camera stream and fullscreen. Exiting fullscreen immediately displays security lockout overlay. Status: **RESOLVED**.

---

### 🐛 BUG-009: PostgREST HTTP 400 Bad Request on Test Attempt Updates
- **Severity**: S1 - Critical
- **Component**: `src/pages/student/StudentTests.tsx`
- **Symptom**: Submitting test attempts generated HTTP 400 Bad Request in browser console, failing to record final score and completion status.
- **Root Cause**: Code invoked `.update({ ... }).order("started_at", { ascending: false }).limit(1)`, which is invalid SQL grammar in PostgREST.
- **Fix Implemented**:
  Captured the exact attempt primary key (`insertedAttemptId`) upon session creation and targeted `.eq("id", insertedAttemptId)` directly on update.
- **Verification**: Verified test score, pass/fail status, and timestamp update with HTTP 200/204. Status: **RESOLVED**.

---

### 🐛 BUG-010: Filter & Search State Reset on Route Navigation
- **Severity**: S2 - High
- **Component**: `src/pages/admin/AdminReports.tsx` & `src/pages/admin/AdminAnalytics.tsx`
- **Symptom**: Navigating between portal sections (e.g. Reports ➔ Students ➔ Reports) reset all applied filters, search terms, and selected tests.
- **Root Cause**: Filter state was held only in standard React memory state (`useState`).
- **Fix Implemented**:
  Engineered `usePersistentState.ts` hook backed by `sessionStorage`, persisting filter selections across component unmounts and route switches.
- **Verification**: Verified filter selections persist across route changes and survive browser tab switches within session. Status: **RESOLVED**.

---

### 🐛 BUG-011: Placement AI Assistant Spontaneously Producing Unsolicited Charts
- **Severity**: S3 - Medium
- **Component**: `src/pages/ai/PlacementAIChat.tsx` & `src/components/assistant/AdminAIAssistant.tsx`
- **Symptom**: AI Assistant generated full Recharts bar charts for simple text or table queries where no chart was requested.
- **Root Cause**: System prompt instructed model to always output a ` ```chart ` block for placement overview questions.
- **Fix Implemented**:
  Enforced strict Charts-on-Demand policy: AI is strictly prohibited from generating charts unless the user explicitly requests one (e.g. "show a chart", "graph the results").
- **Verification**: Verified summary questions return clean markdown tables and KPI cards without unsolicited charts. Status: **RESOLVED**.

---

### 🐛 BUG-012: Student AI Assistant Bold Words Rendered as Green Pill Badges & Missing Tables
- **Severity**: S3 - Medium
- **Component**: `src/components/assistant/StudentAIAssistant.tsx`
- **Symptom**: Every bold word in student assistant messages rendered as an opaque green badge pill; markdown tables collapsed into raw pipe text.
- **Root Cause**: Aggressive custom `strong` tag CSS override and missing `remark-gfm` plugin.
- **Fix Implemented**:
  Restored clean `font-semibold text-foreground` styling for `strong` tags, passed `remarkPlugins={[remarkGfm]}`, and styled `table`, `thead`, `tbody`, `tr`, `th`, `td` with Tailwind border classes.
- **Verification**: Verified clean, comfortable typography and responsive HTML tables in mentor responses. Status: **RESOLVED**.

---

### 🐛 BUG-013: Unauthorized Data Access Risk in Student AI Assistant
- **Severity**: S1 - Critical (Security / Privacy)
- **Component**: `src/components/assistant/StudentAIAssistant.tsx`
- **Symptom**: Student could prompt mentor assistant to reveal class-wide rank lists, topper names, or other students' exam scores.
- **Root Cause**: Inadequate client-side filtering and prompt boundary enforcement for student role.
- **Fix Implemented**:
  1. Added client-side regex query guard blocking questions referencing other candidates, class ranks, or database records.
  2. Injected strict privacy instructions into Gemini system prompt explicitly disallowing cross-candidate disclosures.
- **Verification**: Prompts like "who got highest score" or "show other students" are intercepted and blocked with privacy security notice. Status: **RESOLVED**.

---

### 🐛 BUG-014: Broken Team Member Photos on Landing Page Team Section
- **Severity**: S3 - Medium
- **Component**: `src/components/landing/LandingTeam.tsx`
- **Symptom**: If team portrait URLs failed or experienced network delays, a broken image icon rendered.
- **Root Cause**: Missing `onError` fallback on avatar `<img>` tags.
- **Fix Implemented**:
  Added `onError` fallback handler that smoothly renders a stylized gradient avatar with the member's initials.
- **Verification**: Simulated 404 network image failure; avatar initials fallback rendered seamlessly. Status: **RESOLVED**.

---

### 🐛 BUG-015: Remote Supabase Edge Functions CORS / 400 Failures
- **Severity**: S2 - High
- **Component**: `src/pages/student/StudentTests.tsx`
- **Symptom**: Test completion failed with CORS preflight errors in browser console targeting `generate-feedback` and `send-result-notification` edge functions.
- **Root Cause**: Edge functions either missing or CORS headers misconfigured on remote instance.
- **Fix Implemented**:
  Replaced `generate-feedback` with client-side Gemini AI generation via `askGemini()`, and replaced `send-result-notification` with direct insert into `notifications` table.
- **Verification**: Verified test submissions generate feedback and notifications cleanly with zero console errors. Status: **RESOLVED**.

