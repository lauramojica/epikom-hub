-- ============================================
-- EPIKOM HUB - STORAGE CONFIGURATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create the storage bucket for project files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false,  -- Not public, requires authentication
  52428800,  -- 50MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav'
  ]
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage policies

-- Policy: Authenticated users can view files from their projects
CREATE POLICY "Users can view project files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files'
  AND (
    -- Admins can see all files
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Clients can see files from their projects
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id::text = (storage.foldername(name))[1]
      AND projects.client_id = auth.uid()
    )
    OR
    -- Team members can see files from their projects
    EXISTS (
      SELECT 1 FROM project_team pt
      JOIN projects p ON p.id = pt.project_id
      WHERE p.id::text = (storage.foldername(name))[1]
      AND pt.user_id = auth.uid()
    )
  )
);

-- Policy: Admins and team members can upload files
CREATE POLICY "Team can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (
    -- Admins can upload to any project
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Team members can upload to their projects
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id::text = (storage.foldername(name))[1]
      AND pt.user_id = auth.uid()
    )
  )
);

-- Policy: Admins can update files
CREATE POLICY "Admins can update project files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Admins can delete files
CREATE POLICY "Admins can delete project files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 3. Create files table to track metadata
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
  parent_id UUID REFERENCES files(id) ON DELETE SET NULL, -- For versioning
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- RLS for files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to files"
ON files FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Clients can view files from their projects
CREATE POLICY "Clients can view their project files"
ON files FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = files.project_id
    AND projects.client_id = auth.uid()
  )
);

-- Team members can view and insert files
CREATE POLICY "Team can view project files"
ON files FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_team pt
    WHERE pt.project_id = files.project_id
    AND pt.user_id = auth.uid()
  )
);

CREATE POLICY "Team can upload project files"
ON files FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_team pt
    WHERE pt.project_id = files.project_id
    AND pt.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- 4. Add files count to projects (optional, for performance)
-- This can be computed but having a column is faster for listing

SELECT 'Storage configured successfully! 🎉' as status;
