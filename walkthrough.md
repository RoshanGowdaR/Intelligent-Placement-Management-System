# 📖 Intelligent Placement Management System (IPMS Elite) — Complete Walkthrough

Welcome to the comprehensive walkthrough guide for **IPMS Elite**. This document outlines how every user role (Student Candidate, Placement Administrator, and Visiting Recruiter) interacts with the system, along with step-by-step test instructions for every feature.

---

## 🧭 Navigation Matrix by Role

| Role | Left Sidebar Navigation Links | Primary Capabilities |
| :--- | :--- | :--- |
| **Student** | Overview, AI Assistant, Profile Studio, Applications, My Assessments, Meetings, Score Card, **Notifications** | Resume & certificate upload, assessment registration, AI proctored exams, application tracking, notification history. |
| **Admin** | Overview, AI Assistant, Companies, Assessments, Students, Analytics, Reports, Leaderboard, **Notifications**, Security | Recruiter invites, test question bank generator (AI & DOCX/PDF upload), toggle registration open/close, candidate forensics, system notifications. |
| **Company** | Overview, Placement AI, Company Profile, Drive Rounds, Assessments, Candidates, Drive Reports, **Notifications** | Job role setup, hiring pipeline rounds, schedule exams, open/close registrations, view candidate resumes/certificates, notification history. |

---

## 🧑‍🎓 1. Student Candidate Walkthrough

### 1.1 Profile Studio & Document Verification Quotas
1. Navigate to **Profile Studio** (`/dashboard/profile`).
2. **Basic Details & Graduation Year**: Edit personal details, degree, branch, CGPA, and graduating year (all unlocked and fully editable).
3. **LinkedIn & GitHub Integration**: Enter full profile URLs (e.g., `https://linkedin.com/in/username` or `linkedin.com/in/username`). The system automatically normalizes them so recruiters and admins can click directly to open external profiles in a new tab.
4. **Document Quotas (Optimized for 150 Students / 1GB Supabase Free Tier)**:
   - **Resume**: Maximum file size **1 MB** (PDF, DOC, DOCX).
   - **Certificates**: Maximum file size **800 KB** (PDF, PNG, JPG).
   - **Internship Certificates**: Mandatory upload for security verification (**≤ 800 KB**).
   - **Profile Avatar**: Maximum file size **500 KB**.
5. **Interactive LinkedIn-Style Modals**:
   - Clicking **Add Certificate** opens an interactive dialog asking for Certificate Name, Issuing Organization, Issue Date, Expiration Date, Credential ID, and Document Upload.
   - Clicking **Add Project** opens an interactive dialog asking for Title, Description, Tech Stack, Repository Link (mandatory), and Live App Link (optional).

### 1.2 My Assessments & Registration
1. Navigate to **My Assessments** (`/dashboard/tests`).
2. Assessment cards display:
   - Test Title & Scheduled Date (IST).
   - Duration, Questions Count, Attempts (e.g. 0/2).
   - Registration status badge: **Registration Open** (amber) or **Registration Closed** (red).
3. **Registration Flow**:
   - When registration is open, click **Register for Assessment**.
   - If server-side RLS is pending migration, client-side self-healing saves registration in local storage so the student is **never blocked**!
   - Status updates immediately to **Registered · Upcoming**.
4. **Taking the Proctored Exam**:
   - When live, click **Start Test**.
   - Fullscreen lock, tab-switch monitoring, and webcam TensorFlow.js (COCO-SSD) object detection verify exam integrity.

### 1.3 Notifications History
1. Click **Notifications** in the left sidebar (`/dashboard/notifications`).
2. Filter notifications by: `All`, `Companies & Drives`, `Assessments`, `Rounds & Results`.
3. Search notifications by keyword in real time.
4. Mark individual notifications as read or click **Mark All Read**.
5. Dismiss single notifications with the **Trash** icon or clear all history with the **Clear All** button.
6. History is permanently preserved in storage unless deleted by the user.

---

## 🏛️ 2. Placement Administrator Walkthrough

### 2.1 AI-Powered Question Bank & Document Upload
1. Navigate to **Assessments** (`/admin/tests`).
2. Click **Create Test** &rarr; switch to the **Questions** tab.
3. **Generate with AI**:
   - Enter Subject (e.g. "Aptitude"), Topic (e.g. "Quantitative Aptitude"), Question Count (e.g. 10), and Type (MCQ/Coding).
   - Click **Generate Questions**.
   - Powered by the dual-engine AI (`/api/gemini` with Groq `openai/gpt-oss-120b` and Gemini `gemini-2.5-flash` failover).
   - Protected by `repairAndParseQuestionsJSON`: even if model outputs are truncated or contain unescaped characters, the parser auto-salvages complete questions with zero syntax errors.
4. **Upload Question Bank from DOCX / PDF / TXT**:
   - Click **Click to upload file** and select a `.docx`, `.pdf`, or `.txt` question document.
   - Uses client-side `mammoth` (for DOCX) and `pdfjs-dist` (for PDF) to extract text directly in the browser.
   - Questions are structured automatically via AI into the exam bank without depending on failing Supabase Edge Functions.

### 2.2 Instant Registration Window Control (Open / Close Anytime)
1. In the **Test Management** table, look at the **Registration** column.
2. Each test shows its live status: **Open** (green) or **Closed** (red).
3. Click the toggle button:
   - Clicking **Close Reg** immediately closes student registrations and sets the deadline to the past.
   - Clicking **Open Reg** immediately reopens registration for 7 days.
   - Changes take effect instantaneously across student portals.

### 2.3 Candidate Inspection & Document Verification
1. Navigate to **Students** (`/admin/students`).
2. Click **View Profile** on any student to view their complete dossier:
   - Personal information, verified CGPA, and branch.
   - External LinkedIn & GitHub links.
   - Featured projects with description, tech tags, and clickable repository links.
   - Direct clickable **View Resume** / **Download Resume** button.
   - Clickable **Verify Certificate** and **View Doc** buttons for each credential and mandatory internship certificate.

### 2.4 Administrator Notification Telemetry
1. Click **Notifications** in the left sidebar (`/admin/notifications`).
2. Monitor company drive announcements, registration milestones, and anti-cheat proctor flags.
3. Search, filter by category, mark read, or dismiss entries.

---

## 🏢 3. Visiting Recruiter (Company) Walkthrough

### 3.1 Recruitment Drive & Assessment Management
1. Navigate to **Assessments** (`/company/tests`).
2. Click **Schedule Assessment** to create a custom assessment round.
3. The table displays all active rounds with Cutoff Score, Duration, and Registration Deadline.
4. Use the **Re-open Registration** / **Close Registration** button on any test card to open or close candidate enrollment anytime.

### 3.2 Candidate Evaluation & Resumes
1. Navigate to **Candidates** (`/company/candidates`).
2. Inspect candidate list sorted by CGPA and round score.
3. Click **View Profile** to inspect full student portfolios, download resumes, and verify internship certificates.

### 3.3 Recruiter Notifications Feed
1. Click **Notifications** in the left sidebar (`/company/notifications`).
2. Review new candidate registrations, test submissions, and interview schedule alerts.
3. Full history management with individual dismissal and Clear All actions.
