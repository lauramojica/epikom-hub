'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { HubTask, TaskStatus, AttachedFile } from './types'

function fromDb(row: Record<string, unknown>): HubTask {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? '',
    clientId: (row.client_id as string) ?? null,
    projectId: (row.project_id as string) ?? null,
    assigneeId: (row.assignee_id as string) ?? null,
    status: (row.status as HubTask['status']) ?? 'pendiente',
    priority: (row.priority as HubTask['priority']) ?? 'media',
    dueDate: (row.due_date as string) ?? null,
    dueTime: row.due_time ? String(row.due_time).slice(0, 5) : null,
    tags: (row.tags as string[]) ?? [],
    attachments: Array.isArray(row.attachments) ? (row.attachments as AttachedFile[]) : [],
    source: (row.source as 'hub' | 'email') ?? 'hub',
    sourceEmail: (row.source_email as string) ?? null,
    createdBy: (row.created_by as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    createdAt: row.created_at as string,
  }
}

function toDb(t: Partial<HubTask>): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  if (t.title !== undefined) o.title = t.title
  if (t.description !== undefined) o.description = t.description
  if (t.clientId !== undefined) o.client_id = t.clientId || null
  if (t.projectId !== undefined) o.project_id = t.projectId || null
  if (t.assigneeId !== undefined) o.assignee_id = t.assigneeId || null
  if (t.status !== undefined) o.status = t.status
  if (t.priority !== undefined) o.priority = t.priority
  if (t.dueDate !== undefined) o.due_date = t.dueDate || null
  if (t.dueTime !== undefined) o.due_time = t.dueTime || null
  if (t.tags !== undefined) o.tags = t.tags
  if (t.attachments !== undefined) o.attachments = t.attachments
  return o
}

export function useTasks(authUserId: string) {
  const supabase = useMemo(() => createClient(), [])
  const [tasks, setTasks] = useState<HubTask[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('hub_tasks')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    setTasks((data ?? []).map(fromDb))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) supabase.realtime.setAuth(session.access_token)
      if (cancelled) return
      channel = supabase
        .channel('hub-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_tasks' }, () => load())
        .subscribe()
    }
    setup()
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel) }
  }, [supabase, load])

  const addTask = useCallback(async (t: Partial<HubTask>) => {
    const payload = { ...toDb(t), created_by: authUserId, source: 'hub' }
    const { data, error } = await supabase.from('hub_tasks').insert(payload).select().single()
    if (error) throw error
    setTasks(prev => [fromDb(data), ...prev])
    return fromDb(data)
  }, [supabase, authUserId])

  const updateTask = useCallback(async (id: string, updates: Partial<HubTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const { error } = await supabase.from('hub_tasks').update(toDb(updates)).eq('id', id)
    if (error) { load(); throw error }
  }, [supabase, load])

  const toggleComplete = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const done = task.status === 'completada'
    const next: TaskStatus = done ? 'pendiente' : 'completada'
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: next } : t))
    const { error } = await supabase.from('hub_tasks').update({
      status: next,
      completed_at: done ? null : new Date().toISOString(),
      completed_by: done ? null : authUserId,
    }).eq('id', id)
    if (error) { load(); throw error }
    return !done  // true si se acaba de completar
  }, [supabase, tasks, authUserId, load])

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('hub_tasks').delete().eq('id', id)
    if (error) { load(); throw error }
  }, [supabase, load])

  return { tasks, loading, addTask, updateTask, toggleComplete, deleteTask, reload: load }
}
