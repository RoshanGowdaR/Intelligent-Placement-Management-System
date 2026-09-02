
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS retake_question_bank jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS proctor_config jsonb DEFAULT '{"warning_delay_seconds":5,"second_offense_action":"submit","detection_interval_ms":1500}'::jsonb;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS retake_reason text;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS proctor_events jsonb DEFAULT '[]'::jsonb;
