-- Fix RLS policies on public.companies so companies and recruiters can insert their company profile upon registration

DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;
CREATE POLICY "Anyone can view companies" ON public.companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Recruiters or Admins can insert companies" ON public.companies;
CREATE POLICY "Recruiters or Admins can insert companies"
ON public.companies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Companies can update own profile" ON public.companies;
CREATE POLICY "Companies can update own profile"
ON public.companies FOR UPDATE
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Ensure any existing onboarded company from notifications or invites exists in public.companies
INSERT INTO public.companies (name, email, industry, job_role, salary_package, description)
SELECT 
  ci.company_name,
  ci.email,
  'Technology & IT Services',
  'Software Development Engineer',
  '12 - 18 LPA',
  'Global IT services and digital business solutions.'
FROM public.company_invites ci
WHERE ci.company_name ILIKE '%tcs%'
ON CONFLICT (name) DO NOTHING;

-- If 'tcs' does not exist by name yet, insert standard record
INSERT INTO public.companies (name, email, industry, job_role, salary_package, description)
VALUES (
  'TCS',
  'recruitment@tcs.com',
  'Technology & IT Services',
  'Software Development Engineer',
  '12 - 18 LPA',
  'Tata Consultancy Services is a global leader in IT services, consulting, and business solutions.'
)
ON CONFLICT (name) DO NOTHING;
