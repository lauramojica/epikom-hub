-- ========================================
-- Migration 004: Multi-tipo por tarea (tags free-form estilo Notion)
-- ========================================
-- Run once in Supabase SQL editor.
-- Idempotent: safe to re-run.
--
-- tasks.task_type se mantiene como string singular (= primer elemento del array)
-- por compat. tasks.task_types es la fuente de verdad para "tipos/tags de la tarea".

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_types TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: cada tarea existente -> task_types = [task_type]
UPDATE public.tasks
SET task_types = ARRAY[task_type]
WHERE (task_types IS NULL OR cardinality(task_types) = 0)
  AND task_type IS NOT NULL
  AND task_type <> '';

-- Index GIN para filtrar tareas por tipo (e.g. ?type=Reel)
CREATE INDEX IF NOT EXISTS idx_tasks_task_types ON public.tasks USING gin (task_types);
