-- ========================================
-- Migration 005: Teléfono del crew + preferencias SMS
-- ========================================
-- Run once in Supabase SQL editor.
-- Idempotent: safe to re-run.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS sms_on_assign BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sms_daily_digest BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill phones (E.164). Patricia no recibe SMS (no está en el crew activo).
UPDATE public.users SET phone = '+17872409612' WHERE slug = 'laura';
UPDATE public.users SET phone = '+573024695398' WHERE slug = 'onasis';
UPDATE public.users SET phone = '+17876000443' WHERE slug = 'christopher';
UPDATE public.users SET phone = '+17873880032' WHERE slug = 'alexander';
UPDATE public.users SET phone = '+17874771372' WHERE slug = 'elissa';
