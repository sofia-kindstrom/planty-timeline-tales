-- Custom, plant-linked reminders ("egna plantsysslor")
CREATE TABLE public.plant_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  remind_at DATE NOT NULL DEFAULT CURRENT_DATE,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX plant_reminders_plant_id_idx ON public.plant_reminders(plant_id);
CREATE INDEX plant_reminders_remind_at_idx ON public.plant_reminders(remind_at);

-- Grants (owner-only via RLS below)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_reminders TO authenticated;
GRANT ALL ON public.plant_reminders TO service_role;

-- RLS: single-user app — any authenticated user has full access, anon blocked.
-- Mirrors the live plant_events policy (plants.user_id is unused / null in this project).
ALTER TABLE public.plant_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth access to plant_reminders" ON public.plant_reminders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
