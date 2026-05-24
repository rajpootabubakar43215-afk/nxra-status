CREATE TABLE public.nxr4_player_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  sightings integer NOT NULL DEFAULT 0,
  total_score bigint NOT NULL DEFAULT 0,
  last_server text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  first_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nxr4_player_sightings ON public.nxr4_player_activity (sightings DESC);
CREATE INDEX idx_nxr4_player_last_seen ON public.nxr4_player_activity (last_seen DESC);

ALTER TABLE public.nxr4_player_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity is viewable by everyone"
  ON public.nxr4_player_activity FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_nxr4_player_activity_updated
  BEFORE UPDATE ON public.nxr4_player_activity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();