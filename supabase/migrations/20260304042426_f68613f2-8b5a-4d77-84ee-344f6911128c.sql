-- Add skills array to student profiles
ALTER TABLE public.profiles ADD COLUMN skills text[] DEFAULT '{}';

-- Add an index for skills search
CREATE INDEX idx_profiles_skills ON public.profiles USING GIN(skills);