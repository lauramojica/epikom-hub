'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { JourneyStep, JourneyFlow } from '@/components/ui/journey-step'
import { formatDate, formatRelativeTime, getInitials } from '@/lib/utils'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Calendar,
  FileText,
  MessageSquare,
  Activity,
  Edit,
  Building,
  Mail,
  Users,
  Sparkles,
  Zap,
  Target,
  MoreHorizontal,
  Plus,
  Upload,
  Download,
  ExternalLink,
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
    checklist_client: unknown[]
    checklist_epikom: unknown[]
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

// Phase icons
const phaseIcons = [FileText, Sparkles, Zap, Target, CheckCircle2]

// Generate phases based on progress
const generatePhases = (progress: number) => {
  const phases = [
    { name: 'Briefing', icon: FileText },
    { name: 'Diseño', icon: Sparkles },
    { name: 'Desarrollo', icon: Zap },
    { name: 'Testing', icon: Target },
    { name: 'Entrega', icon: CheckCircle2 },
  ]
  
  return phases.map((phase, index) => {
    const phaseProgress = (index + 1) * 20
    let status: 'completed' | 'active' | 'pending' = 'pending'
    
    if (progress >= phaseProgress) {
      status = 'completed'
    } else if (progress >= phaseProgress - 20 && progress < phaseProgress) {
      status = 'active'
    }
    
    return { ...phase, status }
  })
}

export default function ProjectDetailClient({ project, isAdmin }: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const phases = generatePhases(project.progress)

  const getStatusConfig = (status: string) => {
    const configs = {
      active: { label: 'En Progreso', variant: 'soft-primary' as const, Icon: Clock },
      completed: { label: 'Completado', variant: 'success' as const, Icon: CheckCircle2 },
      'on-hold': { label: 'En Pausa', variant: 'warning' as const, Icon: PauseCircle },
      cancelled: { label: 'Cancelado', variant: 'error' as const, Icon: XCircle },
    }
    return configs[status as keyof typeof configs] || configs.active
  }

  const getDeliverableStatusConfig = (status: string) => {
    const configs = {
      approved: { label: 'Aprobado', variant: 'success' as const },
      rejected: { label: 'Rechazado', variant: 'error' as const },
      in_review: { label: 'En Revisión', variant: 'soft-secondary' as const },
      pending: { label: 'Pendiente', variant: 'muted' as const },
    }
    return configs[status as keyof typeof configs] || configs.pending
  }

  const statusConfig = getStatusConfig(project.status)

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: Activity },
    { id: 'deliverables', label: 'Entregables', icon: FileText, count: project.deliverables.length },
    { id: 'files', label: 'Archivos', icon: Upload },
    { id: 'comments', label: 'Comentarios', icon: MessageSquare },
  ]

  const getAvatarColor = (index: number) => {
    const colors = ['primary', 'secondary', 'amber', 'blue'] as const
    return colors[index % colors.length]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <Badge variant={statusConfig.variant} size="default" className="gap-1.5">
              <statusConfig.Icon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {project.client.company_name || project.client.full_name}
          </p>
        </div>

        {isAdmin && (
          <Button variant="outline" className="gap-2 shrink-0">
            <Edit className="w-4 h-4" />
            Editar
          </Button>
        )}
      </div>

      {/* Journey Flow */}
      <Card variant="elevated" className="p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary-lighter to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Progreso del proyecto</p>
              <p className="text-3xl font-bold text-foreground">{project.progress}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Fecha límite</p>
              <p className="text-lg font-semibold text-foreground">{formatDate(project.end_date)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-muted rounded-full mb-8 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-hover rounded-full transition-all duration-700"
              style={{ width: `${project.progress}%` }}
            />
          </div>

          {/* Journey Steps */}
          <JourneyFlow>
            {phases.map((phase, index) => (
              <JourneyStep
                key={index}
                name={phase.name}
                status={phase.status}
                icon={phase.icon}
              />
            ))}
          </JourneyFlow>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-background-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${isActive ? 'bg-primary-light text-primary' : 'bg-border text-muted-foreground'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Description */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Descripción</h3>
            <p className="text-muted-foreground leading-relaxed">
              {project.description || 'Sin descripción disponible'}
            </p>
            
            <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Fecha inicio</p>
                <p className="font-medium text-foreground">{formatDate(project.start_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas estimadas</p>
                <p className="font-medium text-foreground">{project.estimated_hours}h</p>
              </div>
            </div>
          </Card>

          {/* Client Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Cliente</h3>
            <div className="flex items-center gap-4">
              <Avatar size="xl">
                <AvatarImage src={project.client.avatar_url || ''} />
                <AvatarFallback variant="primary">{getInitials(project.client.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-foreground">{project.client.full_name}</p>
                {project.client.company_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Building className="w-4 h-4" />
                    {project.client.company_name}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Mail className="w-4 h-4" />
                  {project.client.email}
                </div>
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Actividad Reciente</h3>
            {project.timeline.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay actividad registrada</p>
            ) : (
              <div className="space-y-4">
                {project.timeline.slice(0, 5).map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      {index < Math.min(project.timeline.length, 5) - 1 && (
                        <div className="w-px h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-foreground">{event.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.actor?.full_name && `${event.actor.full_name} • `}
                        {formatRelativeTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Team */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Equipo</h3>
              {isAdmin && (
                <Button variant="ghost" size="icon-sm">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {project.team.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay miembros asignados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {project.team.map((member, i) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-border transition-all">
                    <Avatar size="md">
                      <AvatarImage src={member.avatar_url || ''} />
                      <AvatarFallback variant={getAvatarColor(i)}>{getInitials(member.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'deliverables' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Entregables</h3>
            {isAdmin && (
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Agregar
              </Button>
            )}
          </div>
          
          {project.deliverables.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay entregables aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.deliverables.map((deliverable) => {
                const config = getDeliverableStatusConfig(deliverable.status)
                return (
                  <div
                    key={deliverable.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-muted hover:bg-border transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-background-card flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{deliverable.name}</p>
                        {deliverable.due_date && (
                          <p className="text-sm text-muted-foreground">
                            Fecha límite: {formatDate(deliverable.due_date)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <button className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-background-card flex items-center justify-center text-muted-foreground transition-all">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'files' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Archivos</h3>
            <Button size="sm" className="gap-2">
              <Upload className="w-4 h-4" />
              Subir archivo
            </Button>
          </div>
          
          <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Arrastra archivos aquí o haz clic para subir</p>
            <p className="text-sm text-muted-foreground mt-1">Próximamente...</p>
          </div>
        </Card>
      )}

      {activeTab === 'comments' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Comentarios</h3>
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Sistema de comentarios próximamente...</p>
          </div>
        </Card>
      )}
    </div>
  )
}
