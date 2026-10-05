-- Migration: 20261005084500_complete_student_profile_studio.sql
-- Description: Adds all columns required by the 10 sections of Student Profile Studio
--              and sets up the 'avatars' storage bucket with public access and secure RLS.

-- 1. Add all student profile and studio columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS usn TEXT,
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS is_lateral_entry BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_semester INTEGER DEFAULT null,
ADD COLUMN IF NOT EXISTS marks_cards JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sgpas JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS leetcode_url TEXT,
ADD COLUMN IF NOT EXISTS hackerrank_url TEXT,
ADD COLUMN IF NOT EXISTS experience JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '["English"]'::jsonb,
ADD COLUMN IF NOT EXISTS job_preferences JSONB DEFAULT '{"roles": "Full-Stack Developer, Backend Engineer, SDE-1", "workMode": "hybrid", "employmentType": "full_time", "locations": "Bengaluru, Remote", "noticePeriod": "immediate", "expectedCtc": "₹8–12 LPA"}'::jsonb,
ADD COLUMN IF NOT EXISTS verified_evidence JSONB DEFAULT '{"identity": true, "email": true, "skills": false, "project": false, "assessment": false}'::jsonb,
ADD COLUMN IF NOT EXISTS backlogs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_backlogs INTEGER DEFAULT 0;

-- 2. Create the 'avatars' bucket in Supabase Storage (public = true for fast CDN delivery)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Secure Row-Level Security (RLS) policies for storage.objects
DO $$
BEGIN
  -- Select policy (public read access for avatar images)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;

  -- Insert policy (users can only upload to their own user folder)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload own avatar'
  ) THEN
    CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Update policy (users can update their own avatar)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own avatar'
  ) THEN
    CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Delete policy (users can delete their own avatar)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own avatar'
  ) THEN
    CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'avatars' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- 4. Force PostgREST schema cache reload immediately
NOTIFY pgrst, 'reload schema';
