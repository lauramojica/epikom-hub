'use client'

import { useState, useRef, useEffect } from 'react'
import { Comment, useComments, formatMentions } from '@/hooks/useComments'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import {
  Send,
  MoreHorizontal,
  Reply,
  Edit,
  Trash2,
  Loader2,
  MessageSquare,
} from 'lucide-react'

interface CommentSectionProps {
  projectId: string
  currentUserId: string
  isAdmin: boolean
}

export function CommentSection({ projectId, currentUserId, isAdmin }: CommentSectionProps) {
  const { comments, isLoading, addComment, deleteComment } = useComments(projectId)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    const { error } = await addComment(newComment.trim())
    if (!error) {
      setNewComment('')
    }
    setIsSubmitting(false)
  }

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || isSubmitting) return

    setIsSubmitting(true)
    const { error } = await addComment(replyContent.trim(), parentId)
    if (!error) {
      setReplyContent('')
      setReplyingTo(null)
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este comentario?')) return
    await deleteComment(commentId)
  }

  const getAvatarColor = (index: number) => {
    const colors = ['primary', 'secondary', 'amber', 'blue'] as const
    return colors[index % colors.length]
  }

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>, setter: (value: string) => void) => {
    setter(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Avatar size="md">
          <AvatarFallback variant="primary">U</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => handleTextareaChange(e, setNewComment)}
            placeholder="Escribe un comentario... Usa @nombre para mencionar"
            className="w-full min-h-[80px] p-4 rounded-2xl bg-muted border-0 text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
            rows={2}
          />
          <div className="flex justify-end mt-2">
            <Button type="submit" size="sm" disabled={!newComment.trim() || isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Comentar
            </Button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay comentarios aún</p>
          <p className="text-sm text-muted-foreground mt-1">Sé el primero en comentar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment, index) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              index={index}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              replyingTo={replyingTo}
              replyContent={replyContent}
              isSubmitting={isSubmitting}
              onReplyClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              onReplyChange={setReplyContent}
              onReplySubmit={() => handleReply(comment.id)}
              onDelete={() => handleDelete(comment.id)}
              getAvatarColor={getAvatarColor}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  index: number
  currentUserId: string
  isAdmin: boolean
  replyingTo: string | null
  replyContent: string
  isSubmitting: boolean
  onReplyClick: () => void
  onReplyChange: (value: string) => void
  onReplySubmit: () => void
  onDelete: () => void
  getAvatarColor: (index: number) => 'primary' | 'secondary' | 'amber' | 'blue'
}

function CommentItem({
  comment,
  index,
  currentUserId,
  isAdmin,
  replyingTo,
  replyContent,
  isSubmitting,
  onReplyClick,
  onReplyChange,
  onReplySubmit,
  onDelete,
  getAvatarColor,
}: CommentItemProps) {
  const canDelete = isAdmin || comment.user_id === currentUserId
  const isReplying = replyingTo === comment.id

  return (
    <div className="group">
      <div className="flex gap-3">
        <Avatar size="md">
          <AvatarImage src={comment.user?.avatar_url || ''} />
          <AvatarFallback variant={getAvatarColor(index)}>
            {getInitials(comment.user?.full_name || 'U')}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {comment.user?.full_name || 'Usuario'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(comment.created_at)}
                </span>
                {comment.is_edited && (
                  <span className="text-xs text-muted-foreground">(editado)</span>
                )}
              </div>
              
              {canDelete && (
                <button
                  onClick={onDelete}
                  className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-error-light hover:text-error flex items-center justify-center text-muted-foreground transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <p 
              className="text-sm text-foreground whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formatMentions(comment.content) }}
            />
          </div>

          {/* Reply button */}
          <div className="flex items-center gap-2 mt-2 ml-2">
            <button
              onClick={onReplyClick}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
              Responder
            </button>
          </div>

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3 flex gap-2">
              <Avatar size="sm">
                <AvatarFallback variant="secondary">U</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => onReplyChange(e.target.value)}
                  placeholder="Escribe una respuesta..."
                  className="flex-1 h-9 px-4 rounded-full bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      onReplySubmit()
                    }
                  }}
                />
                <Button
                  size="icon-sm"
                  onClick={onReplySubmit}
                  disabled={!replyContent.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3 pl-2 border-l-2 border-border">
              {comment.replies.map((reply, replyIndex) => (
                <div key={reply.id} className="flex gap-2">
                  <Avatar size="sm">
                    <AvatarImage src={reply.user?.avatar_url || ''} />
                    <AvatarFallback variant={getAvatarColor(replyIndex + 10)}>
                      {getInitials(reply.user?.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground">
                        {reply.user?.full_name || 'Usuario'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(reply.created_at)}
                      </span>
                    </div>
                    <p 
                      className="text-sm text-foreground"
                      dangerouslySetInnerHTML={{ __html: formatMentions(reply.content) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
