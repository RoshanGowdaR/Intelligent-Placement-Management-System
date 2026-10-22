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
