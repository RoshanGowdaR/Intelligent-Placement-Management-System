-- Add email column to public.user_roles so user emails are stored and identifiable directly in Supabase
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create an index on email for quick lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON public.user_roles(email);

-- Backfill email from auth.users for existing rows
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    UPDATE public.user_roles
    SET email = auth.users.email
    FROM auth.users
    WHERE public.user_roles.user_id = auth.users.id
    AND public.user_roles.email IS NULL;
  END IF;
END $$;

-- Automatically populate email on future inserts/updates via trigger if not provided
CREATE OR REPLACE FUNCTION public.set_user_role_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_user_role_email ON public.user_roles;
CREATE TRIGGER tr_user_role_email
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.set_user_role_email();

-- Also ensure companies table has email column for direct recruiter email identification
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies(email);
