
-- Drop the overly permissive policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- Replace with a proper policy: only authenticated users (via service role edge functions will bypass RLS)
-- Admins already have insert via the other policy. For edge functions using service_role key, RLS is bypassed.
