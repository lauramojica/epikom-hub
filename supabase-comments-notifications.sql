-- ============================================
-- EPIKOM HUB - COMMENTS & NOTIFICATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For replies/threads
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}', -- Array of mentioned user IDs
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to comments"
ON comments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Clients can view comments from their projects
CREATE POLICY "Clients can view project comments"
ON comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = comments.project_id
    AND projects.client_id = auth.uid()
  )
);

-- Clients can create comments on their projects
CREATE POLICY "Clients can create comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = comments.project_id
    AND projects.client_id = auth.uid()
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Team members can view and create comments
CREATE POLICY "Team can view project comments"
ON comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_team pt
    WHERE pt.project_id = comments.project_id
    AND pt.user_id = auth.uid()
  )
);

CREATE POLICY "Team can create project comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM project_team pt
    WHERE pt.project_id = comments.project_id
    AND pt.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_edited = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();


-- ============================================
-- 2. NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'mention', 'comment', 'file_upload', 'project_update', 'deadline'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL to navigate to
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Who triggered the notification
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- System can insert notifications (via service role or triggers)
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);


-- ============================================
-- 3. NOTIFICATION TRIGGERS
-- ============================================

-- Function to create notification on new comment
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
  commenter_name TEXT;
  mentioned_user UUID;
BEGIN
  -- Get project name and commenter name
  SELECT p.name, pr.full_name INTO project_name, commenter_name
  FROM projects p
  JOIN profiles pr ON pr.id = NEW.user_id
  WHERE p.id = NEW.project_id;

  -- Notify mentioned users
  IF array_length(NEW.mentions, 1) > 0 THEN
    FOREACH mentioned_user IN ARRAY NEW.mentions
    LOOP
      IF mentioned_user != NEW.user_id THEN
        INSERT INTO notifications (user_id, type, title, message, link, project_id, actor_id)
        VALUES (
          mentioned_user,
          'mention',
          'Te mencionaron en un comentario',
          commenter_name || ' te mencionó en ' || project_name,
          '/projects/' || NEW.project_id,
          NEW.project_id,
          NEW.user_id
        );
      END IF;
    END LOOP;
  END IF;

  -- Notify project owner (if not the commenter)
  INSERT INTO notifications (user_id, type, title, message, link, project_id, actor_id)
  SELECT 
    p.client_id,
    'comment',
    'Nuevo comentario en tu proyecto',
    commenter_name || ' comentó en ' || project_name,
    '/projects/' || NEW.project_id,
    NEW.project_id,
    NEW.user_id
  FROM projects p
  WHERE p.id = NEW.project_id
  AND p.client_id != NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();


-- Function to create notification on file upload
CREATE OR REPLACE FUNCTION notify_on_file_upload()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
  uploader_name TEXT;
BEGIN
  -- Get project name and uploader name
  SELECT p.name, pr.full_name INTO project_name, uploader_name
  FROM projects p
  LEFT JOIN profiles pr ON pr.id = NEW.uploaded_by
  WHERE p.id = NEW.project_id;

  -- Notify project owner
  INSERT INTO notifications (user_id, type, title, message, link, project_id, actor_id)
  SELECT 
    p.client_id,
    'file_upload',
    'Nuevo archivo subido',
    COALESCE(uploader_name, 'Alguien') || ' subió "' || NEW.original_name || '" en ' || project_name,
    '/projects/' || NEW.project_id,
    NEW.project_id,
    NEW.uploaded_by
  FROM projects p
  WHERE p.id = NEW.project_id
  AND p.client_id != COALESCE(NEW.uploaded_by, '00000000-0000-0000-0000-000000000000');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_file_uploaded
  AFTER INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_file_upload();


-- ============================================
-- 4. ENABLE REALTIME
-- ============================================

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = p_user_id AND is_read = false;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
  UPDATE notifications
  SET is_read = true
  WHERE user_id = p_user_id AND is_read = false;
$$ LANGUAGE SQL SECURITY DEFINER;


SELECT 'Comments & Notifications configured successfully! 🎉' as status;
