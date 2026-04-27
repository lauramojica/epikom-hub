-- ========================================
-- Migration 003: Multi-asignees por tarea
-- ========================================
-- Run once in Supabase SQL editor.
-- Idempotent: safe to re-run.
--
-- tasks.assigned_to se mantiene como "primary assignee" para compat
-- (es siempre el primero del array). La tabla task_assignees es la
-- fuente de verdad para "quién está en esta tarea".

CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);

-- Backfill: cada tarea existente -> (id, assigned_to) marcado como primary
INSERT INTO public.task_assignees (task_id, user_id, is_primary)
SELECT id, assigned_to, TRUE
FROM public.tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO UPDATE
  SET is_primary = TRUE;

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_assignees_read_auth"   ON public.task_assignees;
DROP POLICY IF EXISTS "task_assignees_write_admin" ON public.task_assignees;
DROP POLICY IF EXISTS "task_assignees_write_owner" ON public.task_assignees;

-- Cualquier usuario autenticado puede leer (usado por queries de "mi semana")
CREATE POLICY "task_assignees_read_auth" ON public.task_assignees
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin puede escribir cualquier fila
CREATE POLICY "task_assignees_write_admin" ON public.task_assignees
  FOR ALL USING (public.is_admin())
          WITH CHECK (public.is_admin());

-- Asignee actual o creador puede modificar la lista
CREATE POLICY "task_assignees_write_owner" ON public.task_assignees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
        AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
        AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
    )
  );
