# 🧠 Project Memory & Engineering Decisions (IPMS Elite)

This file documents core architecture decisions, database migration guides, API integration constraints, and operational guidelines for the **Intelligent Placement Management System**.

---

## 🔑 AI Dual-Provider Failover Architecture

The system utilizes an automatic bidirectional failover between **Groq** and **Google Gemini**:

1. **Primary Engine — Groq**:
   - Models: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`.
   - Max tokens: `4096`.
   - Timeout: `15,000 ms` (15 seconds) with active `AbortController`.
   - Temperature: `0.5`.
2. **Secondary Failover — Google Gemini**:
   - Models: `gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-pro`.
   - Max output tokens: `4096`.
   - Timeout: `15,000 ms`.
3. **Resilient JSON Parser (`repairAndParseQuestionsJSON`)**:
   - Automatically repairs truncated model output if tokens are exceeded.
   - Slices incomplete objects up to the last valid `}` and balances brackets `]`.
   - Regex object extractor fallback guarantees that generating questions never crashes with `SyntaxError: Expected ',' or '}' in JSON`.

---

## 💾 Storage Quotas (150 Students / 1GB Supabase Free Tier)

To guarantee that 150 student profiles fit comfortably within Supabase's 1 GB free storage limit:

| Asset Type | Per-File Quota | Bucket Name | Allowed Formats | 150 Students Est. |
| :--- | :--- | :--- | :--- | :--- |
| **Resumes** | **1.0 MB** | `resumes` | PDF, DOC, DOCX | ~150 MB |
| **Certificates** | **800 KB** | `certificates` | PDF, PNG, JPG, WEBP | ~360 MB (3 docs/user) |
| **Internship Docs** | **800 KB** (Mandatory) | `certificates` | PDF, PNG, JPG | ~120 MB |
| **Profile Avatars** | **500 KB** | `avatars` | PNG, JPG, WEBP | ~75 MB |
| **Safety Buffer** | — | — | — | **~295 MB free** |

---

## 🗄️ Database Migrations & SQL Maintenance

### Critical Schema Updates

Execute the following SQL in Supabase SQL Editor if setting up a new project or synchronizing tables:

```sql
-- 1. Assessment columns & proctoring configuration
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS proctor_config JSONB DEFAULT '{"warning_delay_seconds":5,"second_offense_action":"submit","detection_interval_ms":1500}'::jsonb,
  ADD COLUMN IF NOT EXISTS retake_question_bank JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registration_start TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT DEFAULT 'admin';

-- 2. Test attempts retake tracking
ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS retake_reason TEXT,
  ADD COLUMN IF NOT EXISTS proctor_events JSONB DEFAULT '[]'::jsonb;

-- 3. Student assessment registration RLS
DROP POLICY IF EXISTS "Students can register for schedules" ON public.schedules;
CREATE POLICY "Students can register for schedules"
ON public.schedules FOR INSERT
WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Students can update own schedules" ON public.schedules;
CREATE POLICY "Students can update own schedules"
ON public.schedules FOR UPDATE
USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Notification dismissal / deletion RLS
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('certificates', 'certificates', true, 819200, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('resumes', 'resumes', true, 1048576, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
```

---

## 🛡️ Client-Side Document Extraction (No Edge Function Dependency)

- **PDF Extraction**: Handled via `pdfjs-dist` worker directly in browser canvas memory.
- **DOCX Extraction**: Handled via `mammoth` client-side array buffer parsing.
- **AI Formatting**: Extracted raw text is passed to `extractQuestionsFromTextAI` via `/api/gemini`.
- This eliminates all CORS errors from external edge functions (`extract-questions-pdf`) and runs reliably in any environment.
