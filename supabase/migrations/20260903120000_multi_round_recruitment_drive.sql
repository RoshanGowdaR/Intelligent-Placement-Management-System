-- Multi-Round Recruitment Drive Schema Migration

CREATE TABLE IF NOT EXISTS public.drive_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  round_number int NOT NULL,
  round_name text NOT NULL,
  round_type text NOT NULL CHECK (round_type IN ('test', 'interview', 'group_discussion', 'other')),
  test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  passing_logic text NOT NULL CHECK (passing_logic IN ('cutoff_score', 'top_n', 'top_percent', 'manual')),
  passing_value numeric,
  registration_deadline timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  auto_progress boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_company_round UNIQUE (company_id, round_number)
);

CREATE TABLE IF NOT EXISTS public.round_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_round_id uuid REFERENCES public.drive_rounds(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'not_qualified', 'absent')),
  score numeric,
  recruiter_notes text,
  evaluated_by uuid REFERENCES auth.users(id),
  evaluated_at timestamptz,
  notified_at timestamptz,
  CONSTRAINT uq_round_student UNIQUE (drive_round_id, student_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_drive_rounds_company ON public.drive_rounds(company_id, round_number);
CREATE INDEX IF NOT EXISTS idx_round_participants_round ON public.round_participants(drive_round_id);
CREATE INDEX IF NOT EXISTS idx_round_participants_student ON public.round_participants(student_id, status);

-- Enable Row Level Security
ALTER TABLE public.drive_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_participants ENABLE ROW LEVEL SECURITY;

-- 1. Policies for drive_rounds
DROP POLICY IF EXISTS "Admin and Company recruiters can manage drive_rounds" ON public.drive_rounds;
CREATE POLICY "Admin and Company recruiters can manage drive_rounds"
ON public.drive_rounds
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Students can view drive_rounds" ON public.drive_rounds;
CREATE POLICY "Students can view drive_rounds"
ON public.drive_rounds
FOR SELECT
TO authenticated
USING (
  true
);

-- 2. Policies for round_participants
DROP POLICY IF EXISTS "Admin and Company recruiters can manage round_participants" ON public.round_participants;
CREATE POLICY "Admin and Company recruiters can manage round_participants"
ON public.round_participants
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR drive_round_id IN (
    SELECT dr.id FROM public.drive_rounds dr
    JOIN public.companies c ON dr.company_id = c.id
    WHERE c.user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR drive_round_id IN (
    SELECT dr.id FROM public.drive_rounds dr
    JOIN public.companies c ON dr.company_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- Students can ONLY view their own round participant record when the round results are published!
DROP POLICY IF EXISTS "Students can view their published round results" ON public.round_participants;
CREATE POLICY "Students can view their published round results"
ON public.round_participants
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  AND drive_round_id IN (
    SELECT id FROM public.drive_rounds WHERE is_published = true
  )
);
