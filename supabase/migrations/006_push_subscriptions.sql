-- ========================================
-- Migration 006: Web Push subscriptions
-- ========================================
-- Run once in Supabase SQL editor.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_sub_self_read"   ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_sub_self_write"  ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_sub_self_delete" ON public.push_subscriptions;

-- El usuario solo ve / modifica sus propias suscripciones.
-- (El backend usa service role para enviar push a otros).
CREATE POLICY "push_sub_self_read" ON public.push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "push_sub_self_write" ON public.push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_sub_self_delete" ON public.push_subscriptions
  FOR DELETE USING (user_id = auth.uid());
