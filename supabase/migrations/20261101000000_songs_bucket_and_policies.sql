-- Private storage bucket for uploaded tracks (50 MB limit, matches the upload form).
-- Access is governed by the storage.objects policies in the first migration:
-- each user can only touch files under their own "<user-id>/" prefix.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('songs', 'songs', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- The analyze function UPSERTs into analyses (one row per song). Re-analysing a song
-- needs an UPDATE policy, which the original schema was missing.
CREATE POLICY "Users update own analyses" ON public.analyses FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
