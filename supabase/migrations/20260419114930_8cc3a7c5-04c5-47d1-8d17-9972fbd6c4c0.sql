
-- PLAYERS
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  headshots INTEGER NOT NULL DEFAULT 0,
  suicides INTEGER NOT NULL DEFAULT 0,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_kills ON public.players (kills DESC);
CREATE INDEX idx_players_last_seen ON public.players (last_seen DESC);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players are viewable by everyone"
  ON public.players FOR SELECT
  USING (true);

-- KILL EVENTS
CREATE TABLE public.kill_events (
  id BIGSERIAL PRIMARY KEY,
  attacker TEXT,
  victim TEXT NOT NULL,
  weapon TEXT,
  mod TEXT,
  hitloc TEXT,
  map TEXT,
  gametype TEXT,
  is_headshot BOOLEAN NOT NULL DEFAULT false,
  is_suicide BOOLEAN NOT NULL DEFAULT false,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kill_events_attacker ON public.kill_events (attacker);
CREATE INDEX idx_kill_events_victim ON public.kill_events (victim);
CREATE INDEX idx_kill_events_occurred ON public.kill_events (occurred_at DESC);

ALTER TABLE public.kill_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kill events are viewable by everyone"
  ON public.kill_events FOR SELECT
  USING (true);

-- WEAPON STATS
CREATE TABLE public.weapon_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  weapon TEXT NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  headshots INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_name, weapon)
);

CREATE INDEX idx_weapon_stats_player ON public.weapon_stats (player_name);
CREATE INDEX idx_weapon_stats_kills ON public.weapon_stats (kills DESC);

ALTER TABLE public.weapon_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weapon stats are viewable by everyone"
  ON public.weapon_stats FOR SELECT
  USING (true);

-- LOG STATE (tracks parsing progress)
CREATE TABLE public.log_state (
  id TEXT PRIMARY KEY,
  last_size BIGINT NOT NULL DEFAULT 0,
  last_parsed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_map TEXT,
  current_gametype TEXT,
  notes TEXT
);

ALTER TABLE public.log_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Log state viewable by everyone"
  ON public.log_state FOR SELECT
  USING (true);

INSERT INTO public.log_state (id, last_size) VALUES ('games_mp.log', 0);
