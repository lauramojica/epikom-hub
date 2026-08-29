-- ============================================
-- EPIKOM HUB - COMPLETE SETUP
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: STORAGE (Files)
-- ============================================

-- 1. Create the storage bucket for project files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed',
    'video/mp4', 'video/quicktime',
    'audio/mpeg', 'audio/wav'
  ]
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
DROP POLICY IF EXISTS "Users can view project files" ON storage.objects;
CREATE POLICY "Users can view project files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM projects WHERE projects.id::text = (storage.foldername(name))[1] AND projects.client_id = auth.uid())
    OR EXISTS (SELECT 1 FROM project_team pt JOIN projects p ON p.id = pt.project_id WHERE p.id::text = (storage.foldername(name))[1] AND pt.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Team can upload project files" ON storage.objects;
CREATE POLICY "Team can upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR EXISTS (SELECT 1 FROM project_team pt WHERE pt.project_id::text = (storage.foldername(name))[1] AND pt.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can update project files" ON storage.objects;
CREATE POLICY "Admins can update project files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-files' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete project files" ON storage.objects;
CREATE POLICY "Admins can delete project files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-files' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 2. Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES files(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to files" ON files;
CREATE POLICY "Admins full access to files"
ON files FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Clients can view their project files" ON files;
CREATE POLICY "Clients can view their project files"
ON files FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = files.project_id AND projects.client_id = auth.uid()));

DROP POLICY IF EXISTS "Team can view project files" ON files;
CREATE POLICY "Team can view project files"
ON files FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM project_team pt WHERE pt.project_id = files.project_id AND pt.user_id = auth.uid()));

DROP POLICY IF EXISTS "Team can upload project files" ON files;
CREATE POLICY "Team can upload project files"
ON files FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM project_team pt WHERE pt.project_id = files.project_id AND pt.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS files_updated_at ON files;
CREATE TRIGGER files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION update_files_updated_at();


-- ============================================
-- PART 2: COMMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to comments" ON comments;
CREATE POLICY "Admins full access to comments"
ON comments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Clients can view project comments" ON comments;
CREATE POLICY "Clients can view project comments"
ON comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = comments.project_id AND projects.client_id = auth.uid()));

DROP POLICY IF EXISTS "Clients can create comments" ON comments;
CREATE POLICY "Clients can create comments"
ON comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM projects WHERE projects.id = comments.project_id AND projects.client_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments"
ON comments FOR DELETE TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Team can view project comments" ON comments;
CREATE POLICY "Team can view project comments"
ON comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM project_team pt WHERE pt.project_id = comments.project_id AND pt.user_id = auth.uid()));

DROP POLICY IF EXISTS "Team can create project comments" ON comments;
CREATE POLICY "Team can create project comments"
ON comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM project_team pt WHERE pt.project_id = comments.project_id AND pt.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_edited = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comments_updated_at ON comments;
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_comments_updated_at();


-- ============================================
-- PART 3: NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT TO authenticated WITH CHECK (true);


-- ============================================
-- PART 4: NOTIFICATION TRIGGERS
-- ============================================

-- Notify on new comment
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
  commenter_name TEXT;
  mentioned_user UUID;
BEGIN
  SELECT p.name, pr.full_name INTO project_name, commenter_name
  FROM projects p JOIN profiles pr ON pr.id = NEW.user_id
  WHERE p.id = NEW.project_id;

  IF array_length(NEW.mentions, 1) > 0 THEN
    FOREACH mentioned_user IN ARRAY NEW.mentions LOOP
      IF mentioned_user != NEW.user_id THEN
        INSERT INTO notifications (user_id, type, title, message, link, project_id, actor_id)
        VALUES (mentioned_user, 'mention', 'Te mencionaron en un comentario',
          commenter_name || ' te mencionó en ' || project_name, '/projects/' || NEW.project_id, NEW.project_id, NEW.user_id);
      END IF;
    END LOOP;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, link, project_id, actor_id)
  SELECT p.client_id, 'comment', 'Nuevo comentario en tu proyecto',
    commenter_name || ' comentó en ' || project_name, '/projects/' || NEW.project_id, NEW.project_id, NEW.user_id
  FROM projects p WHERE p.id = NEW.project_id AND p.client_id != NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_created ON comments;
CREATE TRIGGER on_comment_created AFTER INSERT ON comments FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Notify on file upload
CREATE OR REPLACE FUNCTION notify_on_file_upload()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
  uploader_name TEXT;
BEGIN
  SELECT p.name, pr.full_name INTO project_name, uploader_name
  FROM projects p LEFT JOIN profiles pr ON pr.id = NEW.uploaded_by
  WHERE p.id = NEW.project_id;

  INSERT INTO notifications (user_id, type, title, message, link, project_id, actor_id)
  SELECT p.client_id, 'file_upload', 'Nuevo archivo subido',
    COALESCE(uploader_name, 'Alguien') || ' subió "' || NEW.original_name || '" en ' || project_name,
    '/projects/' || NEW.project_id, NEW.project_id, NEW.uploaded_by
  FROM projects p
  WHERE p.id = NEW.project_id AND p.client_id != COALESCE(NEW.uploaded_by, '00000000-0000-0000-0000-000000000000');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_file_uploaded ON files;
CREATE TRIGGER on_file_uploaded AFTER INSERT ON files FOR EACH ROW EXECUTE FUNCTION notify_on_file_upload();


-- ============================================
-- PART 5: ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ============================================
-- DONE!
-- ============================================

SELECT '✅ All tables, policies, and triggers configured successfully!' as status;
