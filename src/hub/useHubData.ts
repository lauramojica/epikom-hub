'use client'
// ============================================================================
// useHubData: capa de datos real (Supabase) para el Hub
// Carga posts, clientes, usuarios y notificaciones; expone mutaciones y realtime
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ContentPost, Client, User, Notification, PostStatus, Project, Deliverable, Document as HubDocument, ClientInteraction, ProjectPhase, AttachedFile } from './types'
import { postFromDb, postToDb, clientFromDb, clientToDb, userFromDb, notifFromDb, projectFromDb, projectToDb, deliverableFromDb, deliverableToDb, documentFromDb, interactionFromDb, DEFAULT_PHASES, colorForId } from './adapters'

export function useHubData(authUserId: string) {
  const supabase = useMemo(() => createClient(), [])
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [documents, setDocuments] = useState<HubDocument[]>([])
  const [interactions, setInteractions] = useState<Record<string, ClientInteraction[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ---------------- Carga inicial ----------------
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [postsRes, boostsRes, clientsRes, usersRes, accessRes, notifsRes, projectsRes, delivsRes, docsRes, interRes] = await Promise.all([
        supabase.from('content_items').select('*').order('publica_at', { ascending: true }),
        supabase.from('content_boosts').select('*'),
        supabase.from('hub_clients').select('*').eq('activo', true).order('nombre'),
        supabase.from('users').select('*').order('name'),
        supabase.from('crew_client_access').select('user_id, client_id'),
        supabase.from('notifications').select('*').eq('user_id', authUserId).order('created_at', { ascending: false }).limit(50),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('deliverables').select('*').order('due_date', { ascending: true }),
        supabase.from('hub_documents').select('*').order('created_at', { ascending: false }),
        supabase.from('client_interactions').select('*').order('created_at', { ascending: false }).limit(200),
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
      const usersList = (usersRes.data ?? []).map(u => userFromDb(u, accessByUser.get(u.id) ?? []))
      setUsers(usersList)
      setNotifications((notifsRes.data ?? []).map(notifFromDb))

      // Proyectos con deliverables anidados
      const delivsByProject = new Map<string, Deliverable[]>()
      for (const d of delivsRes.data ?? []) {
        const list = delivsByProject.get(d.project_id) ?? []
        list.push(deliverableFromDb(d))
        delivsByProject.set(d.project_id, list)
      }
      setProjects((projectsRes.data ?? []).map(r => projectFromDb(r, delivsByProject.get(r.id) ?? [])))

      // Documentos
      setDocuments((docsRes.data ?? []).map(documentFromDb))

      // Interacciones agrupadas por cliente
      const nameById = new Map(usersList.map(u => [u.id, u.name]))
      const interByClient: Record<string, ClientInteraction[]> = {}
      for (const i of interRes.data ?? []) {
        const list = interByClient[i.client_id] ?? []
        list.push(interactionFromDb(i, nameById.get(i.logged_by)))
        interByClient[i.client_id] = list
      }
      setInteractions(interByClient)
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

  // ---------------- Storage ----------------
  const uploadFile = useCallback(async (file: File, folder = 'docs'): Promise<{ url: string; path: string }> => {
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('hub-files').upload(path, file, { contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from('hub-files').getPublicUrl(path)
    return { url: data.publicUrl, path }
  }, [supabase])

  // ---------------- Proyectos ----------------
  const addProject = useCallback(async (p: Omit<Project, 'id' | 'phases' | 'deliverables'>) => {
    const payload = projectToDb({ ...p, phases: DEFAULT_PHASES } as Partial<Project>)
    payload.phases = DEFAULT_PHASES
    if (!payload.color) payload.color = colorForId(p.name)
    const { data, error } = await supabase.from('projects').insert(payload).select().single()
    if (error) { console.error('addProject:', error); throw error }
    setProjects(prev => [projectFromDb(data, []), ...prev])
  }, [supabase])

  const moveProjectPhase = useCallback(async (projectId: string, phase: ProjectPhase) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, currentPhase: phase } : p))
    const { error } = await supabase.from('projects').update({ current_phase: phase }).eq('id', projectId)
    if (error) { console.error('moveProjectPhase:', error); loadAll(); throw error }
  }, [supabase, loadAll])

  const updateDeliverable = useCallback(async (projectId: string, delivId: string, status: Deliverable['status'], reason?: string) => {
    setProjects(prev => prev.map(p => p.id !== projectId ? p : {
      ...p,
      deliverables: p.deliverables.map(d => d.id !== delivId ? d : { ...d, status, rejectionReason: reason }),
    }))
    const payload: Record<string, any> = deliverableToDb({ status, rejectionReason: reason })
    if (status === 'approved') { payload.approved_at = new Date().toISOString(); payload.approved_by = authUserId }
    const { error } = await supabase.from('deliverables').update(payload).eq('id', delivId)
    if (error) { console.error('updateDeliverable:', error); loadAll(); throw error }
  }, [supabase, authUserId, loadAll])

  const addDeliverable = useCallback(async (projectId: string, d: Omit<Deliverable, 'id'>) => {
    const payload = { ...deliverableToDb(d), project_id: projectId, created_by: authUserId }
    const { data, error } = await supabase.from('deliverables').insert(payload).select().single()
    if (error) { console.error('addDeliverable:', error); throw error }
    setProjects(prev => prev.map(p => p.id !== projectId ? p : {
      ...p, deliverables: [...p.deliverables, deliverableFromDb(data)],
    }))
  }, [supabase, authUserId])

  const setDeliverableFiles = useCallback(async (projectId: string, delivId: string, files: AttachedFile[]) => {
    setProjects(prev => prev.map(p => p.id !== projectId ? p : {
      ...p, deliverables: p.deliverables.map(d => d.id !== delivId ? d : { ...d, attachedFiles: files }),
    }))
    const { error } = await supabase.from('deliverables').update({ archivos: files }).eq('id', delivId)
    if (error) { console.error('setDeliverableFiles:', error); loadAll() }
  }, [supabase, loadAll])

  // ---------------- Clientes ----------------
  const addClient = useCallback(async (c: Partial<Client>) => {
    const payload = clientToDb(c)
    const { data, error } = await supabase.from('hub_clients').insert(payload).select().single()
    if (error) { console.error('addClient:', error); throw error }
    setClients(prev => [...prev, clientFromDb(data)].sort((a, b) => a.name.localeCompare(b.name)))
  }, [supabase])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    const payload = clientToDb(updates)
    if (Object.keys(payload).length === 0) return
    const { error } = await supabase.from('hub_clients').update(payload).eq('id', id)
    if (error) { console.error('updateClient:', error); loadAll(); throw error }
  }, [supabase, loadAll])

  const addInteraction = useCallback(async (clientId: string, type: string, title: string) => {
    const { data, error } = await supabase.from('client_interactions')
      .insert({ client_id: clientId, interaction_type: type, title, logged_by: authUserId })
      .select().single()
    if (error) { console.error('addInteraction:', error); throw error }
    const me = users.find(u => u.id === authUserId)
    setInteractions(prev => ({
      ...prev,
      [clientId]: [interactionFromDb(data, me?.name), ...(prev[clientId] ?? [])],
    }))
  }, [supabase, authUserId, users])

  // ---------------- Documentos ----------------
  const addDocument = useCallback(async (doc: HubDocument, rawFile?: File) => {
    let url = doc.url
    let storagePath: string | null = null
    if (rawFile) {
      const uploaded = await uploadFile(rawFile, 'docs')
      url = uploaded.url
      storagePath = uploaded.path
    }
    const { data, error } = await supabase.from('hub_documents').insert({
      name: doc.name, size: doc.size, type: doc.type, url, storage_path: storagePath,
      client_id: doc.clientId, project_id: doc.projectId ?? null, post_id: doc.postId ?? null,
      category: doc.category, notes: doc.notes, uploaded_by: authUserId,
    }).select().single()
    if (error) { console.error('addDocument:', error); throw error }
    setDocuments(prev => [documentFromDb(data), ...prev])
  }, [supabase, authUserId, uploadFile])

  const deleteDocument = useCallback(async (id: string) => {
    const doc = documents.find(d => d.id === id)
    setDocuments(prev => prev.filter(d => d.id !== id))
    await supabase.from('hub_documents').delete().eq('id', id)
    // Borrar del storage si vive ahí
    if (doc?.url.includes('/hub-files/')) {
      const path = doc.url.split('/hub-files/')[1]
      if (path) await supabase.storage.from('hub-files').remove([decodeURIComponent(path)])
    }
  }, [supabase, documents])

  return {
    posts, clients, users, notifications, projects, documents, interactions, loading, error,
    addProject, moveProjectPhase, updateDeliverable, addDeliverable, setDeliverableFiles,
    addClient, updateClient, addInteraction,
    addDocument, deleteDocument, uploadFile,
    movePost, addPost, updatePost, deletePost,
    markNotifRead, markAllRead,
    reload: loadAll,
  }
}
