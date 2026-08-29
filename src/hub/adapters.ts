// ============================================================================
// Adapters: traducen entre el esquema de Supabase (español) y la UI (diseño)
// ============================================================================
import type { ContentPost, Client, User, Notification, PostStatus, Channel, PostFormat } from './types'

// ---------- Status ----------
const STATUS_DB_TO_UI: Record<string, PostStatus> = {
  idea: 'idea', creacion: 'creation', diseno: 'design', revision: 'review',
  aprobado: 'approved', programado: 'scheduled', publicado: 'published',
}
const STATUS_UI_TO_DB: Record<PostStatus, string> = {
  idea: 'idea', creation: 'creacion', design: 'diseno', review: 'revision',
  approved: 'aprobado', scheduled: 'programado', published: 'publicado',
}

// ---------- Channel ----------
const CHANNEL_DB_TO_UI: Record<string, Channel> = {
  instagram: 'Instagram', facebook: 'Facebook', fb_ig: 'FB + IG',
  tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube', email: 'Email',
}
const CHANNEL_UI_TO_DB: Record<Channel, string> = {
  Instagram: 'instagram', Facebook: 'facebook', 'FB + IG': 'fb_ig',
  TikTok: 'tiktok', LinkedIn: 'linkedin', YouTube: 'youtube', Email: 'email',
}

// ---------- Format (DB ya está en español, la UI usa los mismos valores) ----------
const VALID_FORMATS: PostFormat[] = ['reel','carrusel','story','imagen','video','foto','texto','evento','shopper','email']

// ---------- Fechas ----------
const TZ = 'America/Puerto_Rico'

/** timestamptz → "YYYY-MM-DD" en hora de PR */
export function toDateStr(ts: string | null): string {
  if (!ts) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts))
}

/** "YYYY-MM-DD" → timestamptz a las 10:00 AM PR (hora editable después) */
export function toTimestamp(dateStr: string): string | null {
  if (!dateStr) return null
  return `${dateStr}T10:00:00-04:00`
}

export function todayPR(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

// ---------- Colores para usuarios (paleta del sistema) ----------
const USER_PALETTE = ['#dbfa45', '#31b498', '#e040fb', '#f59e0b', '#22c55e', '#ff2d78', '#a78bfa', '#38bdf8']
export function colorForId(id: string): string {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return USER_PALETTE[h % USER_PALETTE.length]
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
}

// ============================================================================
// content_items (DB) → ContentPost (UI)
// ============================================================================
export function postFromDb(row: any, boost?: any): ContentPost {
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.titulo,
    channel: CHANNEL_DB_TO_UI[row.canal] ?? 'Instagram',
    format: (VALID_FORMATS.includes(row.formato) ? row.formato : 'imagen') as PostFormat,
    angle: row.angulo ?? '',
    copy: row.copy ?? '',
    hashtags: row.hashtags ?? [],
    brand: row.marca_producto ?? '',
    product: '',
    assigneeId: row.asignado_a ?? '',
    campaign: row.campana ?? '',
    status: STATUS_DB_TO_UI[row.status] ?? 'idea',
    scheduledDate: toDateStr(row.publica_at),
    publishedDate: row.status === 'publicado' ? toDateStr(row.updated_at) : undefined,
    boostBudget: boost?.presupuesto != null ? Number(boost.presupuesto) : (row.boosted ? 0 : undefined),
    actualSpend: boost?.gasto_real != null ? Number(boost.gasto_real) : undefined,
    reach: boost?.alcance != null ? Number(boost.alcance) : undefined,
    notes: row.notas ?? '',
    attachedFiles: Array.isArray(row.archivos) ? row.archivos : [],
  }
}

/** ContentPost (UI) → payload de content_items (DB) */
export function postToDb(p: Partial<ContentPost>): Record<string, any> {
  const out: Record<string, any> = {}
  if (p.title !== undefined) out.titulo = p.title
  if (p.clientId !== undefined) out.client_id = p.clientId
  if (p.status !== undefined) out.status = STATUS_UI_TO_DB[p.status]
  if (p.channel !== undefined) out.canal = CHANNEL_UI_TO_DB[p.channel]
  if (p.format !== undefined) out.formato = p.format
  if (p.angle !== undefined) out.angulo = p.angle
  if (p.scheduledDate !== undefined) out.publica_at = toTimestamp(p.scheduledDate)
  if (p.copy !== undefined) out.copy = p.copy
  if (p.brand !== undefined) out.marca_producto = p.brand
  if (p.assigneeId !== undefined) out.asignado_a = p.assigneeId || null
  if (p.campaign !== undefined) out.campana = p.campaign
  if (p.hashtags !== undefined) out.hashtags = p.hashtags
  if (p.boostBudget !== undefined) out.boosted = p.boostBudget != null && p.boostBudget > 0
  if (p.notes !== undefined) out.notas = p.notes
  if (p.attachedFiles !== undefined) out.archivos = p.attachedFiles
  return out
}

// ============================================================================
// hub_clients (DB) → Client (UI)
// ============================================================================
export function clientFromDb(row: any): Client {
  const reglas = row.reglas_marca ?? {}
  return {
    id: row.id,
    name: row.nombre,
    company: row.nombre,
    industry: '',
    email: (row.contactos?.[0]?.email) ?? '',
    phone: (row.contactos?.[0]?.phone) ?? '',
    initials: initialsOf(row.nombre),
    color: row.color ?? colorForId(row.id),
    language: row.idioma === 'en' ? 'English' : 'Español',
    timezone: row.timezone ?? 'America/Puerto_Rico',
    brandRules: {
      bannedWords: reglas.palabras_prohibidas ?? reglas.bannedWords ?? [],
      guidelines: reglas.guidelines ?? row.notas_marca ?? '',
      tone: reglas.tone ?? '',
      colors: reglas.colors ?? [],
      fonts: reglas.fonts ?? [],
      logoUrl: reglas.logoUrl,
    },
    contacts: Array.isArray(row.contactos) ? row.contactos.map((c: any) => ({
      name: c.name ?? c.nombre ?? '', role: c.role ?? c.puesto ?? '',
      email: c.email ?? '', phone: c.phone ?? c.telefono ?? '',
    })) : [],
    interactions: [],
    portalAccess: false,
    notifyEmail: row.notif_email ?? true,
    projectIds: [],
  }
}

// ============================================================================
// users (DB) → User (UI)
// ============================================================================
export function userFromDb(row: any, assignedClientIds: string[] = []): User {
  const roleMap: Record<string, User['role']> = {
    superadmin: 'superadmin', admin: 'admin', crew: 'crew', cliente: 'client', client: 'client',
  }
  return {
    id: row.id,
    name: row.name ?? row.email,
    email: row.email,
    phone: row.phone ?? '',
    role: roleMap[row.role] ?? 'crew',
    initials: initialsOf(row.name ?? row.email),
    color: colorForId(row.id),
    assignedClientIds,
    alertThresholdDays: 3,
    emailNotifications: true,
    status: 'active',
    joinDate: toDateStr(row.created_at),
    skills: [],
    streak: 0,
  }
}

// ============================================================================
// notifications (DB) → Notification (UI)
// ============================================================================
export function notifFromDb(row: any): Notification {
  const typeMap: Record<string, Notification['type']> = {
    alert: 'alert', approval: 'approval', mention: 'mention', publish: 'publish',
    deadline: 'alert', assignment: 'system', comment: 'mention',
  }
  return {
    id: row.id,
    type: typeMap[row.type] ?? 'system',
    title: row.title,
    message: row.message,
    timestamp: row.created_at,
    read: row.read ?? false,
    projectId: row.project_id ?? undefined,
  }
}

// ============================================================================
// Racha: días consecutivos (hacia atrás desde hoy) sin posts atrasados
// ============================================================================
export function computeStreak(posts: ContentPost[], userId: string): number {
  const mine = posts.filter(p => p.assigneeId === userId && p.scheduledDate)
  if (mine.length === 0) return 0
  const today = todayPR()
  const overdueDates = new Set(
    mine.filter(p => p.scheduledDate < today && p.status !== 'published')
        .map(p => p.scheduledDate)
  )
  let streak = 0
  const d = new Date(today + 'T12:00:00')
  for (let i = 0; i < 60; i++) {
    const key = d.toISOString().slice(0, 10)
    if (overdueDates.has(key)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// ============================================================================
// FASE 2: Projects, Deliverables, Documents, Interactions
// ============================================================================
import type { Project, Deliverable, Document as HubDocument, ClientInteraction, ProjectPhase, PhaseData } from './types'

export const DEFAULT_PHASES: PhaseData[] = [
  { key: 'discovery', label: 'Descubrimiento' },
  { key: 'strategy', label: 'Estrategia' },
  { key: 'production', label: 'Producción' },
  { key: 'review', label: 'Revisión' },
  { key: 'launch', label: 'Lanzamiento' },
  { key: 'reporting', label: 'Reporte' },
]

const DELIV_DB_TO_UI: Record<string, Deliverable['status']> = {
  pending: 'pending', in_review: 'in-review', 'in-review': 'in-review',
  approved: 'approved', rejected: 'rejected',
}
const DELIV_UI_TO_DB: Record<Deliverable['status'], string> = {
  pending: 'pending', 'in-review': 'in_review', approved: 'approved', rejected: 'rejected',
}

export function deliverableFromDb(row: any): Deliverable {
  return {
    id: row.id,
    title: row.name,
    status: DELIV_DB_TO_UI[row.status] ?? 'pending',
    rejectionReason: row.rejection_reason ?? undefined,
    dueDate: row.due_date ?? '',
    timeSpent: Number(row.time_spent ?? 0),
    comments: Array.isArray(row.comments_list) ? row.comments_list : [],
    attachedFiles: Array.isArray(row.archivos) ? row.archivos : [],
  }
}

export function deliverableToDb(d: Partial<Deliverable>): Record<string, any> {
  const out: Record<string, any> = {}
  if (d.title !== undefined) out.name = d.title
  if (d.status !== undefined) out.status = DELIV_UI_TO_DB[d.status]
  if (d.rejectionReason !== undefined) out.rejection_reason = d.rejectionReason
  if (d.dueDate !== undefined) out.due_date = d.dueDate || null
  if (d.timeSpent !== undefined) out.time_spent = d.timeSpent
  if (d.comments !== undefined) out.comments_list = d.comments
  if (d.attachedFiles !== undefined) out.archivos = d.attachedFiles
  return out
}

export function projectFromDb(row: any, deliverables: Deliverable[] = []): Project {
  const phases: PhaseData[] = Array.isArray(row.phases) && row.phases.length > 0 ? row.phases : DEFAULT_PHASES
  const statusMap: Record<string, Project['status']> = {
    active: 'active', 'on-hold': 'paused', paused: 'paused', completed: 'completed', cancelled: 'paused',
  }
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    currentPhase: (row.current_phase ?? 'discovery') as ProjectPhase,
    phases,
    deliverables,
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    budget: row.budget != null ? Number(row.budget) : 0,
    description: row.description ?? '',
    color: row.color ?? colorForId(row.id),
    status: statusMap[row.status] ?? 'active',
  }
}

export function projectToDb(p: Partial<Project>): Record<string, any> {
  const out: Record<string, any> = {}
  if (p.name !== undefined) out.name = p.name
  if (p.clientId !== undefined) out.client_id = p.clientId
  if (p.currentPhase !== undefined) out.current_phase = p.currentPhase
  if (p.phases !== undefined) out.phases = p.phases
  if (p.startDate !== undefined) out.start_date = p.startDate || null
  if (p.endDate !== undefined) out.end_date = p.endDate || null
  if (p.budget !== undefined) out.budget = p.budget
  if (p.description !== undefined) out.description = p.description
  if (p.color !== undefined) out.color = p.color
  if (p.status !== undefined) out.status = p.status === 'paused' ? 'on-hold' : p.status
  return out
}

export function documentFromDb(row: any): HubDocument {
  return {
    id: row.id,
    name: row.name,
    size: Number(row.size ?? 0),
    type: row.type ?? '',
    url: row.url,
    uploadedAt: toDateStr(row.created_at),
    clientId: row.client_id,
    projectId: row.project_id ?? undefined,
    postId: row.post_id ?? undefined,
    category: row.category ?? 'otro',
    notes: row.notes ?? '',
  }
}

export function interactionFromDb(row: any, userName?: string): ClientInteraction {
  const typeMap: Record<string, ClientInteraction['type']> = {
    call: 'call', email: 'email', meeting: 'meeting', task: 'task',
    llamada: 'call', reunion: 'meeting', tarea: 'task',
  }
  return {
    id: row.id,
    date: toDateStr(row.created_at),
    type: typeMap[row.interaction_type] ?? 'task',
    notes: row.title + (row.description ? ` — ${row.description}` : ''),
    by: userName ?? '',
  }
}

/** Client (UI) → payload de hub_clients (DB) */
export function clientToDb(c: Partial<import('./types').Client>): Record<string, any> {
  const out: Record<string, any> = {}
  if (c.name !== undefined) {
    out.nombre = c.name
    out.slug = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
  if (c.color !== undefined) out.color = c.color
  if (c.language !== undefined) out.idioma = c.language === 'English' ? 'en' : 'es'
  if (c.timezone !== undefined) out.timezone = c.timezone
  if (c.brandRules !== undefined) out.reglas_marca = {
    palabras_prohibidas: c.brandRules.bannedWords ?? [],
    guidelines: c.brandRules.guidelines ?? '',
    tone: c.brandRules.tone ?? '',
    colors: c.brandRules.colors ?? [],
    fonts: c.brandRules.fonts ?? [],
    logoUrl: c.brandRules.logoUrl,
  }
  if (c.contacts !== undefined) out.contactos = c.contacts
  if (c.notifyEmail !== undefined) out.notif_email = c.notifyEmail
  return out
}
