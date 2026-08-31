'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface HubRole {
  id: string
  key: string
  label: string
  description: string
  color: string
  scope: 'all' | 'assigned' | 'own_client'
  permissions: Record<string, boolean>
  is_system: boolean
  sort_order: number
}

/** Catálogo de permisos, agrupado para la UI */
export const PERMISSION_GROUPS: {
  group: string
  items: { key: string; label: string; hint?: string }[]
}[] = [
  {
    group: 'Calendario de contenido',
    items: [
      { key: 'calendar.view', label: 'Ver el calendario' },
      { key: 'calendar.edit', label: 'Crear y editar publicaciones' },
      { key: 'calendar.delete', label: 'Eliminar publicaciones' },
      { key: 'calendar.import', label: 'Importar CSV' },
    ],
  },
  {
    group: 'Proyectos',
    items: [
      { key: 'projects.view', label: 'Ver proyectos' },
      { key: 'projects.edit', label: 'Crear y editar proyectos' },
      { key: 'projects.delete', label: 'Eliminar proyectos' },
      { key: 'deliverables.approve', label: 'Aprobar o rechazar entregables' },
    ],
  },
  {
    group: 'Clientes',
    items: [
      { key: 'clients.view', label: 'Ver la lista de clientes' },
      { key: 'clients.edit', label: 'Crear y editar clientes' },
      { key: 'clients.delete', label: 'Eliminar cuentas' },
    ],
  },
  {
    group: 'Documentos',
    items: [
      { key: 'documents.view', label: 'Ver documentos' },
      { key: 'documents.upload', label: 'Subir documentos' },
      { key: 'documents.delete', label: 'Eliminar documentos' },
    ],
  },
  {
    group: 'Administración',
    items: [
      { key: 'analytics.view', label: 'Ver analítica' },
      { key: 'budgets.view', label: 'Ver presupuestos de pauta', hint: 'Información sensible' },
      { key: 'messages.send', label: 'Enviar mensajes al crew' },
      { key: 'crew.assign', label: 'Asignar crew a clientes' },
      { key: 'workshop.manage', label: 'Configurar el Workshop' },
      { key: 'roles.manage', label: 'Gestionar roles y permisos', hint: 'Permiso más alto' },
    ],
  },
]

export const SCOPES: { key: HubRole['scope']; label: string; hint: string }[] = [
  { key: 'all', label: 'Todas las cuentas', hint: 'Ve y trabaja con toda la agencia' },
  { key: 'assigned', label: 'Solo asignados', hint: 'Ve únicamente los clientes que le asignen' },
  { key: 'own_client', label: 'Su propia cuenta', hint: 'Cliente externo: solo su información' },
]

export function usePermissions(authUserId: string) {
  const supabase = useMemo(() => createClient(), [])
  const [roles, setRoles] = useState<HubRole[]>([])
  const [myRoleKey, setMyRoleKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [rolesRes, meRes] = await Promise.all([
      supabase.from('hub_roles').select('*').order('sort_order'),
      supabase.from('users').select('role').eq('id', authUserId).single(),
    ])
    setRoles((rolesRes.data ?? []) as HubRole[])
    setMyRoleKey(meRes.data?.role ?? null)
    setLoading(false)
  }, [supabase, authUserId])

  useEffect(() => { load() }, [load])

  const myRole = roles.find(r => r.key === myRoleKey) ?? null

  /** ¿Tengo este permiso? */
  const can = useCallback(
    (perm: string) => myRole?.permissions?.[perm] === true,
    [myRole]
  )

  const scope = myRole?.scope ?? 'assigned'

  // ── Gestión de roles ──
  const addRole = useCallback(async (role: Partial<HubRole>) => {
    const key = (role.label ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const maxOrder = Math.max(0, ...roles.map(r => r.sort_order))
    const { data, error } = await supabase.from('hub_roles').insert({
      key,
      label: role.label,
      description: role.description ?? '',
      color: role.color ?? '#8b93a1',
      scope: role.scope ?? 'assigned',
      permissions: role.permissions ?? {},
      sort_order: maxOrder + 1,
    }).select().single()
    if (error) throw error
    setRoles(prev => [...prev, data as HubRole])
  }, [supabase, roles])

  const updateRole = useCallback(async (id: string, updates: Partial<HubRole>) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    const { error } = await supabase.from('hub_roles').update(updates).eq('id', id)
    if (error) { load(); throw error }
  }, [supabase, load])

  const togglePermission = useCallback(async (roleId: string, perm: string, on: boolean) => {
    const role = roles.find(r => r.id === roleId)
    if (!role) return
    const next = { ...role.permissions, [perm]: on }
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissions: next } : r))
    const { error } = await supabase.from('hub_roles').update({ permissions: next }).eq('id', roleId)
    if (error) { load(); throw error }
  }, [supabase, roles, load])

  const deleteRole = useCallback(async (id: string) => {
    const { error } = await supabase.from('hub_roles').delete().eq('id', id)
    if (error) throw error
    setRoles(prev => prev.filter(r => r.id !== id))
  }, [supabase])

  return {
    roles, myRole, myRoleKey, loading, can, scope,
    addRole, updateRole, togglePermission, deleteRole,
    reload: load,
  }
}
