-- ========================================
-- Migration 002: Clients catalog, due_time, notifications
-- ========================================
-- Run once in Supabase SQL editor.
-- Idempotent: safe to re-run.

-- ----------------------------------------
-- 1) Clients catalog
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  tier        TEXT NOT NULL DEFAULT 'B' CHECK (tier IN ('A','B+','B','C')),
  language    TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es','en')),
  company     TEXT,                 -- 'epikom' | 'pub_colectiva' | null
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_read_auth"  ON public.clients;
DROP POLICY IF EXISTS "clients_admin_write" ON public.clients;

CREATE POLICY "clients_read_auth" ON public.clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "clients_admin_write" ON public.clients
  FOR ALL  USING (public.is_admin())
           WITH CHECK (public.is_admin());

-- Seed the real Epikom + Pub. Colectiva clients (upsert on slug)
INSERT INTO public.clients (slug, name, tier, language, company) VALUES
  ('national',        'National',               'A',  'es', 'epikom'),
  ('pitusa',          'Pitusa',                 'A',  'es', 'epikom'),
  ('ig_sports',       'IG Sports Academy',      'A',  'en', 'epikom'),
  ('misresultados',   'misResultados',          'A',  'es', 'epikom'),
  ('mesalve',         'Mesalve',                'A',  'es', 'epikom'),
  ('el_alamo',        'Panadería El Alamo',     'B',  'es', 'epikom'),
  ('priority1',       'Priority 1 Sign',        'B',  'es', 'epikom'),
  ('shops_caguas',    'Shops@Caguas',           'A',  'es', 'pub_colectiva'),
  ('montehiedra',     'The Outlets at Montehiedra','A','es', 'pub_colectiva'),
  ('plaza_centro',    'Plaza Centro',           'B+', 'es', 'pub_colectiva'),
  ('acha',            'ACHA Trading',           'A',  'es', 'epikom'),
  ('lumen',           'Lumen Studio',           'B',  'es', 'epikom'),
  ('cardona',         'Cardona',                'A',  'es', 'epikom'),
  ('orbe',            'Orbe Café',              'C',  'es', 'epikom')
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      tier = EXCLUDED.tier,
      language = EXCLUDED.language,
      company = EXCLUDED.company;

-- ----------------------------------------
-- 2) due_time on tasks
-- ----------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS due_time TIME;

-- Optional free-text context shown in the task drawer
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS context TEXT;

-- ----------------------------------------
-- 3) Notifications
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('assign','mention','standup','deadline','approval','note')),
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  unread      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id) WHERE unread;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own_read"   ON public.notifications;
DROP POLICY IF EXISTS "notifications_own_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_auth_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_own_delete" ON public.notifications;

-- Users only see their own notifications
CREATE POLICY "notifications_own_read" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can mark their own notifications read/unread
CREATE POLICY "notifications_own_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
             WITH CHECK (user_id = auth.uid());

-- Any authenticated user can create notifications (to @mention / assign others).
-- The server-side flow always does it via service role anyway.
CREATE POLICY "notifications_auth_insert" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notifications_own_delete" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());
