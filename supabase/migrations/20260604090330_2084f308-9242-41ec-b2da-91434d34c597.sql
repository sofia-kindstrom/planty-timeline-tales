ALTER TABLE public.plants
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS water_snooze_until date;

CREATE INDEX IF NOT EXISTS idx_plants_tags ON public.plants USING gin(tags);