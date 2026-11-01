
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  genre TEXT,
  notes TEXT,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.songs TO authenticated;
GRANT ALL ON public.songs TO service_role;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own songs" ON public.songs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  mix_score NUMERIC(3,1) NOT NULL,
  master_score NUMERIC(3,1) NOT NULL,
  arrangement_score NUMERIC(3,1) NOT NULL,
  similarity_score NUMERIC(3,1) NOT NULL,
  technical_score NUMERIC(3,1) NOT NULL,
  overall_score NUMERIC(3,1) NOT NULL,
  detected_genre TEXT,
  summary TEXT NOT NULL,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own analyses" ON public.analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own analyses" ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage policies for 'songs' bucket: users can only access files under their own user-id prefix
CREATE POLICY "Users read own song files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'songs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own song files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'songs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own song files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'songs' AND (storage.foldername(name))[1] = auth.uid()::text);
