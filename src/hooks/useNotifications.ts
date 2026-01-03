'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  type: 'mention' | 'comment' | 'file_upload' | 'project_update' | 'deadline'
  title: string
  message: string
  link: string | null
  project_id: string | null
  actor_id: string | null
  is_read: boolean
  created_at: string
  actor?: {
    full_name: string
    avatar_url: string | null
  }
}

const supabase = createClient()

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:actor_id(full_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Subscribe to realtime updates
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await fetchNotifications()

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Add new notification to the top
            setNotifications(prev => [payload.new as Notification, ...prev])
            setUnreadCount(prev => prev + 1)
          }
        )
        .subscribe()
    }

    setup()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchNotifications])

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId)
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Clear all notifications
  const clearAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch: fetchNotifications,
  }
}

// Get icon for notification type
export function getNotificationIcon(type: Notification['type']): string {
  switch (type) {
    case 'mention': return '💬'
    case 'comment': return '🗨️'
    case 'file_upload': return '📁'
    case 'project_update': return '📋'
    case 'deadline': return '⏰'
    default: return '🔔'
  }
}
