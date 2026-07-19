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

-- RLS: scoped via plant ownership, mirroring plant_events
ALTER TABLE public.plant_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view their reminders" ON public.plant_reminders
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Owner can insert their reminders" ON public.plant_reminders
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Owner can update their reminders" ON public.plant_reminders
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Owner can delete their reminders" ON public.plant_reminders
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid())
  );
