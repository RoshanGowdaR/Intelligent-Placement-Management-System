# 🏗️ System Architecture & Engineering Blueprint (IPMS Elite)

## 1. Architectural Overview

```
                                  +------------------------------------+
                                  |         Web Clients (SPA)          |
                                  | React 18 + Vite + Tailwind + Radix |
                                  +-----------------+------------------+
                                                    |
                                HTTPS / WSS / REST / PostgREST
                                                    |
               +------------------------------------+------------------------------------+
               |                                    |                                    |
+--------------v---------------+    +---------------v----------------+   +---------------v---------------+
|          Supabase            |    |       Vercel Serverless        |   |           AI Engines          |
| • PostgreSQL 15 Database     |    | • /api/gemini (Proxy & Relay)  |   | • Groq (Primary API)          |
| • Row Level Security (RLS)   |    | • /api/send-email (SMTP Relay) |   | • Google Gemini 2.5 Flash     |
| • GoTrue Auth (OAuth/Email)  |    | • Environment Variable Vault   |   | • Fallback Affinities         |
| • Storage Buckets & Realtime |    +--------------------------------+   +-------------------------------+
+------------------------------+
```

---

## 2. Layered Component Architecture

### 2.1 Presentation Layer (Frontend)
- **Framework**: React 18.3 with Vite 5.4 bundling.
- **Routing**: React Router DOM v6 with role-guarded `ProtectedRoute` wrapper.
- **State Management**: React Query (TanStack Query v5) for server cache synchronization and local component state.
- **Design System**: Tailored shadcn/ui components built on Radix UI primitives.
- **Computer Vision**: TensorFlow.js and COCO-SSD neural network inference for client-side multi-person and device gadget detection.
- **Document Processing**: `pdfjs-dist` for PDF rendering/text extraction and `mammoth` for DOCX parsing.

### 2.2 API & Serverless Relay Layer
- **`/api/gemini`**: Node.js serverless proxy handling bidirectional AI provider switching between Groq and Gemini. Prevents exposing secret API keys to the browser.
- **`/api/send-email`**: Direct Nodemailer IPv4 transport for automated notification dispatch.

### 2.3 Data & Persistence Layer (Supabase)
- **Tables**:
  - `profiles`: Student details, verified CGPA, branch, resume URL, graduation year, LinkedIn/GitHub URLs.
  - `companies`: Registered recruiters, CTC package, allowed branches, eligibility criteria.
  - `tests`: Assessments, duration, question bank, proctor configuration, registration deadlines.
  - `schedules`: Candidate test registration and enrollment records.
  - `test_attempts`: Exam scores, answers, tab switch logs, proctor events, and auto-submit status.
  - `notifications`: Activity feed records for all 3 user roles with realtime publication.
  - `audit_logs`: Immutable security tracking of user operations.
- **Storage Buckets**:
  - `resumes` (public, 1MB max)
  - `certificates` (public, 800KB max)
  - `avatars` (public, 500KB max)

---

## 3. Security Architecture & Threat Model

1. **Row Level Security (RLS)**: Enforces access control at the database level. Students can only view and update their own schedules, attempts, and profiles. Recruiters can only manage their own drives.
2. **Anti-Cheat Proctoring Pipeline**:
   - WebCam analysis operates 100% on the client device (privacy-preserving).
   - Suspicious objects (cell phones, secondary laptops, books) trigger warnings with configurable countdown grace periods.
   - Second offenses trigger automatic examination submission.
3. **Session Timeout & MFA**:
   - Inactivity timer monitors user gestures and forces re-authentication after idle duration.
   - TOTP authenticator integration for administrative accounts.
