ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS metrics jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS duration_seconds numeric;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS sample_rate integer;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS channels integer;