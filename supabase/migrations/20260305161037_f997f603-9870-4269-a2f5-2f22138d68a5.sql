
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS job_role text,
  ADD COLUMN IF NOT EXISTS salary_package text,
  ADD COLUMN IF NOT EXISTS job_location text,
  ADD COLUMN IF NOT EXISTS job_type text DEFAULT 'Full-time',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS requirements text[],
  ADD COLUMN IF NOT EXISTS max_backlogs integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowed_branches text[],
  ADD COLUMN IF NOT EXISTS bond_details text,
  ADD COLUMN IF NOT EXISTS selection_process text[];
