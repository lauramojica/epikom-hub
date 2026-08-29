'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize, getFileIcon } from '@/hooks/useFiles'

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>
  uploadProgress: {
    fileName: string
    progress: number
    status: 'uploading' | 'completed' | 'error'
    error?: string
  }[]
  accept?: string
  maxSize?: number // in bytes
  maxFiles?: number
  disabled?: boolean
}

export function FileUpload({
  onUpload,
  uploadProgress,
  accept = '*',
  maxSize = 52428800, // 50MB
  maxFiles = 10,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `${file.name} es muy grande (máx. ${formatFileSize(maxSize)})`
    }
    return null
  }, [maxSize])

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList)
    const newErrors: string[] = []
    const validFiles: File[] = []

    filesArray.slice(0, maxFiles).forEach(file => {
      const error = validateFile(file)
      if (error) {
        newErrors.push(error)
      } else {
        validFiles.push(file)
      }
    })

    if (filesArray.length > maxFiles) {
      newErrors.push(`Solo puedes subir ${maxFiles} archivos a la vez`)
    }

    setErrors(newErrors)
    setSelectedFiles(prev => [...prev, ...validFiles])
  }, [maxFiles, validateFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [disabled, handleFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return
    await onUpload(selectedFiles)
    setSelectedFiles([])
    setErrors([])
  }

  const isUploading = uploadProgress.some(p => p.status === 'uploading')

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
          ${isDragging
            ? 'border-primary bg-primary-light/50'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
          }`}>
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-foreground font-medium">
              {isDragging ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para seleccionar'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Máximo {formatFileSize(maxSize)} por archivo
            </p>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-error-light text-error text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Archivos seleccionados ({selectedFiles.length})
          </p>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted"
            >
              <span className="text-xl">{getFileIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(index)
                }}
                className="w-7 h-7 rounded-lg hover:bg-border flex items-center justify-center text-muted-foreground hover:text-error transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Subir {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                item.status === 'error' ? 'bg-error-light' :
                item.status === 'completed' ? 'bg-success-light' : 'bg-muted'
              }`}
            >
              {item.status === 'uploading' && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
              {item.status === 'completed' && (
                <CheckCircle2 className="w-4 h-4 text-success" />
              )}
              {item.status === 'error' && (
                <AlertCircle className="w-4 h-4 text-error" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.fileName}</p>
                {item.status === 'uploading' && (
                  <div className="mt-1 h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.error && (
                  <p className="text-xs text-error mt-0.5">{item.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
