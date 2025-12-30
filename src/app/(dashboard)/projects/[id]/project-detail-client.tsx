'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate, formatRelativeTime, getInitials } from '@/lib/utils'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Calendar,
  Users,
  FileText,
  MessageSquare,
  Activity,
} from 'lucide-react'

interface ProjectDetailClientProps {
  project: {
    id: string
    name: string
    description: string | null
    status: 'active' | 'on-hold' | 'completed' | 'cancelled'
    progress: number
    start_date: string
    end_date: string
    estimated_hours: number
    language: 'es' | 'en'
    checklist_client: any[]
    checklist_epikom: any[]
    client: {
      id: string
      full_name: string
      email: string
      company_name: string | null
      avatar_url: string | null
    }
    team: {
      id: string
      full_name: string
      email: string
      avatar_url: string | null
    }[]
    deliverables: {
      id: string
      name: string
      status: string
      due_date: string | null
    }[]
    timeline: {
      id: string
      action: string
      description: string
      created_at: string
      actor: {
        full_name: string
        avatar_url: string | null
      } | null
    }[]
  }
  isAdmin: boolean
}

export default function ProjectDetailClient({ project, isAdmin }: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const getStatusConfig = (status: string) => {
    const configs = {
      active: { label: 'En Progreso', icon: Clock, variant: 'default' as const },
      completed: { label: 'Completado', icon: CheckCircle2, variant: 'success' as const },
      'on-hold': { label: 'En Pausa', icon: PauseCircle, variant: 'warning' as const },
      cancelled: { label: 'Cancelado', icon: XCircle, variant: 'destructive' as const },
    }
    return configs[status as keyof typeof configs] || configs.active
  }

  const statusConfig = getStatusConfig(project.status)
  const StatusIcon = statusConfig.icon

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: Activity },
    { id: 'deliverables', label: 'Entregables', icon: FileText },
    { id: 'comments', label: 'Comentarios', icon: MessageSquare },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1>{project.name}</h1>
            <Badge variant={statusConfig.variant} className="gap-1">
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Cliente: {project.client.company_name || project.client.full_name}
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline">Editar Proyecto</Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progreso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{project.progress}%</div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fechas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{formatDate(project.start_date)} - {formatDate(project.end_date)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entregables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.deliverables.length}</div>
            <p className="text-xs text-muted-foreground">
              {project.deliverables.filter(d => d.status === 'approved').length} aprobados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex -space-x-2">
              {project.team.slice(0, 4).map((member) => (
                <Avatar key={member.id} className="w-8 h-8 border-2 border-card">
                  <AvatarImage src={member.avatar_url || ''} />
                  <AvatarFallback className="text-xs">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.team.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs">
                  +{project.team.length - 4}
                </div>
              )}
              {project.team.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin asignar</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="gap-2"
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {project.description || 'Sin descripción disponible'}
              </p>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {project.timeline.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay actividad registrada
                </p>
              ) : (
                <div className="space-y-4">
                  {project.timeline.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{event.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.actor?.full_name && `${event.actor.full_name} • `}
                          {formatRelativeTime(event.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={project.client.avatar_url || ''} />
                  <AvatarFallback>{getInitials(project.client.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{project.client.full_name}</p>
                  {project.client.company_name && (
                    <p className="text-sm text-muted-foreground">{project.client.company_name}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{project.client.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team */}
          <Card>
            <CardHeader>
              <CardTitle>Equipo Asignado</CardTitle>
            </CardHeader>
            <CardContent>
              {project.team.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay miembros asignados
                </p>
              ) : (
                <div className="space-y-3">
                  {project.team.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'deliverables' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Entregables</CardTitle>
              {isAdmin && (
                <Button size="sm">Agregar Entregable</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {project.deliverables.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay entregables aún
              </p>
            ) : (
              <div className="space-y-3">
                {project.deliverables.map((deliverable) => (
                  <div
                    key={deliverable.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card/50"
                  >
                    <div>
                      <p className="font-medium">{deliverable.name}</p>
                      {deliverable.due_date && (
                        <p className="text-sm text-muted-foreground">
                          Fecha límite: {formatDate(deliverable.due_date)}
                        </p>
                      )}
                    </div>
                    <Badge variant={
                      deliverable.status === 'approved' ? 'success' :
                      deliverable.status === 'rejected' ? 'destructive' :
                      deliverable.status === 'in_review' ? 'default' : 'secondary'
                    }>
                      {deliverable.status === 'approved' ? 'Aprobado' :
                       deliverable.status === 'rejected' ? 'Rechazado' :
                       deliverable.status === 'in_review' ? 'En Revisión' : 'Pendiente'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'comments' && (
        <Card>
          <CardHeader>
            <CardTitle>Comentarios</CardTitle>
            <CardDescription>
              Conversación del proyecto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Sistema de comentarios próximamente...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
