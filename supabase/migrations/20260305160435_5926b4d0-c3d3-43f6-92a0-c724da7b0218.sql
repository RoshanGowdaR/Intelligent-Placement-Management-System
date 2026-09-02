
CREATE TABLE public.password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- No RLS needed - only accessed from edge functions via service role key
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Create index for fast lookups
CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes(email);
