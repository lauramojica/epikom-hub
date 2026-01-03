'use client'

import { useState, useEffect } from 'react'
import { useSocialPosts, SocialPost, SocialPostInput, PLATFORMS, POST_STATUSES } from '@/hooks/useSocialPosts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import {
  Plus,
  Table,
  Calendar,
  Columns3,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Clock,
  Hash,
  FileText,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type ViewMode = 'table' | 'calendar' | 'kanban'

interface SocialMediaManagerProps {
  projectId: string
  isAdmin: boolean
}

export function SocialMediaManager({ projectId, isAdmin }: SocialMediaManagerProps) {
  const {
    posts,
    isLoading,
    fetchPosts,
    createPost,
    updatePost,
    updateStatus,
    deletePost,
    getPostsForMonth,
  } = useSocialPosts(projectId)

  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null)
  const [calendarDate, setCalendarDate] = useState(new Date())

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleDelete = async (post: SocialPost) => {
    if (!confirm(`¿Eliminar "${post.title}"?`)) return
    await deletePost(post.id)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
          {[
            { id: 'kanban', label: 'Kanban', icon: Columns3 },
            { id: 'table', label: 'Tabla', icon: Table },
            { id: 'calendar', label: 'Calendario', icon: Calendar },
          ].map((view) => {
            const Icon = view.icon
            return (
              <button
                key={view.id}
                onClick={() => setViewMode(view.id as ViewMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === view.id
                    ? 'bg-background-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{view.label}</span>
              </button>
            )
          })}
        </div>

        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Publicación
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {viewMode === 'kanban' && (
            <KanbanView
              posts={posts}
              onStatusChange={updateStatus}
              onEdit={setEditingPost}
              onDelete={handleDelete}
              isAdmin={isAdmin}
            />
          )}
          {viewMode === 'table' && (
            <TableView
              posts={posts}
              onEdit={setEditingPost}
              onDelete={handleDelete}
              isAdmin={isAdmin}
            />
          )}
          {viewMode === 'calendar' && (
            <CalendarView
              posts={posts}
              currentDate={calendarDate}
              onDateChange={setCalendarDate}
              onEdit={setEditingPost}
              getPostsForMonth={getPostsForMonth}
            />
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPost) && (
        <PostModal
          post={editingPost}
          onClose={() => {
            setShowCreateModal(false)
            setEditingPost(null)
          }}
          onSave={async (data) => {
            if (editingPost) {
              await updatePost(editingPost.id, data)
            } else {
              await createPost(data)
            }
            setShowCreateModal(false)
            setEditingPost(null)
          }}
        />
      )}
    </div>
  )
}

// ============================================
// KANBAN VIEW
// ============================================

interface KanbanViewProps {
  posts: SocialPost[]
  onStatusChange: (id: string, status: SocialPost['status']) => Promise<any>
  onEdit: (post: SocialPost) => void
  onDelete: (post: SocialPost) => void
  isAdmin: boolean
}

function KanbanView({ posts, onStatusChange, onEdit, onDelete, isAdmin }: KanbanViewProps) {
  const [draggedPost, setDraggedPost] = useState<SocialPost | null>(null)

  const columns: { status: SocialPost['status']; title: string }[] = [
    { status: 'draft', title: 'Borradores' },
    { status: 'scheduled', title: 'Programados' },
    { status: 'published', title: 'Publicados' },
  ]

  const handleDragStart = (e: React.DragEvent, post: SocialPost) => {
    setDraggedPost(post)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, status: SocialPost['status']) => {
    e.preventDefault()
    if (draggedPost && draggedPost.status !== status && isAdmin) {
      await onStatusChange(draggedPost.id, status)
    }
    setDraggedPost(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((column) => {
        const columnPosts = posts.filter(p => p.status === column.status)
        const config = POST_STATUSES[column.status]

        return (
          <div
            key={column.status}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
            className="flex flex-col"
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between p-3 rounded-t-2xl ${config.bgColor}`}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{column.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/50 text-xs font-medium">
                  {columnPosts.length}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className={`flex-1 min-h-[300px] p-2 rounded-b-2xl bg-muted/50 space-y-2 ${
              draggedPost && draggedPost.status !== column.status ? 'ring-2 ring-primary ring-dashed' : ''
            }`}>
              {columnPosts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Sin publicaciones
                </p>
              ) : (
                columnPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDragStart={(e) => handleDragStart(e, post)}
                    onEdit={() => onEdit(post)}
                    onDelete={() => onDelete(post)}
                    isAdmin={isAdmin}
                    isDragging={draggedPost?.id === post.id}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// POST CARD (for Kanban)
// ============================================

interface PostCardProps {
  post: SocialPost
  onDragStart: (e: React.DragEvent) => void
  onEdit: () => void
  onDelete: () => void
  isAdmin: boolean
  isDragging: boolean
}

function PostCard({ post, onDragStart, onEdit, onDelete, isAdmin, isDragging }: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const platform = PLATFORMS[post.platform]

  return (
    <div
      draggable={isAdmin}
      onDragStart={onDragStart}
      className={`group bg-background-card rounded-xl p-3 shadow-sm border border-border cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
      }`}
    >
      {/* Platform & Date */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span title={platform.label}>{platform.icon}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(post.scheduled_date)}
            {post.scheduled_time && ` ${post.scheduled_time.slice(0, 5)}`}
          </span>
        </div>
        
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-32 bg-background-card rounded-lg shadow-lg border border-border py-1 z-20">
                  <button
                    onClick={() => { onEdit(); setShowMenu(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => { onDelete(); setShowMenu(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-error hover:bg-error-light"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <p className="font-medium text-foreground text-sm line-clamp-2">{post.title}</p>

      {/* Content Preview */}
      {post.content && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
      )}

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {post.hashtags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-xs text-primary">#{tag}</span>
          ))}
          {post.hashtags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{post.hashtags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// TABLE VIEW
// ============================================

interface TableViewProps {
  posts: SocialPost[]
  onEdit: (post: SocialPost) => void
  onDelete: (post: SocialPost) => void
  isAdmin: boolean
}

function TableView({ posts, onEdit, onDelete, isAdmin }: TableViewProps) {
  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay publicaciones programadas</p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-medium text-muted-foreground">Título</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Plataforma</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Fecha</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Hora</th>
              <th className="text-center p-4 font-medium text-muted-foreground">Estado</th>
              {isAdmin && <th className="text-right p-4 font-medium text-muted-foreground">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const platform = PLATFORMS[post.platform]
              const status = POST_STATUSES[post.status]

              return (
                <tr key={post.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-foreground">{post.title}</p>
                    {post.content && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{post.content}</p>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span>{platform.icon}</span>
                      <span className="text-sm">{platform.label}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm">{formatDate(post.scheduled_date)}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {post.scheduled_time ? post.scheduled_time.slice(0, 5) : '—'}
                  </td>
                  <td className="p-4 text-center">
                    <Badge variant={status.color as any} size="sm">{status.label}</Badge>
                  </td>
                  {isAdmin && (
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(post)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => onDelete(post)} className="hover:text-error">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ============================================
// CALENDAR VIEW
// ============================================

interface CalendarViewProps {
  posts: SocialPost[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onEdit: (post: SocialPost) => void
  getPostsForMonth: (year: number, month: number) => SocialPost[]
}

function CalendarView({ posts, currentDate, onDateChange, onEdit, getPostsForMonth }: CalendarViewProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const monthPosts = getPostsForMonth(year, month)
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // Build calendar grid
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const getPostsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return posts.filter(p => p.scheduled_date === dateStr)
  }

  const prevMonth = () => {
    onDateChange(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    onDateChange(new Date(year, month + 1, 1))
  }

  return (
    <Card className="p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h3 className="text-lg font-semibold text-foreground">
          {monthNames[month]} {year}
        </h3>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={index} className="aspect-square" />
          }

          const dayPosts = getPostsForDay(day)
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()

          return (
            <div
              key={index}
              className={`aspect-square p-1 rounded-lg border transition-all ${
                isToday ? 'border-primary bg-primary-light' : 'border-transparent hover:bg-muted'
              }`}
            >
              <div className="text-xs font-medium text-foreground mb-1">{day}</div>
              <div className="space-y-0.5 overflow-hidden">
                {dayPosts.slice(0, 2).map((post) => {
                  const platform = PLATFORMS[post.platform]
                  return (
                    <button
                      key={post.id}
                      onClick={() => onEdit(post)}
                      className="w-full flex items-center gap-1 px-1 py-0.5 rounded text-[10px] bg-muted hover:bg-border truncate"
                      title={post.title}
                    >
                      <span>{platform.icon}</span>
                      <span className="truncate">{post.title}</span>
                    </button>
                  )
                })}
                {dayPosts.length > 2 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{dayPosts.length - 2} más
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">{monthPosts.length} publicaciones este mes</span>
      </div>
    </Card>
  )
}

// ============================================
// POST MODAL (Create/Edit)
// ============================================

interface PostModalProps {
  post: SocialPost | null
  onClose: () => void
  onSave: (data: SocialPostInput) => Promise<void>
}

function PostModal({ post, onClose, onSave }: PostModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<SocialPostInput>({
    title: post?.title || '',
    content: post?.content || '',
    platform: post?.platform || 'instagram',
    scheduled_date: post?.scheduled_date || new Date().toISOString().split('T')[0],
    scheduled_time: post?.scheduled_time || '',
    status: post?.status || 'draft',
    notify_before_hours: post?.notify_before_hours || 2,
    hashtags: post?.hashtags || [],
    notes: post?.notes || '',
  })
  const [hashtagInput, setHashtagInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await onSave(formData)
    setIsSubmitting(false)
  }

  const addHashtag = () => {
    const tag = hashtagInput.replace(/^#/, '').trim()
    if (tag && !formData.hashtags?.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        hashtags: [...(prev.hashtags || []), tag]
      }))
    }
    setHashtagInput('')
  }

  const removeHashtag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags?.filter(t => t !== tag) || []
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-background-card rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {post ? 'Editar Publicación' : 'Nueva Publicación'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título de la publicación"
              required
            />
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <Label>Plataforma *</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PLATFORMS).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, platform: key as any })}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    formData.platform === key
                      ? 'bg-primary-light border-2 border-primary'
                      : 'bg-muted hover:bg-border'
                  }`}
                >
                  <span className="text-xl">{config.icon}</span>
                  <span className="text-xs">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Contenido</Label>
            <textarea
              id="content"
              value={formData.content || ''}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Texto de la publicación..."
              rows={4}
              className="w-full p-3 rounded-xl bg-muted border-0 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduled_time || ''}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Estado</Label>
            <div className="flex gap-2">
              {(['draft', 'scheduled', 'published'] as const).map((status) => {
                const config = POST_STATUSES[status]
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, status })}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      formData.status === status
                        ? `${config.bgColor} ring-2 ring-offset-2`
                        : 'bg-muted hover:bg-border'
                    }`}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags</Label>
            <div className="flex gap-2">
              <Input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                placeholder="Agregar hashtag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addHashtag()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addHashtag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.hashtags && formData.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-light text-primary text-sm"
                  >
                    #{tag}
                    <button type="button" onClick={() => removeHashtag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <Label htmlFor="reminder">Recordatorio antes de publicar</Label>
            <select
              id="reminder"
              value={formData.notify_before_hours}
              onChange={(e) => setFormData({ ...formData, notify_before_hours: parseInt(e.target.value) })}
              className="w-full h-11 px-4 rounded-xl bg-muted border-0 text-sm"
            >
              <option value={1}>1 hora antes</option>
              <option value={2}>2 horas antes</option>
              <option value={6}>6 horas antes</option>
              <option value={12}>12 horas antes</option>
              <option value={24}>24 horas antes</option>
              <option value={48}>48 horas antes</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas internas</Label>
            <textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas para el equipo..."
              rows={2}
              className="w-full p-3 rounded-xl bg-muted border-0 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
