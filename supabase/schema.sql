-- ========================================
-- Epikom Ops Hub — Database Schema
-- ========================================
-- Run this in Supabase SQL editor after creating the project.
-- ========================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- TABLE: users
-- ========================================
-- Extends auth.users with app-specific fields
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'crew')),
  phone TEXT,
  notification_preferences JSONB DEFAULT
    '{"sms": true, "push": true, "email": true}'::jsonb,
  push_subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_slug ON public.users(slug);
CREATE INDEX idx_users_role ON public.users(role);

-- ========================================
-- TABLE: weeks
-- ========================================
-- One record per weekly JSON upload
CREATE TABLE IF NOT EXISTS public.weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL UNIQUE,
  week_end_date DATE NOT NULL,
  priorities JSONB,
  deadlines JSONB,
  rotation_national JSONB,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES public.users(id),
  raw_file JSONB
);

CREATE INDEX idx_weeks_start ON public.weeks(week_start_date DESC);

-- ========================================
-- TABLE: tasks
-- ========================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES public.users(id),
  due_date DATE NOT NULL,
  task_type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  status TEXT DEFAULT 'pendiente' CHECK (status IN
    ('pendiente', 'en_progreso', 'completada', 'bloqueada')),
  notion_url TEXT,
  completed_at TIMESTAMPTZ,
  user_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned_due ON public.tasks(assigned_to, due_date);
CREATE INDEX idx_tasks_week ON public.tasks(week_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- ========================================
-- TABLE: task_clients (many-to-many)
-- ========================================
-- A task can be associated with multiple clients
CREATE TABLE IF NOT EXISTS public.task_clients (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  PRIMARY KEY (task_id, client_name)
);

CREATE INDEX idx_task_clients_client ON public.task_clients(client_name);

-- ========================================
-- TABLE: scheduled_notifications
-- ========================================
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'push')),
  send_at TIMESTAMPTZ NOT NULL,
  content JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN
    ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_pending ON public.scheduled_notifications(send_at)
  WHERE status = 'pending';

-- ========================================
-- TRIGGERS: auto-update updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper bypasses RLS to avoid infinite recursion
-- when policies on public.users need to check admin role.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ========================================
-- POLICIES: users
-- ========================================

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_admin_read_all" ON public.users
  FOR SELECT USING (public.is_admin());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_admin_insert" ON public.users
  FOR INSERT WITH CHECK (public.is_admin());

-- ========================================
-- POLICIES: weeks
-- ========================================

CREATE POLICY "weeks_read_all" ON public.weeks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "weeks_admin_write" ON public.weeks
  FOR ALL USING (public.is_admin());

-- ========================================
-- POLICIES: tasks
-- ========================================

CREATE POLICY "tasks_read" ON public.tasks
  FOR SELECT USING (auth.uid() = assigned_to OR public.is_admin());

CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (auth.uid() = assigned_to);

CREATE POLICY "tasks_admin_insert" ON public.tasks
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "tasks_admin_delete" ON public.tasks
  FOR DELETE USING (public.is_admin());

-- ========================================
-- POLICIES: task_clients
-- ========================================

CREATE POLICY "task_clients_read" ON public.task_clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_clients.task_id
        AND (tasks.assigned_to = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "task_clients_admin_write" ON public.task_clients
  FOR ALL USING (public.is_admin());

-- ========================================
-- POLICIES: scheduled_notifications
-- ========================================

CREATE POLICY "notifs_read_own" ON public.scheduled_notifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "notifs_admin_write" ON public.scheduled_notifications
  FOR ALL USING (public.is_admin());
