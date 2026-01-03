'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useClients, Client } from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { 
  ArrowLeft, 
  Loader2, 
  FolderPlus, 
  Calendar, 
  Clock, 
  Globe, 
  User,
  Code,
  Palette,
  Share2,
  MoreHorizontal,
  Infinity,
  Bell,
  Plus,
  Search,
} from 'lucide-react'

const PROJECT_TYPES = [
  { id: 'web', label: 'Web / Desarrollo', icon: Code, color: 'primary' },
  { id: 'graphic', label: 'Diseño Gráfico', icon: Palette, color: 'secondary' },
  { id: 'social_media', label: 'Redes Sociales', icon: Share2, color: 'amber' },
  { id: 'other', label: 'Otros', icon: MoreHorizontal, color: 'muted' },
]

const DURATION_TYPES = [
  { id: 'fixed', label: 'Fecha específica', description: 'Proyecto con fecha de inicio y fin', icon: Calendar },
  { id: 'indefinite', label: 'Indefinido', description: 'Sin fecha de finalización', icon: Infinity },
]

function NewProjectForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('client')
  
  const supabase = createClient()
  const { clients, fetchClients } = useClients()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: preselectedClientId || '',
    project_type: 'web',
    duration_type: 'fixed',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    estimated_hours: '',
    language: 'es',
    notification_settings: {
      on_start: true,
      on_deliverable_due: true,
      reminder_hours_before: 24,
      // Recordatorios para entregables atrasados (en días)
      overdue_reminders: {
        first: 1,   // Primer recordatorio: 1 día después
        second: 3,  // Segundo recordatorio: 3 días después
        third: 7,   // Tercer recordatorio: 7 días después
      },
    },
  })

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(clientSearch.toLowerCase()))
  )

  // Get selected client
  const selectedClient = clients.find(c => c.id === formData.client_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!formData.client_id) {
      setError('Debes seleccionar un cliente')
      setIsLoading(false)
      return
    }

    if (formData.duration_type === 'fixed' && !formData.end_date) {
      setError('Debes especificar la fecha de entrega')
      setIsLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const projectData = {
      name: formData.name,
      description: formData.description || null,
      client_id: formData.client_id,
      project_type: formData.project_type,
      duration_type: formData.duration_type,
      start_date: formData.start_date,
      end_date: formData.duration_type === 'indefinite' ? null : formData.end_date,
      estimated_hours: parseFloat(formData.estimated_hours) || 0,
      language: formData.language as 'es' | 'en',
      notification_settings: formData.notification_settings,
      created_by: user?.id,
    }

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setIsLoading(false)
    } else {
      router.push(`/projects/${data.id}`)
    }
  }

  const getAvatarColor = (index: number) => {
    const colors = ['primary', 'secondary', 'amber', 'blue'] as const
    return colors[index % colors.length]
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Proyecto</h1>
          <p className="text-muted-foreground">Crea un nuevo proyecto para un cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-error-light border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        {/* Project Type Selection */}
        <Card className="p-6">
          <Label className="text-base font-semibold mb-4 block">Tipo de Proyecto *</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PROJECT_TYPES.map((type) => {
              const Icon = type.icon
              const isSelected = formData.project_type === type.id
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, project_type: type.id })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary-light'
                      : 'border-transparent bg-muted hover:border-border'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-primary text-white' : 'bg-background-card text-muted-foreground'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {type.label}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Client Selection */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-semibold">Cliente *</Label>
            <Link href="/clients/new">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Nuevo Cliente
              </Button>
            </Link>
          </div>

          {selectedClient ? (
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted">
              <div className="flex items-center gap-3">
                <Avatar size="md">
                  <AvatarFallback variant="primary">
                    {getInitials(selectedClient.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{selectedClient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedClient.company || selectedClient.email}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFormData({ ...formData, client_id: '' })}
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  variant="filled"
                  placeholder="Buscar cliente por nombre, email o empresa..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setShowClientDropdown(true)
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="pl-9"
                />
              </div>

              {showClientDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowClientDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background-card rounded-xl shadow-lg border border-border max-h-64 overflow-y-auto z-20">
                    {filteredClients.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {clients.length === 0 ? (
                          <div>
                            <p>No hay clientes registrados</p>
                            <Link href="/clients/new">
                              <Button variant="ghost" size="sm" className="mt-2 gap-1.5">
                                <Plus className="w-4 h-4" />
                                Crear primer cliente
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          'No se encontraron resultados'
                        )}
                      </div>
                    ) : (
                      filteredClients.map((client, index) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, client_id: client.id })
                            setShowClientDropdown(false)
                            setClientSearch('')
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                        >
                          <Avatar size="sm">
                            <AvatarFallback variant={getAvatarColor(index)}>
                              {getInitials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {client.company || client.email}
                            </p>
                          </div>
                          {client.active_projects ? (
                            <Badge variant="soft-primary" size="sm">
                              {client.active_projects} activo{client.active_projects > 1 ? 's' : ''}
                            </Badge>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Project Info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Información del Proyecto</h2>
              <p className="text-sm text-muted-foreground">Datos básicos del proyecto</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Proyecto *</Label>
              <Input
                id="name"
                variant="filled"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Rediseño de Identidad Corporativa"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe brevemente el proyecto..."
                className="w-full min-h-[100px] px-4 py-3 rounded-xl border-0 bg-muted text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background-card placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </Card>

        {/* Duration */}
        <Card className="p-6">
          <Label className="text-base font-semibold mb-4 block">Duración del Proyecto</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {DURATION_TYPES.map((type) => {
              const Icon = type.icon
              const isSelected = formData.duration_type === type.id
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, duration_type: type.id })}
                  className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary-light'
                      : 'border-transparent bg-muted hover:border-border'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-primary text-white' : 'bg-background-card text-muted-foreground'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {type.label}
                    </p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Fecha de Inicio *
              </Label>
              <Input
                id="start_date"
                type="date"
                variant="filled"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            {formData.duration_type === 'fixed' && (
              <div className="space-y-2">
                <Label htmlFor="end_date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Fecha de Entrega *
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  variant="filled"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required={formData.duration_type === 'fixed'}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Additional Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-secondary-light flex items-center justify-center">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Configuración Adicional</h2>
              <p className="text-sm text-muted-foreground">Opciones extra del proyecto</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_hours" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Horas Estimadas
              </Label>
              <Input
                id="estimated_hours"
                type="number"
                variant="filled"
                min="0"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                Idioma
              </Label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border-0 bg-muted text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background-card"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Overdue Reminders Settings - For ALL projects */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-error-light flex items-center justify-center">
              <Bell className="w-5 h-5 text-error" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Recordatorios de Entregables</h2>
              <p className="text-sm text-muted-foreground">Configura cuándo enviar recordatorios si hay retrasos</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define cuántos días después de la fecha límite se enviarán los recordatorios:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* First Reminder */}
              <div className="p-4 rounded-xl bg-muted space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-600">
                    1
                  </div>
                  <span className="font-medium text-foreground">Primer Recordatorio</span>
                </div>
                <select
                  value={formData.notification_settings.overdue_reminders.first}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_settings: {
                      ...formData.notification_settings,
                      overdue_reminders: {
                        ...formData.notification_settings.overdue_reminders,
                        first: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="w-full h-10 px-3 rounded-lg bg-background-card border-0 text-sm"
                >
                  <option value={1}>1 día después</option>
                  <option value={2}>2 días después</option>
                  <option value={3}>3 días después</option>
                  <option value={5}>5 días después</option>
                  <option value={7}>7 días después</option>
                </select>
              </div>

              {/* Second Reminder */}
              <div className="p-4 rounded-xl bg-muted space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                    2
                  </div>
                  <span className="font-medium text-foreground">Segundo Recordatorio</span>
                </div>
                <select
                  value={formData.notification_settings.overdue_reminders.second}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_settings: {
                      ...formData.notification_settings,
                      overdue_reminders: {
                        ...formData.notification_settings.overdue_reminders,
                        second: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="w-full h-10 px-3 rounded-lg bg-background-card border-0 text-sm"
                >
                  <option value={2}>2 días después</option>
                  <option value={3}>3 días después</option>
                  <option value={5}>5 días después</option>
                  <option value={7}>7 días después</option>
                  <option value={10}>10 días después</option>
                  <option value={14}>14 días después</option>
                </select>
              </div>

              {/* Third Reminder */}
              <div className="p-4 rounded-xl bg-muted space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600">
                    3
                  </div>
                  <span className="font-medium text-foreground">Tercer Recordatorio</span>
                </div>
                <select
                  value={formData.notification_settings.overdue_reminders.third}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_settings: {
                      ...formData.notification_settings,
                      overdue_reminders: {
                        ...formData.notification_settings.overdue_reminders,
                        third: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="w-full h-10 px-3 rounded-lg bg-background-card border-0 text-sm"
                >
                  <option value={5}>5 días después</option>
                  <option value={7}>7 días después</option>
                  <option value={10}>10 días después</option>
                  <option value={14}>14 días después</option>
                  <option value={21}>21 días después</option>
                  <option value={30}>30 días después</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              💡 Los recordatorios se envían automáticamente por email y notificación en la app cuando un entregable supera su fecha límite.
            </p>
          </div>
        </Card>

        {/* Notification Settings (for social media projects) */}
        {formData.project_type === 'social_media' && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Configuración de Notificaciones</h2>
                <p className="text-sm text-muted-foreground">Recordatorios para publicaciones</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-xl bg-muted cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Notificar al iniciar proyecto</p>
                  <p className="text-sm text-muted-foreground">Enviar notificación al cliente cuando inicie</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notification_settings.on_start}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_settings: {
                      ...formData.notification_settings,
                      on_start: e.target.checked
                    }
                  })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl bg-muted cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Recordatorios de publicaciones</p>
                  <p className="text-sm text-muted-foreground">Enviar recordatorio antes de cada publicación</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notification_settings.on_deliverable_due}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_settings: {
                      ...formData.notification_settings,
                      on_deliverable_due: e.target.checked
                    }
                  })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
              </label>

              {formData.notification_settings.on_deliverable_due && (
                <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                  <Label htmlFor="reminder_hours">Horas de anticipación para recordatorio</Label>
                  <select
                    id="reminder_hours"
                    value={formData.notification_settings.reminder_hours_before}
                    onChange={(e) => setFormData({
                      ...formData,
                      notification_settings: {
                        ...formData.notification_settings,
                        reminder_hours_before: parseInt(e.target.value)
                      }
                    })}
                    className="w-full h-11 px-4 rounded-xl border-0 bg-background-card text-sm"
                  >
                    <option value={1}>1 hora antes</option>
                    <option value={2}>2 horas antes</option>
                    <option value={6}>6 horas antes</option>
                    <option value={12}>12 horas antes</option>
                    <option value={24}>24 horas antes (1 día)</option>
                    <option value={48}>48 horas antes (2 días)</option>
                    <option value={72}>72 horas antes (3 días)</option>
                  </select>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Link href="/" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" className="flex-1 gap-2" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4" />
                Crear Proyecto
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
}

// Export with Suspense wrapper
export default function NewProjectPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewProjectForm />
    </Suspense>
  )
}
