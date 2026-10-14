'use client'
// ============================================================================
// Datos de Reportes: espacios, miembros, tablas (useReportes) y filas de una
// tabla con tiempo real (useReportRows).
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSONContent } from '@tiptap/react'
import { createClient } from '@/lib/supabase/client'
import type { ReportSpace, ReportTable, ReportRow, SpaceMember, ReportColumn, CellValue } from './types'
import { newId, nowLocal } from './utils'

/* eslint-disable @typescript-eslint/no-explicit-any */
const spaceFromDb = (r: any): ReportSpace => ({
  id: r.id, name: r.name, icon: r.icon, position: r.position, createdBy: r.created_by,
})

const tableFromDb = (r: any): ReportTable => ({
  id: r.id, spaceId: r.space_id, name: r.name, icon: r.icon, titleLabel: r.title_label,
  columns: r.columns ?? [], groupBy: r.group_by, sortBy: r.sort_by, sortDesc: r.sort_desc,
  template: r.template, position: r.position,
})

const rowFromDb = (r: any): ReportRow => ({
  id: r.id, tableId: r.table_id, title: r.title, values: r.values ?? {}, content: r.content,
  position: r.position, createdAt: r.created_at, updatedAt: r.updated_at,
})
/* eslint-enable @typescript-eslint/no-explicit-any */

const tablePatchToDb = (p: Partial<ReportTable>) => {
  const out: Record<string, unknown> = {}
  if (p.name !== undefined) out.name = p.name
  if (p.icon !== undefined) out.icon = p.icon
  if (p.titleLabel !== undefined) out.title_label = p.titleLabel
  if (p.columns !== undefined) out.columns = p.columns
  if (p.groupBy !== undefined) out.group_by = p.groupBy
  if (p.sortBy !== undefined) out.sort_by = p.sortBy
  if (p.sortDesc !== undefined) out.sort_desc = p.sortDesc
  if (p.template !== undefined) out.template = p.template
  if (p.position !== undefined) out.position = p.position
  return out
}

// ---------------------------------------------------------------------------
// Plantillas de tabla para arrancar rápido
// ---------------------------------------------------------------------------
export type TablePreset = 'blank' | 'bitacora' | 'redes'

export function presetTable(preset: TablePreset): Partial<ReportTable> {
  if (preset === 'bitacora') {
    const start = newId(), end = newId()
    return {
      titleLabel: 'Fecha de reporte',
      columns: [
        { id: start, name: 'Hora de comienzo', type: 'date', withTime: true, defaultNow: true },
        { id: end, name: 'Hora de salida', type: 'date', withTime: true },
      ],
      groupBy: start, sortBy: start, sortDesc: true,
    }
  }
  if (preset === 'redes') {
    const red = newId(), last = newId()
    return {
      titleLabel: 'Cliente',
      columns: [
        { id: red, name: 'Red', type: 'select', options: [
          { id: newId(), label: 'Facebook', color: '#60a5fa' },
          { id: newId(), label: 'Instagram', color: '#e040fb' },
        ] },
        { id: newId(), name: 'Enlace', type: 'url' },
        { id: last, name: 'Último post', type: 'date' },
        { id: newId(), name: 'Última revisión', type: 'date' },
        { id: newId(), name: 'Publicaciones programadas', type: 'date' },
        { id: newId(), name: 'Comentarios', type: 'text' },
      ],
      groupBy: red, sortBy: null, sortDesc: false,
    }
  }
  return { titleLabel: 'Nombre', columns: [], groupBy: null, sortBy: null, sortDesc: true }
}

// ---------------------------------------------------------------------------
// Espacios, miembros y tablas
// ---------------------------------------------------------------------------
export function useReportes() {
  const supabase = useMemo(() => createClient(), [])
  const [spaces, setSpaces] = useState<ReportSpace[]>([])
  const [members, setMembers] = useState<SpaceMember[]>([])
  const [tables, setTables] = useState<ReportTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const [s, m, t] = await Promise.all([
      supabase.from('report_spaces').select('*').order('position').order('created_at'),
      supabase.from('report_space_members').select('*'),
      supabase.from('report_tables').select('*').order('position').order('created_at'),
    ])
    const err = s.error ?? m.error ?? t.error
    return {
      error: err ? err.message : null,
      spaces: (s.data ?? []).map(spaceFromDb),
      members: (m.data ?? []).map((r): SpaceMember => ({ spaceId: r.space_id, userId: r.user_id, role: r.role })),
      tables: (t.data ?? []).map(tableFromDb),
    }
  }, [supabase])

  const apply = useCallback((d: Awaited<ReturnType<typeof fetchAll>>) => {
    setError(d.error)
    if (!d.error) {
      setSpaces(d.spaces)
      setMembers(d.members)
      setTables(d.tables)
    }
    setLoading(false)
  }, [])

  const load = useCallback(() => fetchAll().then(apply), [fetchAll, apply])

  useEffect(() => {
    let cancelled = false
    fetchAll().then((d) => { if (!cancelled) apply(d) })
    return () => { cancelled = true }
  }, [fetchAll, apply])

  const createSpace = useCallback(async (name: string, icon: string) => {
    const position = (spaces.at(-1)?.position ?? 0) + 1
    const { data, error } = await supabase.from('report_spaces')
      .insert({ name, icon, position }).select().single()
    if (error) throw error
    const space = spaceFromDb(data)
    setSpaces((prev) => [...prev, space])
    return space
  }, [supabase, spaces])

  const updateSpace = useCallback(async (id: string, patch: { name?: string; icon?: string }) => {
    setSpaces((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    const { error } = await supabase.from('report_spaces').update(patch).eq('id', id)
    if (error) { load(); throw error }
  }, [supabase, load])

  const deleteSpace = useCallback(async (id: string) => {
    const { error } = await supabase.from('report_spaces').delete().eq('id', id)
    if (error) throw error
    setSpaces((prev) => prev.filter((s) => s.id !== id))
    setTables((prev) => prev.filter((t) => t.spaceId !== id))
    setMembers((prev) => prev.filter((m) => m.spaceId !== id))
  }, [supabase])

  const setMember = useCallback(async (spaceId: string, userId: string, role: SpaceMember['role'] | null) => {
    if (role === null) {
      const { error } = await supabase.from('report_space_members').delete()
        .eq('space_id', spaceId).eq('user_id', userId)
      if (error) throw error
      setMembers((prev) => prev.filter((m) => !(m.spaceId === spaceId && m.userId === userId)))
      return
    }
    const { error } = await supabase.from('report_space_members')
      .upsert({ space_id: spaceId, user_id: userId, role }, { onConflict: 'space_id,user_id' })
    if (error) throw error
    setMembers((prev) => [
      ...prev.filter((m) => !(m.spaceId === spaceId && m.userId === userId)),
      { spaceId, userId, role },
    ])
  }, [supabase])

  const createTable = useCallback(async (spaceId: string, name: string, icon: string, preset: TablePreset) => {
    const siblings = tables.filter((t) => t.spaceId === spaceId)
    const position = (siblings.at(-1)?.position ?? 0) + 1
    const { data, error } = await supabase.from('report_tables')
      .insert({ space_id: spaceId, name, icon, position, ...tablePatchToDb(presetTable(preset)) })
      .select().single()
    if (error) throw error
    const table = tableFromDb(data)
    setTables((prev) => [...prev, table])
    return table
  }, [supabase, tables])

  const updateTable = useCallback(async (id: string, patch: Partial<ReportTable>) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    const { error } = await supabase.from('report_tables').update(tablePatchToDb(patch)).eq('id', id)
    if (error) { load(); throw error }
  }, [supabase, load])

  const deleteTable = useCallback(async (id: string) => {
    const { error } = await supabase.from('report_tables').delete().eq('id', id)
    if (error) throw error
    setTables((prev) => prev.filter((t) => t.id !== id))
  }, [supabase])

  return {
    spaces, members, tables, loading, error, reload: load,
    createSpace, updateSpace, deleteSpace, setMember,
    createTable, updateTable, deleteTable,
  }
}

// ---------------------------------------------------------------------------
// Filas de una tabla
// ---------------------------------------------------------------------------
export function initialValues(columns: ReportColumn[]): Record<string, CellValue> {
  const values: Record<string, CellValue> = {}
  for (const c of columns) {
    if (c.type === 'date' && c.defaultNow) values[c.id] = nowLocal(!!c.withTime)
  }
  return values
}

export function useReportRows(tableId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  // Las filas se guardan junto con la tabla a la que pertenecen: al cambiar de
  // tabla no se ven las filas viejas mientras cargan las nuevas.
  const [state, setState] = useState<{ tableId: string | null; rows: ReportRow[] }>({ tableId: null, rows: [] })
  const rows = useMemo(() => (state.tableId === tableId ? state.rows : []), [state, tableId])
  const loading = !!tableId && state.tableId !== tableId

  const setRows = useCallback((fn: (prev: ReportRow[]) => ReportRow[]) => {
    setState((s) => (s.tableId === tableId ? { ...s, rows: fn(s.rows) } : s))
  }, [tableId])

  useEffect(() => {
    if (!tableId) return
    let cancelled = false
    supabase.from('report_rows').select('*').eq('table_id', tableId).order('position')
      .then(({ data }) => {
        if (!cancelled) setState({ tableId, rows: (data ?? []).map(rowFromDb) })
      })

    // Cambios de otras personas
    const channel = supabase.channel(`report_rows:${tableId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'report_rows', filter: `table_id=eq.${tableId}` },
        (payload) => {
          setState((s) => {
            if (s.tableId !== tableId) return s
            if (payload.eventType === 'DELETE') {
              const id = (payload.old as { id: string }).id
              return { ...s, rows: s.rows.filter((r) => r.id !== id) }
            }
            const row = rowFromDb(payload.new)
            const i = s.rows.findIndex((r) => r.id === row.id)
            if (i === -1) return { ...s, rows: [...s.rows, row] }
            const next = [...s.rows]
            next[i] = row
            return { ...s, rows: next }
          })
        })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [supabase, tableId])

  const addRow = useCallback(async (init: { title?: string; values?: Record<string, CellValue>; content?: JSONContent | null }) => {
    if (!tableId) throw new Error('Sin tabla')
    const position = Math.max(0, ...rows.map((r) => r.position)) + 1
    const { data, error } = await supabase.from('report_rows').insert({
      table_id: tableId, title: init.title ?? '', values: init.values ?? {},
      content: init.content ?? null, position,
    }).select().single()
    if (error) throw error
    const row = rowFromDb(data)
    setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]))
    return row
  }, [supabase, tableId, rows, setRows])

  const setTitle = useCallback(async (id: string, title: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, title } : r)))
    const { error } = await supabase.from('report_rows').update({ title }).eq('id', id)
    if (error) throw error
  }, [supabase, setRows])

  /** Cambia una sola celda en el servidor, sin pisar las demás */
  const setCell = useCallback(async (id: string, columnId: string, value: CellValue) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const values = { ...r.values }
      if (value === null || value === '') delete values[columnId]
      else values[columnId] = value
      return { ...r, values }
    }))
    const { error } = await supabase.rpc('report_set_cell', {
      p_row: id, p_column: columnId, p_value: value === '' ? null : value,
    })
    if (error) throw error
  }, [supabase, setRows])

  const setContent = useCallback(async (id: string, content: JSONContent) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, content } : r)))
    const { error } = await supabase.from('report_rows').update({ content }).eq('id', id)
    if (error) throw error
  }, [supabase, setRows])

  const deleteRow = useCallback(async (id: string) => {
    const { error } = await supabase.from('report_rows').delete().eq('id', id)
    if (error) throw error
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [supabase, setRows])

  return { rows, loading, addRow, setTitle, setCell, setContent, deleteRow }
}

// ---------------------------------------------------------------------------
// Imágenes: se suben al bucket privado y se sirven por nuestra API
// ---------------------------------------------------------------------------
export async function uploadReportImage(spaceId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = (file.type.split('/')[1] ?? 'png').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'png'
  const path = `${spaceId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('report-media')
    .upload(path, file, { contentType: file.type })
  if (error) throw error
  return `/api/reportes/media/${path}`
}
