'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface WorkshopOption {
  id: string
  kind: 'format' | 'channel' | 'phase' | 'status' | 'doc_category'
  value: string
  label: string
  color: string | null
  sort_order: number
  active: boolean
  is_system: boolean
}

export interface Service {
  id: string
  name: string
  slug: string
  description: string
  color: string
  enables_content_calendar: boolean
  enables_projects: boolean
  enables_production: boolean
  sort_order: number
  active: boolean
}

export function useWorkshop() {
  const supabase = useMemo(() => createClient(), [])
  const [options, setOptions] = useState<WorkshopOption[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clientServices, setClientServices] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [optRes, svcRes, csRes] = await Promise.all([
      supabase.from('workshop_options').select('*').order('kind').order('sort_order'),
      supabase.from('services').select('*').order('sort_order'),
      supabase.from('client_services').select('client_id, service_id'),
    ])
    setOptions((optRes.data ?? []) as WorkshopOption[])
    setServices((svcRes.data ?? []) as Service[])
    const map: Record<string, string[]> = {}
    for (const r of csRes.data ?? []) {
      map[r.client_id] = [...(map[r.client_id] ?? []), r.service_id]
    }
    setClientServices(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const byKind = useCallback(
    (kind: WorkshopOption['kind'], includeInactive = false) =>
      options.filter(o => o.kind === kind && (includeInactive || o.active)),
    [options]
  )

  // ── Opciones ──
  const addOption = useCallback(async (kind: string, label: string, color?: string) => {
    const value = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const maxOrder = Math.max(0, ...options.filter(o => o.kind === kind).map(o => o.sort_order))
    const { data, error } = await supabase.from('workshop_options')
      .insert({ kind, value, label, color: color ?? null, sort_order: maxOrder + 1 })
      .select().single()
    if (error) throw error
    setOptions(prev => [...prev, data as WorkshopOption])
  }, [supabase, options])

  const updateOption = useCallback(async (id: string, updates: Partial<WorkshopOption>) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o))
    const { error } = await supabase.from('workshop_options').update(updates).eq('id', id)
    if (error) { load(); throw error }
  }, [supabase, load])

  const deleteOption = useCallback(async (id: string) => {
    const opt = options.find(o => o.id === id)
    if (opt?.is_system) {
      // Los de sistema solo se desactivan
      return updateOption(id, { active: false })
    }
    setOptions(prev => prev.filter(o => o.id !== id))
    const { error } = await supabase.from('workshop_options').delete().eq('id', id)
    if (error) { load(); throw error }
  }, [supabase, options, updateOption, load])

  // ── Servicios ──
  const addService = useCallback(async (svc: Partial<Service>) => {
    const slug = (svc.name ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const maxOrder = Math.max(0, ...services.map(s => s.sort_order))
    const { data, error } = await supabase.from('services')
      .insert({ ...svc, slug, sort_order: maxOrder + 1 }).select().single()
    if (error) throw error
    setServices(prev => [...prev, data as Service])
  }, [supabase, services])

  const updateService = useCallback(async (id: string, updates: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    const { error } = await supabase.from('services').update(updates).eq('id', id)
    if (error) { load(); throw error }
  }, [supabase, load])

  const deleteService = useCallback(async (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id))
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) { load(); throw error }
  }, [supabase, load])

  // ── Servicios por cliente ──
  const toggleClientService = useCallback(async (clientId: string, serviceId: string, on: boolean) => {
    setClientServices(prev => ({
      ...prev,
      [clientId]: on
        ? [...(prev[clientId] ?? []), serviceId]
        : (prev[clientId] ?? []).filter(id => id !== serviceId),
    }))
    if (on) {
      const { error } = await supabase.from('client_services').insert({ client_id: clientId, service_id: serviceId })
      if (error && !error.message.includes('duplicate')) { load(); throw error }
    } else {
      const { error } = await supabase.from('client_services')
        .delete().eq('client_id', clientId).eq('service_id', serviceId)
      if (error) { load(); throw error }
    }
  }, [supabase, load])

  /** ¿Este cliente tiene calendario de contenido activo? */
  const clientHasContentCalendar = useCallback((clientId: string) => {
    const ids = clientServices[clientId] ?? []
    return services.some(s => ids.includes(s.id) && s.enables_content_calendar)
  }, [clientServices, services])

  return {
    options, services, clientServices, loading, byKind,
    addOption, updateOption, deleteOption,
    addService, updateService, deleteService,
    toggleClientService, clientHasContentCalendar,
    reload: load,
  }
}
