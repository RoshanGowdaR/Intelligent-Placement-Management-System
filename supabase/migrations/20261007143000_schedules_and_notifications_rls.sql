-- ==============================================================================
-- Migration: Fix schedules RLS for student registrations & notifications deletion
-- Intelligent Placement Management System (IPMS)
-- ==============================================================================

-- 1. Enable students to register for assessments (INSERT and UPDATE on schedules)
DROP POLICY IF EXISTS "Students can register for schedules" ON public.schedules;
CREATE POLICY "Students can register for schedules"
ON public.schedules FOR INSERT
WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Students can update own schedules" ON public.schedules;
CREATE POLICY "Students can update own schedules"
ON public.schedules FOR UPDATE
USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Enable users and admins to delete/dismiss their notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Ensure test configuration and registration window columns exist on tests
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS proctor_config JSONB DEFAULT '{"warning_delay_seconds":5,"second_offense_action":"submit","detection_interval_ms":1500}'::jsonb,
  ADD COLUMN IF NOT EXISTS retake_question_bank JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registration_start TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT DEFAULT 'admin';

-- 4. Ensure test attempts track retakes and proctor violations
ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS retake_reason TEXT,
  ADD COLUMN IF NOT EXISTS proctor_events JSONB DEFAULT '[]'::jsonb;

-- 5. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
