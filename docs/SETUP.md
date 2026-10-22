# 💻 Local Development Setup & Environment Guide
## Intelligent Placement Management System (IPMS Elite)

---

### Prerequisites Checklist
Before configuring IPMS Elite locally, ensure you have the following installed:
- [x] **Node.js**: `v20.x` or higher (Active LTS recommended, e.g. Node 20.18+)
- [x] **npm**: `v10.x` or higher
- [x] **Git**: `v2.40+`
- [x] Modern Web Browser with WebRTC & WebGL support (Google Chrome or Microsoft Edge recommended)

---

## 1. Quickstart (Clone & Install)

```bash
# 1. Clone the repository
git clone https://github.com/RoshanGowdaR/Intelligent-Placement-Management-System.git
cd Intelligent-Placement-Management-System

# 2. Check out the active integration branch
git checkout developer

# 3. Clean install all dependencies using exact lockfile versions
npm ci
```

---

## 2. Environment Configuration

1. Copy the example environment template:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and configure your credentials:
   ```env
   # Supabase Database & Auth (From your Supabase Project Settings -> API)
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_your_key_here"

   # AI LLM Inference Providers (Serverless Relay & Question Generation)
   VITE_GROQ_API_KEY="gsk_your_groq_api_key_here"
   VITE_GEMINI_API_KEY="AIzaSy_your_primary_gemini_api_key"
   VITE_GEMINI_API_KEY_BACKUP="AQ.Ab8RN6..._backup_key"

   # Optional Gmail SMTP Relay for Invitation Emails
   GMAIL_USER="your-email@gmail.com"
   GMAIL_APP_PASSWORD="your-app-specific-password"
   ```

---

## 3. Database Initialization (Supabase)

If setting up a fresh Supabase instance:
1. Create a new project in the [Supabase Dashboard](https://supabase.com).
2. Navigate to **SQL Editor**.
3. Execute the migration scripts located in [`supabase/migrations/`](../supabase/migrations/) sequentially to establish:
   - Tables (`profiles`, `companies`, `tests`, `test_attempts`, `drive_rounds`, `round_participants`, `notifications`, `audit_logs`).
   - RLS security policies.
   - Storage buckets (`resumes`, `certificates`, `avatars`).

---

## 4. Running the Development Server

Start the Vite development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
The application will launch at `http://localhost:5173` (or port `8080` if configured).

---

## 5. Running Quality Verification & Tests

Always verify your local changes pass all quality gates:

```bash
# 1. Static TypeScript Compilation Check (Zero errors required)
npm run typecheck

# 2. ESLint Code Quality Inspection
npm run lint

# 3. Full Automated Vitest Suite (All 15 suites, 71 tests must pass)
npm test -- --run

# 4. Dedicated Backend Recruitment Engine & Proctor Logic Tests
npm run test:backend

# 5. Production Vite Build Simulation
npm run build
```

---

## 6. Troubleshooting Common Issues

### Issue 1: Port 8080 or 5173 is already in use
- *Fix*: Specify a custom port when launching:
  ```bash
  npx vite --port 3000
  ```

### Issue 2: `column does not exist` error during AI chat queries
- *Fix*: Ensure your code queries the exact relational columns documented in [`docs/ERD.md`](ERD.md). Do not query `min_cgpa` on `companies` (it is inside `eligibility_criteria`), or `score` on `test_attempts` (use `total_score`).

### Issue 3: Webcam fails to initialize in live test
- *Fix*: Verify browser camera permissions in site settings (`chrome://settings/content/camera`). Grant access to `localhost`.
