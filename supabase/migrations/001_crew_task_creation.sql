-- ========================================
-- Migration 001: Allow any crew member to create tasks
-- ========================================
-- Run once in Supabase SQL editor.
-- Idempotent: safe to re-run.

-- Track who created the task (nullable so existing rows stay valid)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- Replace admin-only insert with authenticated-insert
DROP POLICY IF EXISTS "tasks_admin_insert" ON public.tasks;

CREATE POLICY "tasks_authenticated_insert" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow the task creator OR the assignee to add/remove client tags
DROP POLICY IF EXISTS "task_clients_admin_write" ON public.task_clients;

CREATE POLICY "task_clients_write" ON public.task_clients
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_clients.task_id
        AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_clients.task_id
        AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
    )
  );
