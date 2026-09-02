
-- Create storage bucket for marks cards
INSERT INTO storage.buckets (id, name, public) VALUES ('markscards', 'markscards', false);

-- Storage policies for marks cards
CREATE POLICY "Users can upload own marks cards"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'markscards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own marks cards"
ON storage.objects FOR SELECT
USING (bucket_id = 'markscards' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users can update own marks cards"
ON storage.objects FOR UPDATE
USING (bucket_id = 'markscards' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add marks card related columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_lateral_entry boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS current_semester integer DEFAULT null,
ADD COLUMN IF NOT EXISTS marks_cards jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sgpas jsonb DEFAULT '{}'::jsonb;
