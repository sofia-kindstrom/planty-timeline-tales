-- Index för snabbare RLS-filter och listning per användare
CREATE INDEX IF NOT EXISTS idx_plants_user_id ON public.plants(user_id);
CREATE INDEX IF NOT EXISTS idx_plants_user_created ON public.plants(user_id, created_at);

-- Index för snabbare hämtning av händelser per växt (används av timeline + RLS-policyns subquery)
CREATE INDEX IF NOT EXISTS idx_plant_events_plant_id ON public.plant_events(plant_id);
CREATE INDEX IF NOT EXISTS idx_plant_events_plant_date ON public.plant_events(plant_id, event_at DESC);