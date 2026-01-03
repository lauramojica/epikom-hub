'use client'

import { useState } from 'react'
import { 
  FileText, 
  Download, 
  Trash2, 
  MoreHorizontal, 
  Eye,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { FileRecord, formatFileSize, getFileIcon, isImageFile, isPdfFile } from '@/hooks/useFiles'
import { formatRelativeTime, getInitials } from '@/lib/utils'

interface FileListProps {
  files: FileRecord[]
  isLoading: boolean
  onDelete: (fileId: string, storagePath: string) => Promise<{ success: boolean; error?: string }>
  onDownload: (storagePath: string) => Promise<string | null>
  isAdmin: boolean
}

export function FileList({ files, isLoading, onDelete, onDownload, isAdmin }: FileListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleDownload = async (file: FileRecord) => {
    setDownloadingId(file.id)
    try {
      const url = await onDownload(file.storage_path)
      if (url) {
        // Create a temporary link and click it
        const a = document.createElement('a')
        a.href = url
        a.download = file.original_name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (file: FileRecord) => {
    if (!confirm(`¿Estás seguro de eliminar "${file.original_name}"?`)) return
    
    setDeletingId(file.id)
    try {
      await onDelete(file.id, file.storage_path)
    } finally {
      setDeletingId(null)
    }
  }

  const handlePreview = async (file: FileRecord) => {
    const url = await onDownload(file.storage_path)
    if (url) {
      setPreviewUrl(url)
      setPreviewFile(file)
    }
  }

  const closePreview = () => {
    setPreviewFile(null)
    setPreviewUrl(null)
  }

  const getAvatarColor = (index: number) => {
    const colors = ['primary', 'secondary', 'amber', 'blue'] as const
    return colors[index % colors.length]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No hay archivos subidos</p>
        <p className="text-sm text-muted-foreground mt-1">
          Arrastra archivos o haz clic en "Subir archivo"
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={file.id}
            className="group flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-all"
          >
            {/* File Icon / Preview */}
            <div className="w-12 h-12 rounded-xl bg-background-card flex items-center justify-center flex-shrink-0">
              {isImageFile(file.mime_type) ? (
                <ImageIcon className="w-5 h-5 text-primary" />
              ) : (
                <span className="text-2xl">{getFileIcon(file.mime_type)}</span>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{file.original_name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(file.created_at)}
                </span>
                {file.uploader && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <div className="flex items-center gap-1.5">
                      <Avatar size="xs">
                        <AvatarFallback variant={getAvatarColor(index)}>
                          {getInitials(file.uploader.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {file.uploader.full_name.split(' ')[0]}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Preview (for images and PDFs) */}
              {(isImageFile(file.mime_type) || isPdfFile(file.mime_type)) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handlePreview(file)}
                  title="Vista previa"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}

              {/* Download */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDownload(file)}
                disabled={downloadingId === file.id}
                title="Descargar"
              >
                {downloadingId === file.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>

              {/* Delete (admin only) */}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(file)}
                  disabled={deletingId === file.id}
                  className="hover:text-error hover:bg-error-light"
                  title="Eliminar"
                >
                  {deletingId === file.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewFile && previewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] bg-background-card rounded-3xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getFileIcon(previewFile.mime_type)}</span>
                <div>
                  <p className="font-medium text-foreground">{previewFile.original_name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(previewFile.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(previewFile)}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closePreview}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[calc(90vh-80px)] overflow-auto flex items-center justify-center bg-muted/50">
              {isImageFile(previewFile.mime_type) ? (
                <img
                  src={previewUrl}
                  alt={previewFile.original_name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : isPdfFile(previewFile.mime_type) ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] rounded-lg"
                  title={previewFile.original_name}
                />
              ) : (
                <div className="text-center py-12">
                  <span className="text-6xl">{getFileIcon(previewFile.mime_type)}</span>
                  <p className="mt-4 text-muted-foreground">
                    Vista previa no disponible para este tipo de archivo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
