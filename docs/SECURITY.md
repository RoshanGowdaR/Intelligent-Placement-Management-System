# 🔒 Security Policy & Vulnerability Reporting
## Intelligent Placement Management System (IPMS Elite)

---

### Security Overview
IPMS Elite handles sensitive student academic records, corporate hiring requirements, and live examination sessions. Security is implemented via defense-in-depth across the client, network, and database layers.

---

## 1. Vulnerability Reporting Policy

We take security vulnerabilities seriously. If you discover a security vulnerability in IPMS Elite, please follow these guidelines:

### Private Disclosure
- **DO NOT** open public GitHub issues for security vulnerabilities.
- Email your findings directly to the platform security lead: `security@ipms-elite.internal` or contact the repository administrators privately.
- Include:
  1. Description of the vulnerability.
  2. Proof-of-concept steps to reproduce.
  3. Potential impact assessment.
- **SLA**: We acknowledge receipt within **24 hours** and aim to deploy patches within **72 hours** for high-severity vulnerabilities.

---

## 2. Row Level Security (RLS) Enforcement

Every table in the PostgreSQL database is protected by Row Level Security policies evaluated by the database engine:

| Table | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
| :--- | :--- | :--- | :--- | :--- |
| **`profiles`** | Authenticated user (`id = auth.uid()`) or Admin (`has_role('admin')`) | Self only on registration | Self only or Admin | Admin only |
| **`companies`** | Public read (Anyone can view active recruiters) | Admin or Recruiter | Recruiter owner (`user_id = auth.uid()`) or Admin | Admin only |
| **`tests`** | Public read (Anyone can view scheduled tests) | Admin or Recruiter | Test author or Admin | Admin or Test author |
| **`test_attempts`**| Student owner (`student_id = auth.uid()`) or Admin/Recruiter | Student owner during live test | Auto-submit / Score grading | Admin only |
| **`drive_rounds`** | Students view published rounds; Admin/Recruiter manage | Admin or Recruiter | Recruiter owner or Admin | Admin or Recruiter |
| **`round_participants`**| Student views own status; Recruiter evaluates | Recruiter or Admin | Recruiter or Admin | Recruiter or Admin |
| **`notifications`**| User owns notification (`user_id = auth.uid()`) | System / Admin trigger | User owns notification (mark read) | User owns notification (delete) |

---

## 3. Privacy-Preserving Computer Vision Architecture

- **No Remote Video Streaming**: Webcam video feeds captured during proctored examinations are processed **strictly in the candidate's browser RAM** using TensorFlow.js and WebGL.
- **Zero Video Serialization**: Video frames are analyzed ephemerally and discarded immediately after inference (every 500ms). No video or audio is ever written to disk or uploaded to any server.
- **Telemetry Only**: The only data transmitted to Supabase is discrete numeric telemetry: timestamped violation event strings (e.g., `"tab_switch"`, `"cell phone detected"`).

---

## 4. API Key Protection & Serverless Proxies

- Upstream AI inference API keys (`GROQ_API_KEY`, `GEMINI_API_KEY`) and SMTP credentials (`GMAIL_APP_PASSWORD`) are vaulted in serverless environment variables.
- Client applications never directly contact upstream LLM providers with secret keys; all calls route through the `/api/gemini` proxy which strips client identity and injects credentials server-side.

---

## 5. Session Security & Inactivity Protection

- GoTrue JWT tokens are stored in secure browser storage and refreshed automatically.
- The `useSessionTimeout` hook monitors administrative user inactivity (mouse movement, keystrokes, touch events). After 25 minutes of inactivity, a warning modal appears; at 30 minutes, the session is terminated and the user is redirected to `/login`.
