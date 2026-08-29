'use client'
// ============================================================================
// useHubData: capa de datos real (Supabase) para el Hub
// Carga posts, clientes, usuarios y notificaciones; expone mutaciones y realtime
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ContentPost, Client, User, Notification, PostStatus } from './types'
import { postFromDb, postToDb, clientFromDb, userFromDb, notifFromDb } from './adapters'

export function useHubData(authUserId: string) {
  const supabase = useMemo(() => createClient(), [])
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ---------------- Carga inicial ----------------
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [postsRes, boostsRes, clientsRes, usersRes, accessRes, notifsRes] = await Promise.all([
        supabase.from('content_items').select('*').order('publica_at', { ascending: true }),
        supabase.from('content_boosts').select('*'),
        supabase.from('hub_clients').select('*').eq('activo', true).order('nombre'),
        supabase.from('users').select('*').order('name'),
        supabase.from('crew_client_access').select('user_id, client_id'),
        supabase.from('notifications').select('*').eq('user_id', authUserId).order('created_at', { ascending: false }).limit(50),
      ])

      if (postsRes.error) throw postsRes.error
      if (clientsRes.error) throw clientsRes.error
      if (usersRes.error) throw usersRes.error

      const boostsByPost = new Map<string, any>()
      for (const b of boostsRes.data ?? []) {
        if (!boostsByPost.has(b.content_item_id)) boostsByPost.set(b.content_item_id, b)
      }

      const accessByUser = new Map<string, string[]>()
      for (const a of accessRes.data ?? []) {
        const list = accessByUser.get(a.user_id) ?? []
        list.push(a.client_id)
        accessByUser.set(a.user_id, list)
      }

      setPosts((postsRes.data ?? []).map(r => postFromDb(r, boostsByPost.get(r.id))))
      setClients((clientsRes.data ?? []).map(clientFromDb))
      setUsers((usersRes.data ?? []).map(u => userFromDb(u, accessByUser.get(u.id) ?? [])))
      setNotifications((notifsRes.data ?? []).map(notifFromDb))
    } catch (e: any) {
      console.error('loadAll error:', e)
      setError(e.message ?? 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [supabase, authUserId])

  useEffect(() => { loadAll() }, [loadAll])

  // ---------------- Realtime: content_items ----------------
  useEffect(() => {
    const channel = supabase
      .channel('hub-content')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPosts(prev => prev.some(p => p.id === (payload.new as any).id)
            ? prev
            : [...prev, postFromDb(payload.new)])
        } else if (payload.eventType === 'UPDATE') {
          setPosts(prev => prev.map(p => p.id === (payload.new as any).id
            ? { ...p, ...postFromDb(payload.new), boostBudget: p.boostBudget, actualSpend: p.actualSpend, reach: p.reach }
            : p))
        } else if (payload.eventType === 'DELETE') {
          setPosts(prev => prev.filter(p => p.id !== (payload.old as any).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  // ---------------- Mutaciones ----------------
  const movePost = useCallback(async (postId: string, newStatus: PostStatus) => {
    // Optimista
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus } : p))
    const { error } = await supabase.from('content_items')
      .update(postToDb({ status: newStatus }))
      .eq('id', postId)
    if (error) {
      console.error('movePost error:', error)
      loadAll()
      throw error
    }
  }, [supabase, loadAll])

  const addPost = useCallback(async (post: ContentPost): Promise<ContentPost | null> => {
    const payload = postToDb(post)
    delete payload.id
    const { data, error } = await supabase.from('content_items').insert(payload).select().single()
    if (error) { console.error('addPost error:', error); throw error }
    const created = postFromDb(data)
    setPosts(prev => prev.some(p => p.id === created.id) ? prev : [...prev, created])
    // Boost si aplica
    if (post.boostBudget != null && post.boostBudget > 0) {
      await supabase.from('content_boosts').insert({
        content_item_id: created.id,
        plataforma: postToDb({ channel: post.channel }).canal,
        presupuesto: post.boostBudget,
      })
    }
    return created
  }, [supabase])

  const updatePost = useCallback(async (id: string, updates: Partial<ContentPost>) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    const payload = postToDb(updates)
    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('content_items').update(payload).eq('id', id)
      if (error) { console.error('updatePost error:', error); loadAll(); throw error }
    }
    // Boost
    if (updates.boostBudget !== undefined || updates.actualSpend !== undefined || updates.reach !== undefined) {
      const post = posts.find(p => p.id === id)
      const canal = postToDb({ channel: updates.channel ?? post?.channel ?? 'Instagram' }).canal
      const { data: existing } = await supabase.from('content_boosts').select('id').eq('content_item_id', id).limit(1)
      const boostPayload: any = {}
      if (updates.boostBudget !== undefined) boostPayload.presupuesto = updates.boostBudget
      if (updates.actualSpend !== undefined) boostPayload.gasto_real = updates.actualSpend
      if (updates.reach !== undefined) boostPayload.alcance = updates.reach
      if (existing && existing.length > 0) {
        await supabase.from('content_boosts').update(boostPayload).eq('id', existing[0].id)
      } else if (updates.boostBudget != null && updates.boostBudget > 0) {
        await supabase.from('content_boosts').insert({ content_item_id: id, plataforma: canal, presupuesto: updates.boostBudget, ...boostPayload })
      }
    }
  }, [supabase, posts, loadAll])

  const deletePost = useCallback(async (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from('content_items').delete().eq('id', id)
    if (error) { console.error('deletePost error:', error); loadAll(); throw error }
  }, [supabase, loadAll])

  // ---------------- Notificaciones ----------------
  const markNotifRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', id)
  }, [supabase])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', authUserId).eq('read', false)
  }, [supabase, authUserId])

  return {
    posts, clients, users, notifications, loading, error,
    movePost, addPost, updatePost, deletePost,
    markNotifRead, markAllRead,
    reload: loadAll,
  }
}
