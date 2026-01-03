-- ============================================
-- EPIKOM HUB - CLIENTS & PROJECT TYPES
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: CLIENTS TABLE
-- ============================================

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  whatsapp TEXT,
  company TEXT,
  
  -- Contact info
  address TEXT,
  city TEXT,
  country TEXT,
  website TEXT,
  
  -- Avatar/Logo
  avatar_url TEXT,
  
  -- Preferences (JSON)
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "sms": false,
    "whatsapp": false
  }'::jsonb,
  
  -- Internal notes (admin only)
  internal_notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins can manage clients
DROP POLICY IF EXISTS "Admins full access to clients" ON clients;
CREATE POLICY "Admins full access to clients"
ON clients FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Clients can view their own record
DROP POLICY IF EXISTS "Clients can view own record" ON clients;
CREATE POLICY "Clients can view own record"
ON clients FOR SELECT TO authenticated
USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at 
  BEFORE UPDATE ON clients 
  FOR EACH ROW 
  EXECUTE FUNCTION update_clients_updated_at();


-- ============================================
-- PART 2: MODIFY PROJECTS TABLE
-- ============================================

-- Create enum types for project
DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('web', 'graphic', 'social_media', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE duration_type AS ENUM ('fixed', 'indefinite');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to projects
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS project_type project_type DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS duration_type duration_type DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
    "on_start": true,
    "on_deliverable_due": true,
    "reminder_hours_before": 24
  }'::jsonb;

-- Note: client_id already exists in projects table
-- We'll link it to the new clients table

-- Create index for project_type
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_duration_type ON projects(duration_type);


-- ============================================
-- PART 3: SOCIAL MEDIA POSTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  content TEXT,
  media_urls TEXT[], -- Array of media URLs
  
  -- Platform
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'other')),
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'cancelled')),
  
  -- Notification settings
  notify_before_hours INTEGER DEFAULT 2, -- Hours before to send reminder
  notification_sent BOOLEAN DEFAULT false,
  
  -- Metadata
  hashtags TEXT[],
  notes TEXT,
  
  -- Approval
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_project ON social_media_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_media_posts(scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_media_posts(platform);

-- RLS
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to social posts" ON social_media_posts;
CREATE POLICY "Admins full access to social posts"
ON social_media_posts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Clients can view their social posts" ON social_media_posts;
CREATE POLICY "Clients can view their social posts"
ON social_media_posts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = social_media_posts.project_id 
    AND p.client_id = auth.uid()
  )
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS social_posts_updated_at ON social_media_posts;
CREATE TRIGGER social_posts_updated_at 
  BEFORE UPDATE ON social_media_posts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_clients_updated_at();


-- ============================================
-- PART 4: SCHEDULED REMINDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What this reminder is for
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('deliverable', 'social_post', 'project_deadline', 'custom')),
  
  -- References
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
  social_post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE,
  
  -- Who to notify
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- When to send
  scheduled_for TIMESTAMPTZ NOT NULL,
  
  -- Message
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  
  -- Retry info
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON scheduled_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_user ON scheduled_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_project ON scheduled_reminders(project_id);

-- RLS
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reminders" ON scheduled_reminders;
CREATE POLICY "Users can view own reminders"
ON scheduled_reminders FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins full access to reminders" ON scheduled_reminders;
CREATE POLICY "Admins full access to reminders"
ON scheduled_reminders FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));


-- ============================================
-- PART 5: CLIENT INTERACTIONS/ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Type of interaction
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'email_sent', 'email_received', 'call', 'meeting', 
    'project_created', 'file_shared', 'note_added', 'other'
  )),
  
  -- Details
  title TEXT NOT NULL,
  description TEXT,
  
  -- Who logged it
  logged_by UUID REFERENCES profiles(id),
  
  -- Related project (optional)
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interactions_client ON client_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON client_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON client_interactions(created_at DESC);

-- RLS
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to interactions" ON client_interactions;
CREATE POLICY "Admins full access to interactions"
ON client_interactions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));


-- ============================================
-- PART 6: AUTO-CREATE INTERACTION ON PROJECT
-- ============================================

CREATE OR REPLACE FUNCTION log_project_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log interaction when project is created
  IF NEW.client_id IS NOT NULL THEN
    -- First check if client exists in clients table
    IF EXISTS (SELECT 1 FROM clients WHERE id = NEW.client_id) THEN
      INSERT INTO client_interactions (client_id, interaction_type, title, description, project_id)
      VALUES (
        NEW.client_id,
        'project_created',
        'Nuevo proyecto creado: ' || NEW.name,
        'Se creó el proyecto "' || NEW.name || '"',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created_log ON projects;
CREATE TRIGGER on_project_created_log
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION log_project_creation();


-- ============================================
-- PART 7: NOTIFICATION TRIGGER FOR PROJECT START
-- ============================================

CREATE OR REPLACE FUNCTION notify_project_start()
RETURNS TRIGGER AS $$
DECLARE
  client_email TEXT;
  client_name TEXT;
BEGIN
  -- Get client info
  SELECT c.email, c.name INTO client_email, client_name
  FROM clients c
  WHERE c.id = NEW.client_id;
  
  -- Create notification for client (if they have a profile)
  INSERT INTO notifications (user_id, type, title, message, link, project_id)
  SELECT p.id, 'project_update', 
    '¡Nuevo proyecto iniciado!',
    'Tu proyecto "' || NEW.name || '" ha sido creado',
    '/projects/' || NEW.id,
    NEW.id
  FROM profiles p
  WHERE p.email = client_email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_start_notify ON projects;
CREATE TRIGGER on_project_start_notify
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_project_start();


-- ============================================
-- PART 8: HELPER VIEWS
-- ============================================

-- View: Clients with project counts
CREATE OR REPLACE VIEW clients_with_stats AS
SELECT 
  c.*,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') as active_projects,
  COUNT(DISTINCT p.id) as total_projects,
  MAX(p.updated_at) as last_project_activity
FROM clients c
LEFT JOIN projects p ON p.client_id = c.id
GROUP BY c.id;

-- View: Overdue deliverables
CREATE OR REPLACE VIEW overdue_deliverables AS
SELECT 
  d.*,
  p.name as project_name,
  p.client_id,
  c.name as client_name,
  c.email as client_email,
  EXTRACT(DAY FROM NOW() - d.due_date) as days_overdue
FROM deliverables d
JOIN projects p ON p.id = d.project_id
LEFT JOIN clients c ON c.id = p.client_id
WHERE d.status NOT IN ('approved', 'cancelled')
  AND d.due_date < NOW()
ORDER BY d.due_date ASC;


-- ============================================
-- DONE!
-- ============================================

SELECT '✅ Clients, Project Types, Social Media Posts, and Reminders configured!' as status;
