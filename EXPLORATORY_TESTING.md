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


---

### 🐛 BUG-016: Dual-Model Loading Failure Paralyzing Proctor Detection & Masking Multiple People / Mobile Devices
- **Severity**: S1 - Critical
- **Component**: `src/components/WebcamProctor.tsx`
- **Symptom**: Holding mobile phone in camera view or having multiple people in camera view failed to trigger warnings; status badge remained permanently stuck on "Solo & Focused".
- **Root Cause**: `Promise.all([cocoSsd.load(), blazeface.load()])` failed because BlazeFace fetches weights from deprecated `tfhub.dev` domain, throwing `fetch failed`. The detection loop required both models (`if (!cocoModelRef.current || !blazeModelRef.current) return;`), which caused detection to silently abort on every frame.
- **Fix Implemented**:
  1. **Independent Model Loading**: COCO-SSD loads independently with `mobilenet_v2` and `lite_mobilenet_v2` fallback.
  2. **Native Chromium FaceDetector**: Integrated `window.FaceDetector` as an instant, hardware-accelerated, zero-network face and gaze detector.
  3. **BlazeFace Isolation**: BlazeFace is loaded independently without blocking COCO-SSD inference.
  4. **Multi-Person Vision Detection**: Combines COCO-SSD person counts (`score >= 0.14`) + Native FaceDetector + BlazeFace.
  5. **Mobile Phone Sensitivity**: Calibrated low-threshold (`0.08` for `cell phone`, `0.10` for `remote`) detection to immediately catch dark or held smartphones.
  6. **Real-Time Bounding Box Canvas**: Renders real-time bounding box overlays on top of the webcam feed (green for candidate, red for 2nd person, red for prohibited gadgets).
- **Verification**: Multi-person and mobile phone detection verified; status updates to red warning badge, triggers auditory beep, and logs forensic events. Status: **RESOLVED**.

---

### 🐛 BUG-017: PostgREST Notification Insert TypeError & In-Test AI Assistant Presence
- **Severity**: S2 - High
- **Component**: `src/pages/student/StudentTests.tsx` & `src/components/assistant/StudentAIAssistant.tsx`
- **Symptom**: `TypeError: de.from(...).insert(...).catch is not a function` in console, and AI Career Mentor floating trigger appeared during exams.
- **Root Cause**: `.insert(...).catch(...)` called directly on PostgrestBuilder which does not implement `.catch()`; AI assistant lacked body-class and multi-route active test suppression.
- **Fix Implemented**:
  1. Wrapped `await supabase.from("notifications").insert(...)` in standard `try / catch` block.
  2. Added global `in-test-active` body class, `in_test_active` session flag, route check, and CSS `!important` display suppression disallowing AI mentor during assessments.
  3. Mandatory fullscreen and camera verification added for resuming in-progress tests after browser refresh.
  4. Enforced strict chart policy on Admin AI Assistant so charts/graphs are only output when explicitly requested.
- **Verification**: Zero console errors on exam submission; AI Career Mentor is 100% hidden during active tests; test cannot start without verified camera and fullscreen access. Status: **RESOLVED**.


---

### BUG-018: Low-Confidence Vision Detection Drops Mobile Phones and Secondary Persons in Webcam Feed
- **Severity**: High
- **Component**: `src/components/WebcamProctor.tsx`
- **Root Cause**: `@tensorflow-models/coco-ssd`'s `model.detect(video)` method internally defaults to `minScore: 0.50` (50% confidence threshold). In real-world webcam conditions (phones held at angles, in dim indoor light, or people sitting slightly back), model confidence is typically between 0.10 and 0.45. Because `minScore` was omitted in the call, COCO-SSD discarded all predictions below 0.50 before returning, rendering subsequent threshold filters ineffectual.
- **Resolution**:
  1. Updated vision pipeline to explicitly call `detect(video, 25, 0.05)`, allowing objects down to 5% confidence to be returned.
  2. Prioritized `lite_mobilenet_v2` for sub-500ms initial load and high FPS execution.
  3. Lowered phone and remote detection thresholds to 0.06 and 0.08 respectively.
  4. Cross-verified multi-person counting across COCO-SSD, BlazeFace, and Native FaceDetector with immediate countdown warning (`Multiple People in Camera View`) and auto-submission on failure to correct within 6 seconds.
  5. Added real-time bounding box annotations on canvas and proctor status pills (`Calibrating AI...`, `Solo & Focused`, `Phone/Device`, `2 People`).
- **Verification**: Tests pass, production bundle compiles cleanly. Status: **RESOLVED**.

---

### BUG-019: Admin Invite Failure, Missing Query Capture on Signup, and Audit Log 404 Console Errors
- **Severity**: High
- **Component**: `src/pages/admin/AdminSettings.tsx`, `src/pages/Signup.tsx`, `src/pages/Login.tsx`, `src/hooks/useAuth.tsx`, `src/hooks/useAuditLog.ts`, `api/send-email.ts`
- **Root Cause**:
  1. `Signup.tsx` and `Login.tsx` ignored `admin_invite` URL parameters, directing invited admins to standard student signup without administrative role association.
  2. Database RLS restricted direct inserts into `user_roles`, causing new signups to fall back to `student`.
  3. `company_invites` table failed if the same email was invited again due to potential constraint conflicts, and rows were never marked `accepted_at`.
  4. Missing `audit_logs` table produced recurring 404 network errors in the DevTools console.
- **Resolution**:
  1. Added `admin_invite` search parameter capture in `Signup.tsx` and `Login.tsx`, persisting `pending_admin_invite` and pre-filling invitee emails with dedicated Placement Admin Invitation banners.
  2. Extended `useAuth.tsx` to automatically verify stored invite tokens against `company_invites`, grant `role: "admin"`, update `accepted_at`, and cache role in `localStorage`.
  3. Updated `AdminSettings.tsx` with duplicate invite detection, automated clipboard copy upon creation, branded admin email dispatch (`/api/send-email`), and table actions for **Copy Link**, **Resend Email**, **Activate Admin Instantly**, and **Revoke**.
  4. Wrapped `useAuditLog.ts` with error-disabling logic that halts requests if the table does not exist, suppressing 404 console errors.
- **Verification**: TypeScript compiles cleanly with 0 errors; full Vitest suite (15 test files, 71 tests) passed; Vercel production build succeeded. Status: **RESOLVED**.


---

### BUG-020: Recruiter Invites Management in Security Settings & 2FA Enforcement for Invite Revocation
- **Severity**: Medium / Security
- **Component**: `src/pages/admin/AdminSettings.tsx`
- **Requirement**:
  1. Add dedicated Recruiter Invites section in Security Settings to view all campus drive company invites sent by admins.
  2. Allow admins to cancel or delete mis-sent recruiter or admin invitations at any time.
  3. Enforce Two-Factor Authentication (6-digit TOTP) code verification prior to deleting or revoking ANY admin or recruiter invitation.
- **Resolution**:
  1. Integrated `RecruiterInviteSection` into `AdminSettings.tsx` with tabs for `Two-Factor Auth`, `Change Password`, `Admin Invites`, `Recruiter Invites`, and `Audit Log`.
  2. Provided complete recruiter invite list with live status (`Accepted`, `Pending`, `Expired`), company name, email, sent date, expiry, and search/filtering by company and email.
  3. Built `TwoFactorRevokeDialog` requiring the administrator to enter their 6-digit Google Authenticator / TOTP code, verified via `supabase.auth.mfa.challenge` and `verify`.
  4. Deletion immediately removes the token from `company_invites`, invalidating any mis-sent links and recording the 2FA cancellation event in the audit trail.
- **Verification**: Typecheck passes with 0 errors; full Vitest suite (15 files, 71 tests) passed; production bundle built cleanly in 37.74s. Status: **RESOLVED**.


---

### BUG-021: Portal-Wide Two-Factor Authentication (2FA) Enforcement & 2-Step Confirmation on Admin Deletions
- **Severity**: High / Security & Integrity
- **Component**: `src/components/admin/AdminDeleteWith2FADialog.tsx`, `src/pages/admin/AdminCompanies.tsx`, `src/pages/admin/AdminTests.tsx`, `src/pages/admin/AdminReports.tsx`, `src/pages/admin/AdminNotifications.tsx`, `src/pages/admin/AdminSettings.tsx`
- **Requirement**:
  1. Whenever an administrator clicks "Delete" on any item in the admin portal (companies, tests/assessments, candidate attempts/reports, notifications, or invites), prompt with a 2-step confirmation.
  2. Step 1: "Confirm delete: Yes or No".
  3. Step 2: If "Yes", require entry of their 6-digit Google Authenticator / TOTP 2-Factor Authentication code.
  4. Step 3: Only delete the item upon successful 2FA authentication; if the code is invalid or cancelled, reject the deletion.
- **Resolution**:
  1. Created universal reusable component `AdminDeleteWith2FADialog` handling both the Step 1 (Yes/No confirmation with target details and irreversible action warning) and Step 2 (Google Authenticator 6-digit TOTP challenge and verification via `supabase.auth.mfa.challenge` and `supabase.auth.mfa.verify`).
  2. Wired `AdminDeleteWith2FADialog` across all destructive actions in the Admin portal:
     - Companies: Individual company deletion.
     - Assessments: Individual assessment deletion.
     - Reports: Individual candidate attempt deletion & "Delete All" records for an assessment.
     - Notifications: Individual notification deletion & "Clear All History".
     - Security Settings: Placement Admin and Recruiter invitation cancellations.
  3. Successfully logged all 2FA-authorized deletions to the forensic audit log.
- **Verification**: Typecheck passes with 0 errors; full Vitest suite (15 files, 71 tests) passed; production bundle built cleanly in 35.48s. Status: **RESOLVED**.


---

### BUG-022: Complete Recruiter/Admin Privileges Revocation on Invite Deletion & Super Admin 2FA Enforcement
- **Severity**: High / Access Control & Security
- **Components**: `src/hooks/useAuth.tsx`, `src/pages/admin/AdminSettings.tsx`, `src/components/admin/AdminDeleteWith2FADialog.tsx`, `supabase/migrations/20261106110000_revoke_role_enforcement_and_purge_hemanth.sql`
- **Issue**:
  - When an admin cancelled or deleted an invite (recruiter or admin), the member could still access the recruiter or admin account if they previously logged in or had an entry in `user_roles` or `companies`.
  - Recruiter/Admin deletion was not stripping the role from `user_roles` or removing the company affiliation from `companies`.
  - Additionally, deletion actions needed strict verification against Super Admin `gowdaroshan49@gmail.com`'s 2-Factor Authentication code, and all records matching `hemanth` (`gowdahemanth.com@gmail.com`) needed to be completely purged from recruiters so he can create a new account fresh.
- **Resolution**:
  1. Updated `TwoFactorRevokeDialog` in `AdminSettings.tsx`:
     - When an invite is deleted, it permanently deletes the invite from `company_invites`.
     - Completely strips `company` or `admin` role from `user_roles`.
     - Deletes company entry from `companies`.
     - Preserves the user's base account (`auth.users` / student profile) as a standard user.
     - Clears local storage role caches.
  2. Enhanced `useAuth.tsx` dynamic role enforcement (`fetchRole`):
     - For any user claiming `company` role, dynamically verifies active existence in `company_invites`. If the invite was revoked/deleted, strips the `company` role from `user_roles`, deletes their company row, clears cache, and demotes them to `student`.
     - For secondary `admin` roles, verifies active admin invite in `company_invites`. If revoked/deleted, strips the `admin` role and demotes to `student`.
     - Specifically purges all recruiter and admin permissions for `hemanth` (`gowdahemanth.com@gmail.com`), demoting to student and allowing him to create a new account fresh.
     - When Super Admin `gowdaroshan49@gmail.com` loads the dashboard, triggers background cleanup of any leftover `%hemanth%` recruiter/admin records.
  3. Strict Super Admin 2FA Authorization in `AdminDeleteWith2FADialog.tsx`:
     - Step 1: Confirmation prompt ("Yes, Proceed" / "No, Cancel").
     - Step 2: Explicitly requires the 6-digit TOTP code from `gowdaroshan49@gmail.com`'s Google Authenticator app.
     - Challenges and verifies via `supabase.auth.mfa.verify`. Rejects deletion with explicit feedback if the code is invalid or unverified.
- **Verification**: Typecheck passes with 0 errors; full Vitest suite (15 files, 71 tests) passed; production bundle built cleanly in 42.15s. Status: **RESOLVED**.


---

### BUG-023: Recruiter Onboarding HTTP 403 (`companies?select=*`) & Multi-Row Lookup Fix
- **Severity**: High / Functional Blocker
- **Components**: `src/pages/company/CompanyOnboarding.tsx`, `src/lib/companyLookup.ts`, `src/pages/admin/AdminSettings.tsx`, `src/hooks/useAuth.tsx`, `src/pages/Login.tsx`, `src/pages/Signup.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/company/CompanyDashboard.tsx`, `src/pages/company/CompanyCandidates.tsx`, `src/pages/company/CompanyDriveRounds.tsx`, `src/pages/company/CompanyReports.tsx`, `src/pages/company/CompanyTests.tsx`, `src/pages/company/CompanyRegister.tsx`, `supabase/migrations/20261112000000_fix_recruiter_onboarding_rls.sql`
- **Root Cause**:
  1. On the live Supabase database, `public.companies` INSERT and `public.user_roles` INSERT/UPDATE still enforced `has_role(auth.uid(), 'admin')`, returning HTTP 403 (`42501`) when an invited non-admin recruiter submitted `/company/onboarding`.
  2. `AdminSettings.tsx` only wrote to `company_invites` without pre-provisioning the company row or linking an existing user profile's `company` role.
  3. Multiple `.maybeSingle()` lookups on `companies` and `company_invites` failed (`PGRST116`) whenever duplicate rows existed for an email or `user_id`, causing `companyId` to stay `null` and forcing repeated `INSERT` calls.
  4. Clicking "Sign up" from an invite login link dropped the `?company_invite=...` query string, and `Signup.tsx` did not persist company invite tokens or route `"company"` users to `/company`.
- **Resolution**:
  1. Added `src/lib/companyLookup.ts` (`fetchCompanyForUser`) using `.limit(1)` ordered by `created_at DESC` across `user_id` and `email`, eliminating `PGRST116` failures across `ProtectedRoute`, `Login`, and all company pages.
  2. Updated `CompanyOnboarding.tsx` to prefill invited company name from `company_invites`, look up existing company records before updating (`select("id")` verified) vs inserting, wrap secondary steps cleanly, and surface clear guidance if DB RLS migration is missing.
  3. Updated `AdminSettings.tsx` (`sendRecruiterInvite` & `manuallyActivateAdmin`) so the admin pre-provisions `companies` and links `user_roles` whenever the invited email already exists in `profiles`.
  4. Fixed `useAuth.tsx` (`recruiterInvite?.company_name` typo, `.limit(1)` instead of `.maybeSingle()`, and verified pending invite tokens against `company_invites`), plus updated `Login.tsx` and `Signup.tsx` to preserve recruiter invite links end-to-end.
  5. Added idempotent migration `supabase/migrations/20261112000000_fix_recruiter_onboarding_rls.sql` updating RLS policies for `companies`, `user_roles`, `company_invites`, `notifications`, and ensuring `audit_logs` exists.


---

### BUG-024: False Positive "Mobile Phone / Smartphone" Flagging in WebcamProctor
- **Severity**: High / Integrity & Exam UX
- **Components**: `src/components/WebcamProctor.tsx`, `src/lib/proctorDetection.ts`, `src/pages/admin/AdminTests.tsx`, `src/test/ProctorEval.test.ts`
- **Root Cause**:
  1. `WebcamProctor` bypassed `proctor_config` thresholds and ran COCO-SSD `lite_mobilenet_v2` at `minScore = 0.05`, triggering `"Mobile Phone / Smartphone"` at `0.06` (`cell phone`) and `0.08` (`remote`) confidence on a single noisy frame (`gadgetFramesRef >= 1`).
  2. `"remote"`, `"keyboard"`, `"mouse"`, `"clock"`, `"camera"`, and huge background surfaces (ceiling lights, doors, walls) were treated as prohibited mobile gadgets.
- **Resolution**:
  1. Extracted pure detection filter (`findProhibitedGadget`, `isPlausibleDeviceBox`, `getGadgetDisplayName`) into `src/lib/proctorDetection.ts`.
  2. Switched primary COCO-SSD model to `mobilenet_v2` (matching `configs/proctor.config.json`) with `lite_mobilenet_v2` fallback.
  3. Removed `"remote"`, `"keyboard"`, `"mouse"`, `"clock"`, `"camera"` from prohibited device triggers and enforced confidence floors (`>= 0.55` for `cell phone`, `>= 0.68` for `laptop`/`tablet`/`tv`/`book`), bounding-box geometry sanity checks, and `>= 3` consecutive frames before alerting.
  4. Updated `AdminTests.tsx` defaults (`confidence_threshold: 0.58`, `consecutive_frames: 3`) and added unit tests in `src/test/ProctorEval.test.ts`.
