ALTER TABLE public.plants
  ADD COLUMN parent_id uuid REFERENCES public.plants(id) ON DELETE SET NULL;

CREATE INDEX idx_plants_parent_id ON public.plants(parent_id);