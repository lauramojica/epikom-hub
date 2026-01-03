'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { JourneyStep, JourneyFlow } from '@/components/ui/journey-step'
import { AlertsDashboard } from '@/components/ui/alerts-dashboard'
import { formatDate, formatRelativeTime, getInitials } from '@/lib/utils'
import {
  FileText,
  Sparkles,
  Zap,
  Target,
  CheckCircle2,
  Check,
  Play,
  CircleDot,
  MoreHorizontal,
  Filter,
  Plus,
  TrendingUp,
  Calendar,
  SlidersHorizontal,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string | null
  status: 'active' | 'on-hold' | 'completed' | 'cancelled'
  progress: number
  start_date: string
  end_date: string
  client: {
    id: string
    full_name: string
    email: string
    company_name: string | null
  }
  team: {
    id: string
    full_name: string
    avatar_url: string | null
  }[]
}

interface DashboardClientProps {
  projects: Project[]
  isAdmin: boolean
}

// Phase icons mapping
const phaseIcons = [FileText, Sparkles, Zap, Target, CheckCircle2]

// Generate phases based on project progress
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

export default function DashboardClient({ projects, isAdmin }: DashboardClientProps) {
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0)
  
  // Ensure we have at least one project or show empty state
  const hasProjects = projects.length > 0
  const currentProject = hasProjects ? projects[selectedProjectIndex] : null
  const phases = currentProject ? generatePhases(currentProject.progress) : []
  
  // Mock tasks for the current phase
  const tasks = [
    { id: '1', name: 'Implementar header responsive', status: 'done', assignee: 'JD', dueDate: 'Hoy' },
    { id: '2', name: 'Crear componentes de cards', status: 'done', assignee: 'MR', dueDate: 'Ayer' },
    { id: '3', name: 'Integrar API de productos', status: 'progress', assignee: 'AL', dueDate: 'Mañana' },
    { id: '4', name: 'Optimizar imágenes', status: 'pending', assignee: 'KL', dueDate: '15 Feb' },
    { id: '5', name: 'Testing de formularios', status: 'pending', assignee: 'JD', dueDate: '18 Feb' },
  ]

  // Recent activity
  const recentActivity = [
    { user: 'JD', action: 'completó', item: 'Header responsive', time: 'hace 2h' },
    { user: 'MR', action: 'subió', item: '3 archivos de diseño', time: 'hace 4h' },
    { user: 'AL', action: 'comentó en', item: 'API Integration', time: 'hace 5h' },
  ]

  const getTaskStatusConfig = (status: string) => {
    switch(status) {
      case 'done': return { bg: 'bg-primary-light', text: 'text-primary', Icon: Check }
      case 'progress': return { bg: 'bg-secondary-light', text: 'text-secondary', Icon: Play }
      default: return { bg: 'bg-muted', text: 'text-muted-foreground', Icon: CircleDot }
    }
  }

  const getAvatarColor = (index: number) => {
    const colors = ['primary', 'secondary', 'amber', 'blue'] as const
    return colors[index % colors.length]
  }

  if (!hasProjects) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Journey</h1>
          <p className="text-muted-foreground mt-1">Visualiza el progreso de tus proyectos</p>
        </div>
        
        <Card className="p-16">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No hay proyectos</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Crea tu primer proyecto para comenzar a visualizar el progreso
            </p>
            {isAdmin && (
              <Link href="/projects/new">
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Crear Proyecto
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <h1 className="text-2xl font-bold text-foreground">Project Journey</h1>
        
        {/* Project Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {projects.slice(0, 5).map((project, index) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectIndex(index)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                selectedProjectIndex === index
                  ? 'bg-background-card shadow-md ring-2 ring-primary/20'
                  : 'bg-muted hover:bg-background-card hover:shadow-sm'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-accent'
              }`}>
                {getInitials(project.client.company_name || project.client.full_name)}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline">
                {project.client.company_name || project.client.full_name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Journey Flow Card */}
      <Card variant="elevated" className="p-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-lighter to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-secondary-lighter to-transparent rounded-full translate-y-1/2 -translate-x-1/2 opacity-50 pointer-events-none" />

        <div className="relative">
          {/* Project Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <Link href={`/projects/${currentProject?.id}`} className="group">
                <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {currentProject?.name}
                </h2>
              </Link>
              <p className="text-muted-foreground text-sm mt-0.5">
                {currentProject?.client.company_name || currentProject?.client.full_name} • {currentProject?.progress}% completado
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon-sm">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-muted rounded-full mb-10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-hover rounded-full transition-all duration-700"
              style={{ width: `${currentProject?.progress || 0}%` }}
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Tasks Column - 3/5 */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Tareas Actuales</h3>
                <p className="text-sm text-muted-foreground">Fase: Desarrollo</p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Filtrar
              </Button>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => {
                const statusConfig = getTaskStatusConfig(task.status)
                const StatusIcon = statusConfig.Icon
                
                return (
                  <div
                    key={task.id}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-all cursor-pointer"
                  >
                    <button className={`w-8 h-8 rounded-xl ${statusConfig.bg} flex items-center justify-center ${statusConfig.text} transition-all`}>
                      <StatusIcon className="w-4 h-4" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {task.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Avatar size="xs">
                        <AvatarFallback variant="secondary">{task.assignee}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                      <button className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-border flex items-center justify-center text-muted-foreground transition-all">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <button className="w-full mt-4 h-10 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Agregar tarea
            </button>
          </Card>
        </div>

        {/* Right Column - 2/5 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Widget */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Actividad</h3>
              <button className="text-xs text-primary font-medium hover:underline">Ver todo</button>
            </div>
            
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Avatar size="sm">
                    <AvatarFallback variant={getAvatarColor(i)}>{activity.user}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="font-medium text-foreground">{activity.item}</span>
                    </p>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Stats Widget */}
          <Card variant="gradient-primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resumen</h3>
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-3xl font-bold">12</p>
                <p className="text-sm opacity-80">Tareas completas</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-3xl font-bold">5</p>
                <p className="text-sm opacity-80">Pendientes</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-80">Próxima entrega</span>
                <span className="font-semibold">{currentProject ? formatDate(currentProject.end_date) : '-'}</span>
              </div>
            </div>
          </Card>

          {/* Team Widget */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Equipo</h3>
              <Button variant="ghost" size="icon-sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {currentProject?.team && currentProject.team.length > 0 ? (
                currentProject.team.map((member, i) => (
                  <div key={member.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-border transition-all cursor-pointer">
                    <Avatar size="xs">
                      <AvatarImage src={member.avatar_url || ''} />
                      <AvatarFallback variant={getAvatarColor(i)}>{getInitials(member.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{member.full_name.split(' ')[0]}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin miembros asignados</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Alerts Dashboard - Only for Admins */}
      {isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Alertas y Recordatorios
            </h3>
          </div>
          <AlertsDashboard />
        </div>
      )}

      {/* Other Projects */}
      {projects.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Otros Proyectos</h3>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.slice(0, 6).filter((_, i) => i !== selectedProjectIndex).slice(0, 3).map((project, index) => (
              <Card
                key={project.id}
                variant="interactive"
                className="p-5"
                onClick={() => setSelectedProjectIndex(projects.indexOf(project))}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{project.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">{project.client.company_name || project.client.full_name}</p>
                  </div>
                  <Badge variant={project.status === 'active' ? 'soft-primary' : project.status === 'completed' ? 'success' : 'warning'} size="sm">
                    {project.status === 'active' ? 'Activo' : project.status === 'completed' ? 'Completado' : 'Pausado'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium text-foreground">{project.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(project.end_date)}
                  </div>
                  <div className="flex -space-x-1.5">
                    {project.team.slice(0, 3).map((member, i) => (
                      <Avatar key={member.id} size="xs" className="ring-2 ring-background-card">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback variant={getAvatarColor(i)}>{getInitials(member.full_name)}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
