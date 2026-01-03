'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Comment {
  id: string
  project_id: string
  user_id: string
  parent_id: string | null
  content: string
  mentions: string[]
  is_edited: boolean
  created_at: string
  updated_at: string
  user: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  replies?: Comment[]
}

const supabase = createClient()

export function useComments(projectId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:user_id(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              *,
              user:user_id(id, full_name, avatar_url)
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true })

          return { ...comment, replies: replies || [] }
        })
      )

      setComments(commentsWithReplies)
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Subscribe to realtime updates
  useEffect(() => {
    fetchComments()

    const channel = supabase
      .channel(`comments:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // Refetch on any change
          fetchComments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, fetchComments])

  // Add comment
  const addComment = async (content: string, parentId?: string, mentions: string[] = []) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('comments')
        .insert({
          project_id: projectId,
          user_id: user.id,
          parent_id: parentId || null,
          content,
          mentions,
        })
        .select(`
          *,
          user:user_id(id, full_name, avatar_url)
        `)
        .single()

      if (error) throw error

      // Realtime will handle the update, but we can optimistically add it
      if (!parentId) {
        setComments(prev => [{ ...data, replies: [] }, ...prev])
      }

      return { data, error: null }
    } catch (error: any) {
      console.error('Error adding comment:', error)
      return { data: null, error: error.message }
    }
  }

  // Update comment
  const updateComment = async (commentId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content })
        .eq('id', commentId)

      if (error) throw error
      return { error: null }
    } catch (error: any) {
      console.error('Error updating comment:', error)
      return { error: error.message }
    }
  }

  // Delete comment
  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      setComments(prev => prev.filter(c => c.id !== commentId))
      return { error: null }
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      return { error: error.message }
    }
  }

  return {
    comments,
    isLoading,
    addComment,
    updateComment,
    deleteComment,
    refetch: fetchComments,
  }
}

// Parse mentions from text (@username)
export function parseMentions(text: string, users: { id: string; full_name: string }[]): string[] {
  const mentionRegex = /@(\w+)/g
  const matches = text.match(mentionRegex) || []
  
  return matches
    .map(match => {
      const name = match.slice(1).toLowerCase()
      const user = users.find(u => 
        u.full_name.toLowerCase().includes(name) ||
        u.full_name.split(' ')[0].toLowerCase() === name
      )
      return user?.id
    })
    .filter(Boolean) as string[]
}

// Format text with highlighted mentions
export function formatMentions(text: string): string {
  return text.replace(/@(\w+)/g, '<span class="text-primary font-medium">@$1</span>')
}
