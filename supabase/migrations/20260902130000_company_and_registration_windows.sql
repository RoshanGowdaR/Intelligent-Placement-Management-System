-- Add 'company' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company';

-- Create company invites table
CREATE TABLE IF NOT EXISTS public.company_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  company_name TEXT,
  invited_by UUID,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage company invites" ON public.company_invites;
CREATE POLICY "Admins can manage company invites"
ON public.company_invites FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can view company invite by token" ON public.company_invites;
CREATE POLICY "Anyone can view company invite by token"
ON public.company_invites FOR SELECT
USING (true);

CREATE INDEX IF NOT EXISTS idx_company_invites_token ON public.company_invites(token);
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON public.company_invites(email);

-- Add company user relationship and fields to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS hr_name TEXT,
  ADD COLUMN IF NOT EXISTS hr_phone TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add registration timeline and creator role to tests
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS registration_start TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT DEFAULT 'admin';

-- Enable Companies to update their own company profile
DROP POLICY IF EXISTS "Companies can update own profile" ON public.companies;
CREATE POLICY "Companies can update own profile"
ON public.companies FOR UPDATE
USING (user_id = auth.uid());

-- Enable Companies to insert/update/delete their own tests
DROP POLICY IF EXISTS "Companies can insert own tests" ON public.tests;
CREATE POLICY "Companies can insert own tests"
ON public.tests FOR INSERT
WITH CHECK (has_role(auth.uid(), 'company'::app_role));

DROP POLICY IF EXISTS "Companies can update own tests" ON public.tests;
CREATE POLICY "Companies can update own tests"
ON public.tests FOR UPDATE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Companies can delete own tests" ON public.tests;
CREATE POLICY "Companies can delete own tests"
ON public.tests FOR DELETE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Enable Companies to view attempts for their tests
DROP POLICY IF EXISTS "Companies can view attempts for their tests" ON public.test_attempts;
CREATE POLICY "Companies can view attempts for their tests"
ON public.test_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = test_attempts.test_id
    AND (tests.created_by = auth.uid() OR tests.company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))
  ) OR has_role(auth.uid(), 'admin'::app_role) OR student_id = auth.uid()
);
