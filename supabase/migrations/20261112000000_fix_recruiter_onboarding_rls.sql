-- ==============================================================================
-- Fix Recruiter Onboarding & Role Claim RLS Policies
-- Resolves 403 Forbidden when invited recruiters submit /company/onboarding,
-- claim their company_invites & user_roles, sync drive_rounds, or notify students.
-- ==============================================================================

-- 1. public.companies RLS policies
DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;
CREATE POLICY "Anyone can view companies"
ON public.companies FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Recruiters or Admins can insert companies" ON public.companies;
CREATE POLICY "Recruiters or Admins can insert companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Companies can update own profile" ON public.companies;
CREATE POLICY "Companies can update own profile"
ON public.companies FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    user_id IS NULL
    AND (
      lower(COALESCE(email, '')) = lower(COALESCE(auth.jwt()->>'email', ''))
      OR EXISTS (
        SELECT 1 FROM public.company_invites ci
        WHERE lower(ci.email) = lower(COALESCE(auth.jwt()->>'email', ''))
          AND lower(COALESCE(ci.company_name, '')) = lower(companies.name)
      )
    )
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
CREATE POLICY "Admins can delete companies"
ON public.companies FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
);

-- 2. public.user_roles RLS policies (allow invited users to claim & sync their own role)
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Invited users can claim invited role" ON public.user_roles;
CREATE POLICY "Invited users can claim invited role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    user_id = auth.uid()
    AND (
      (
        role = 'company'::app_role
        AND EXISTS (
          SELECT 1 FROM public.company_invites ci
          WHERE lower(ci.email) = lower(COALESCE(auth.jwt()->>'email', ''))
            AND COALESCE(ci.company_name, '') <> 'Placement Admin'
        )
      )
      OR (
        role = 'admin'::app_role
        AND (
          lower(COALESCE(auth.jwt()->>'email', '')) = 'gowdaroshan49@gmail.com'
          OR EXISTS (
            SELECT 1 FROM public.company_invites ci
            WHERE lower(ci.email) = lower(COALESCE(auth.jwt()->>'email', ''))
              AND ci.company_name = 'Placement Admin'
          )
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Invited users can update own claimed role" ON public.user_roles;
CREATE POLICY "Invited users can update own claimed role"
ON public.user_roles FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    user_id = auth.uid()
    AND (
      role = 'student'::app_role
      OR (
        role = 'company'::app_role
        AND EXISTS (
          SELECT 1 FROM public.company_invites ci
          WHERE lower(ci.email) = lower(COALESCE(auth.jwt()->>'email', ''))
            AND COALESCE(ci.company_name, '') <> 'Placement Admin'
        )
      )
      OR (
        role = 'admin'::app_role
        AND (
          lower(COALESCE(auth.jwt()->>'email', '')) = 'gowdaroshan49@gmail.com'
          OR EXISTS (
            SELECT 1 FROM public.company_invites ci
            WHERE lower(ci.email) = lower(COALESCE(auth.jwt()->>'email', ''))
              AND ci.company_name = 'Placement Admin'
          )
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (user_id = auth.uid() AND role IN ('company'::app_role, 'admin'::app_role))
);

-- 3. public.company_invites UPDATE policy (allow invited user to mark accepted_at)
DROP POLICY IF EXISTS "Invited users can accept own invite" ON public.company_invites;
CREATE POLICY "Invited users can accept own invite"
ON public.company_invites FOR UPDATE
TO authenticated
USING (lower(email) = lower(COALESCE(auth.jwt()->>'email', '')))
WITH CHECK (lower(email) = lower(COALESCE(auth.jwt()->>'email', '')));

-- 4. public.notifications INSERT policy (allow recruiters to notify students during drive launch / test creation)
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins and Companies can insert notifications" ON public.notifications;
CREATE POLICY "Admins and Companies can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'company'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.companies c WHERE c.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- 5. Ensure audit_logs table exists so admin audit logging succeeds cleanly
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
