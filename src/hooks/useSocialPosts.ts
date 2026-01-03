'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SocialPost {
  id: string
  project_id: string
  title: string
  content: string | null
  media_urls: string[]
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'other'
  scheduled_date: string
  scheduled_time: string | null
  status: 'draft' | 'scheduled' | 'published' | 'cancelled'
  notify_before_hours: number
  notification_sent: boolean
  hashtags: string[]
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface SocialPostInput {
  title: string
  content?: string
  media_urls?: string[]
  platform: SocialPost['platform']
  scheduled_date: string
  scheduled_time?: string
  status?: SocialPost['status']
  notify_before_hours?: number
  hashtags?: string[]
  notes?: string
}

const supabase = createClient()

export function useSocialPosts(projectId: string) {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch all posts for project
  const fetchPosts = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .eq('project_id', projectId)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Create post
  const createPost = async (input: SocialPostInput): Promise<{ data: SocialPost | null; error: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('social_media_posts')
        .insert({
          project_id: projectId,
          ...input,
          media_urls: input.media_urls || [],
          hashtags: input.hashtags || [],
          status: input.status || 'draft',
          notify_before_hours: input.notify_before_hours || 2,
        })
        .select()
        .single()

      if (error) throw error

      setPosts(prev => [...prev, data].sort((a, b) => 
        new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      ))

      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  // Update post
  const updatePost = async (id: string, input: Partial<SocialPostInput>): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('social_media_posts')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setPosts(prev => prev.map(p => p.id === id ? data : p))

      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  // Update status (for drag & drop)
  const updateStatus = async (id: string, status: SocialPost['status']): Promise<{ error: string | null }> => {
    try {
      const updates: any = { status }
      
      // If publishing, set published_at
      if (status === 'published') {
        updates.published_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('social_media_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setPosts(prev => prev.map(p => p.id === id ? data : p))

      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  // Delete post
  const deletePost = async (id: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPosts(prev => prev.filter(p => p.id !== id))

      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  // Get posts by status
  const getPostsByStatus = (status: SocialPost['status']) => {
    return posts.filter(p => p.status === status)
  }

  // Get posts by date
  const getPostsByDate = (date: string) => {
    return posts.filter(p => p.scheduled_date === date)
  }

  // Get posts for a month
  const getPostsForMonth = (year: number, month: number) => {
    return posts.filter(p => {
      const postDate = new Date(p.scheduled_date)
      return postDate.getFullYear() === year && postDate.getMonth() === month
    })
  }

  return {
    posts,
    isLoading,
    fetchPosts,
    createPost,
    updatePost,
    updateStatus,
    deletePost,
    getPostsByStatus,
    getPostsByDate,
    getPostsForMonth,
  }
}

// Platform config
export const PLATFORMS = {
  instagram: { label: 'Instagram', color: '#E4405F', icon: '📸' },
  facebook: { label: 'Facebook', color: '#1877F2', icon: '📘' },
  twitter: { label: 'Twitter/X', color: '#000000', icon: '🐦' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: '💼' },
  tiktok: { label: 'TikTok', color: '#000000', icon: '🎵' },
  youtube: { label: 'YouTube', color: '#FF0000', icon: '▶️' },
  other: { label: 'Otro', color: '#6B7280', icon: '📱' },
}

// Status config
export const POST_STATUSES = {
  draft: { label: 'Borrador', color: 'muted', bgColor: 'bg-gray-100' },
  scheduled: { label: 'Programado', color: 'warning', bgColor: 'bg-amber-100' },
  published: { label: 'Publicado', color: 'success', bgColor: 'bg-emerald-100' },
  cancelled: { label: 'Cancelado', color: 'error', bgColor: 'bg-red-100' },
}
