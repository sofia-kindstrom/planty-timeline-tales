
-- Add ownership to plants and lock down access
ALTER TABLE public.plants ADD COLUMN user_id uuid;
CREATE INDEX IF NOT EXISTS plants_user_id_idx ON public.plants(user_id);

-- Drop old public policies
DROP POLICY IF EXISTS "Public full access to plants" ON public.plants;
DROP POLICY IF EXISTS "Public full access to plant_events" ON public.plant_events;

-- Revoke anon access
REVOKE ALL ON public.plants FROM anon;
REVOKE ALL ON public.plant_events FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_events TO authenticated;
GRANT ALL ON public.plants TO service_role;
GRANT ALL ON public.plant_events TO service_role;

-- Plants RLS: owner-only
CREATE POLICY "Owner can view their plants" ON public.plants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert their plants" ON public.plants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update their plants" ON public.plants
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can delete their plants" ON public.plants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Plant events RLS: scoped via plant ownership
CREATE POLICY "Owner can view their events" ON public.plant_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Owner can insert their events" ON public.plant_events
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Owner can update their events" ON public.plant_events
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Owner can delete their events" ON public.plant_events
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  );

-- Storage policies: scope plant-images to per-user folder
DROP POLICY IF EXISTS "Public can read plant images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload plant images" ON storage.objects;
DROP POLICY IF EXISTS "Public can update plant images" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete plant images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read plant images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload plant images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update plant images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete plant images" ON storage.objects;

CREATE POLICY "Plant images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'plant-images');

CREATE POLICY "Users can upload to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own plant images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'plant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own plant images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'plant-images' AND auth.uid()::text = (storage.foldername(name))[1]);
