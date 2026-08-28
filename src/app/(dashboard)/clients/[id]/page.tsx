'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useClients, Client, formatPhone } from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate, formatRelativeTime, getInitials } from '@/lib/utils'
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  Building,
  MapPin,
  Globe,
  Calendar,
  FolderKanban,
  Plus,
  MessageCircle,
  Bell,
  Clock,
  CheckCircle2,
  FileText,
  Activity,
  ExternalLink,
  Loader2,
} from 'lucide-react'

interface Project {
  id: string
  name: string
  status: string
  progress: number
  project_type: string
  start_date: string
  end_date: string | null
  created_at: string
}

interface Interaction {
  id: string
  interaction_type: string
  title: string
  description: string | null
  created_at: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string
  const { getClientWithProjects } = useClients()
  
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('projects')

  useEffect(() => {
    const loadClient = async () => {
      setIsLoading(true)
      const data = await getClientWithProjects(clientId)
      if (data) {
        setClient(data.client)
        setProjects(data.projects)
        setInteractions(data.interactions)
      }
      setIsLoading(false)
    }
    loadClient()
  }, [clientId, getClientWithProjects])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="soft-primary" size="sm">En Progreso</Badge>
      case 'completed':
        return <Badge variant="success" size="sm">Completado</Badge>
      case 'on-hold':
        return <Badge variant="warning" size="sm">En Pausa</Badge>
      case 'cancelled':
        return <Badge variant="error" size="sm">Cancelado</Badge>
      default:
        return <Badge variant="muted" size="sm">{status}</Badge>
    }
  }

  const getProjectTypeBadge = (type: string) => {
    switch (type) {
      case 'web':
        return <Badge variant="soft-primary" size="sm">Web</Badge>
      case 'graphic':
        return <Badge variant="soft-secondary" size="sm">Diseño</Badge>
      case 'social_media':
        return <Badge variant="warning" size="sm">Redes Sociales</Badge>
      default:
        return <Badge variant="muted" size="sm">Otro</Badge>
    }
  }

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'email_sent':
      case 'email_received':
        return <Mail className="w-4 h-4" />
      case 'call':
        return <Phone className="w-4 h-4" />
      case 'meeting':
        return <Calendar className="w-4 h-4" />
      case 'project_created':
        return <FolderKanban className="w-4 h-4" />
      case 'file_shared':
        return <FileText className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Link href="/clients">
          <Button variant="ghost" className="mt-4">Volver a clientes</Button>
        </Link>
      </div>
    )
  }

  const activeProjects = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar size="xl">
            <AvatarImage src={client.avatar_url || ''} />
            <AvatarFallback variant="primary" className="text-xl">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
              <Badge 
                variant={client.status === 'active' ? 'success' : client.status === 'inactive' ? 'warning' : 'muted'}
              >
                {client.status === 'active' ? 'Activo' : client.status === 'inactive' ? 'Inactivo' : 'Archivado'}
              </Badge>
            </div>
            {client.company && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Building className="w-4 h-4" />
                {client.company}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/projects/new?client=${client.id}`}>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Proyecto
            </Button>
          </Link>
          <Link href={`/clients/${client.id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Total Proyectos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-light flex items-center justify-center">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeProjects}</p>
              <p className="text-xs text-muted-foreground">En Progreso</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-light flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedProjects}</p>
              <p className="text-xs text-muted-foreground">Completados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{formatDate(client.created_at)}</p>
              <p className="text-xs text-muted-foreground">Cliente desde</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info Sidebar */}
        <Card className="p-6 lg:col-span-1 h-fit">
          <h3 className="font-semibold text-foreground mb-4">Información de Contacto</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a href={`mailto:${client.email}`} className="text-foreground hover:text-primary transition-colors">
                  {client.email}
                </a>
              </div>
            </div>

            {client.phone && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <a href={`tel:${client.phone}`} className="text-foreground hover:text-primary transition-colors">
                    {formatPhone(client.phone)}
                  </a>
                </div>
              </div>
            )}

            {client.whatsapp && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <a 
                    href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {formatPhone(client.whatsapp)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {(client.address || client.city) && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="text-foreground">
                    {[client.address, client.city, client.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {client.website && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sitio Web</p>
                  <a 
                    href={client.website} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {client.website.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Notification Preferences */}
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificaciones
            </h4>
            <div className="flex flex-wrap gap-2">
              {client.notification_preferences?.email && (
                <Badge variant="soft-primary" size="sm">Email ✓</Badge>
              )}
              {client.notification_preferences?.sms && (
                <Badge variant="soft-primary" size="sm">SMS ✓</Badge>
              )}
              {client.notification_preferences?.whatsapp && (
                <Badge variant="soft-primary" size="sm">WhatsApp ✓</Badge>
              )}
            </div>
          </div>

          {/* Internal Notes */}
          {client.internal_notes && (
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notas Internas
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {client.internal_notes}
              </p>
            </div>
          )}
        </Card>

        {/* Tabs Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
            {[
              { id: 'projects', label: 'Proyectos', count: projects.length },
              { id: 'activity', label: 'Actividad', count: interactions.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-background-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === tab.id ? 'bg-primary-light text-primary' : 'bg-border text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Proyectos</h3>
                <Link href={`/projects/new?client=${client.id}`}>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nuevo
                  </Button>
                </Link>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay proyectos con este cliente</p>
                  <Link href={`/projects/new?client=${client.id}`}>
                    <Button variant="ghost" className="mt-2 gap-2">
                      <Plus className="w-4 h-4" />
                      Crear primer proyecto
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between p-4 rounded-2xl bg-muted hover:bg-border transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {project.name}
                          </p>
                          {getProjectTypeBadge(project.project_type)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatDate(project.start_date)}</span>
                          {project.end_date && (
                            <>
                              <span>→</span>
                              <span>{formatDate(project.end_date)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{project.progress}%</p>
                          <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                        {getStatusBadge(project.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Historial de Actividad</h3>

              {interactions.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay actividad registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interactions.map((interaction, index) => (
                    <div key={interaction.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          {getInteractionIcon(interaction.interaction_type)}
                        </div>
                        {index < interactions.length - 1 && (
                          <div className="w-px h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-foreground">{interaction.title}</p>
                        {interaction.description && (
                          <p className="text-sm text-muted-foreground mt-1">{interaction.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatRelativeTime(interaction.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
