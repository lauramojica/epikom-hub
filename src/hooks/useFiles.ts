'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface FileRecord {
  id: string
  project_id: string
  name: string
  original_name: string
  size: number
  mime_type: string
  storage_path: string
  uploaded_by: string | null
  description: string | null
  version: number
  parent_id: string | null
  created_at: string
  updated_at: string
  uploader?: {
    full_name: string
    avatar_url: string | null
  }
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

const supabase = createClient()

export function useFiles(projectId: string) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])

  // Fetch files for a project
  const fetchFiles = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('files')
        .select(`
          *,
          uploader:uploaded_by(full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .is('parent_id', null) // Only get latest versions
        .order('created_at', { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Upload a single file
  const uploadFile = async (
    file: File,
    description?: string
  ): Promise<FileRecord | null> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${projectId}/${fileName}`

    // Update progress
    setUploadProgress(prev => [
      ...prev,
      { fileName: file.name, progress: 0, status: 'uploading' }
    ])

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Update progress
      setUploadProgress(prev =>
        prev.map(p =>
          p.fileName === file.name ? { ...p, progress: 50 } : p
        )
      )

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Save metadata to database
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          project_id: projectId,
          name: fileName,
          original_name: file.name,
          size: file.size,
          mime_type: file.type,
          storage_path: storagePath,
          uploaded_by: user?.id,
          description,
        })
        .select(`
          *,
          uploader:uploaded_by(full_name, avatar_url)
        `)
        .single()

      if (dbError) throw dbError

      // Update progress to completed
      setUploadProgress(prev =>
        prev.map(p =>
          p.fileName === file.name ? { ...p, progress: 100, status: 'completed' } : p
        )
      )

      // Add to files list
      setFiles(prev => [fileRecord, ...prev])

      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.fileName !== file.name))
      }, 2000)

      return fileRecord
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadProgress(prev =>
        prev.map(p =>
          p.fileName === file.name
            ? { ...p, status: 'error', error: error.message }
            : p
        )
      )
      return null
    }
  }

  // Upload multiple files
  const uploadFiles = async (fileList: File[], description?: string) => {
    const results = await Promise.all(
      fileList.map(file => uploadFile(file, description))
    )
    return results.filter(Boolean) as FileRecord[]
  }

  // Delete a file
  const deleteFile = async (fileId: string, storagePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([storagePath])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)

      if (dbError) throw dbError

      // Remove from state
      setFiles(prev => prev.filter(f => f.id !== fileId))

      return { success: true }
    } catch (error: any) {
      console.error('Delete error:', error)
      return { success: false, error: error.message }
    }
  }

  // Get download URL
  const getDownloadUrl = async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(storagePath, 3600) // 1 hour expiry

      if (error) throw error
      return data.signedUrl
    } catch (error) {
      console.error('Error getting download URL:', error)
      return null
    }
  }

  // Get preview URL (for images)
  const getPreviewUrl = (storagePath: string): string => {
    const { data } = supabase.storage
      .from('project-files')
      .getPublicUrl(storagePath, {
        transform: {
          width: 400,
          height: 400,
          resize: 'contain',
        },
      })
    return data.publicUrl
  }

  return {
    files,
    isLoading,
    uploadProgress,
    fetchFiles,
    uploadFile,
    uploadFiles,
    deleteFile,
    getDownloadUrl,
    getPreviewUrl,
  }
}

// Helper functions
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.includes('word')) return '📘'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📙'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦'
  return '📄'
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}
