
-- Plants table
CREATE TABLE public.plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  species TEXT,
  room TEXT,
  watering_interval_days INTEGER,
  light_needs TEXT,
  acquired_at DATE,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plant events (timeline)
CREATE TABLE public.plant_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  event_at DATE NOT NULL DEFAULT CURRENT_DATE,
  label TEXT NOT NULL,
  note TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX plant_events_plant_id_event_at_idx ON public.plant_events(plant_id, event_at);

-- Grants (single-user personal app, no auth — allow anon full access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_events TO anon, authenticated;
GRANT ALL ON public.plants TO service_role;
GRANT ALL ON public.plant_events TO service_role;

-- RLS
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access to plants" ON public.plants
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public full access to plant_events" ON public.plant_events
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- updated_at trigger for plants
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER plants_set_updated_at
  BEFORE UPDATE ON public.plants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('plant-images', 'plant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow anyone to upload/read/delete in this bucket
CREATE POLICY "Public read plant images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'plant-images');

CREATE POLICY "Public upload plant images" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'plant-images');

CREATE POLICY "Public update plant images" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'plant-images');

CREATE POLICY "Public delete plant images" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'plant-images');
