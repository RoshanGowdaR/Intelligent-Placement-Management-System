# 🗄️ Database Entity-Relationship Specification (ERD)
## Intelligent Placement Management System (IPMS Elite)

---

### Overview
This document specifies the complete PostgreSQL 15 database schema, referential integrity rules, primary/foreign keys, indices, and Row Level Security (RLS) enforcement in IPMS Elite.

> **Visual Diagram**: See the high-resolution vector diagram at [`docs/ERD.svg`](ERD.svg).

---

## 1. Entity Relationship Model

```
       +--------------------+
       |     auth.users     |
       +---------+----------+
                 |
        1:1      |      1:N
   +-------------+-------------+
   |                           |
   v                           v
+--+-------------+     +-------+--------+
|    profiles    |     |   companies    |
+--+----------+--+     +---+-------+----+
   |          |            |       |
   | 1:N      | 1:N    1:N |       | 1:N
   |          +------+     |       |
   |                 |     |       |
   v                 v     v       v
+--+----------+    +-+-----+--+  +-+-----------+
|test_attempts|<---+   tests  |  | drive_rounds|
+-------------+    +----------+  +-----+-------+
                                       |
                                       | 1:N
                                       v
                                 +-----+------------+
                                 |round_participants|
                                 +------------------+
```

---

## 2. Table Specifications & Cardinalities

### 2.1 `profiles` (Student Candidate Records)
- **Primary Key**: `id` (`uuid`, references `auth.users(id)` ON DELETE CASCADE).
- **Unique Keys**: `usn` (case-insensitive university seat number).
- **Attributes**: `name`, `email`, `branch`, `cgpa`, `backlogs`, `profile_completion_percentage`, `resume_url`, `skills`, `certifications` (JSONB), `marks_cards` (JSONB), `linkedin_url`, `github_url`.
- **Relationships**:
  - `1:N` to `test_attempts` via `student_id`.
  - `1:N` to `round_participants` via `student_id`.
  - `1:N` to `schedules` via `student_id`.

### 2.2 `companies` (Visiting Corporate Recruiters)
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`).
- **Foreign Key**: `user_id` (`uuid`, references `auth.users(id)`).
- **Attributes**: `name`, `job_role`, `salary_package`, `job_location`, `eligibility_criteria` (JSONB), `allowed_branches` (text[]), `max_backlogs`, `logo_url`, `contact_info` (JSONB).
- **Relationships**:
  - `1:N` to `tests` via `company_id`.
  - `1:N` to `drive_rounds` via `company_id`.

### 2.3 `tests` (Assessments & Question Banks)
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`).
- **Foreign Key**: `company_id` (`uuid`, references `companies(id)` ON DELETE SET NULL).
- **Attributes**: `title`, `duration` (minutes), `scheduled_date`, `registration_deadline`, `question_bank` (JSONB), `pass_criteria` (JSONB), `proctor_config` (JSONB), `questions_per_student`.
- **Relationships**:
  - `1:N` to `test_attempts` via `test_id`.
  - `1:N` to `schedules` via `test_id`.

### 2.4 `test_attempts` (Live Exam Logs & Integrity Telemetry)
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`).
- **Foreign Keys**:
  - `test_id` (`uuid`, references `tests(id)` ON DELETE CASCADE).
  - `student_id` (`uuid`, references `profiles(id)` ON DELETE CASCADE).
- **Attributes**: `total_score`, `passed`, `tab_switches`, `auto_submitted`, `proctor_events` (JSONB), `answers` (JSONB), `scores` (JSONB), `completed_at`, `started_at`, `attempt_number`.

### 2.5 `drive_rounds` (Sequential Recruitment Pipeline)
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`).
- **Foreign Key**: `company_id` (`uuid`, references `companies(id)` ON DELETE CASCADE).
- **Attributes**: `round_number` (1, 2, 3), `round_name` (e.g. "Online Assessment"), `round_type` (`test`, `interview`, `group_discussion`, `other`), `passing_logic` (`cutoff_score`, `top_n`, `top_percent`, `manual`), `passing_value`, `auto_progress`, `is_published`.

### 2.6 `round_participants` (Sequential Gating & Evaluations)
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`).
- **Foreign Keys**:
  - `drive_round_id` (`uuid`, references `drive_rounds(id)` ON DELETE CASCADE).
  - `student_id` (`uuid`, references `profiles(id)` ON DELETE CASCADE).
- **Attributes**: `status` (`pending`, `qualified`, `not_qualified`, `absent`), `score`, `recruiter_notes`, `evaluated_by`, `evaluated_at`.

---

## 3. Database Indices & Performance Optimization

```sql
-- Fast candidate lookups by USN & Branch
CREATE INDEX IF NOT EXISTS idx_profiles_usn ON public.profiles(usn);
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch);

-- Fast attempt lookups by test and student
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON public.test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON public.test_attempts(student_id);

-- Multi-round participant gating query accelerator
CREATE INDEX IF NOT EXISTS idx_round_parts_lookup ON public.round_participants(drive_round_id, student_id, status);
```
