'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { formatDate, getInitials } from '@/lib/utils'
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Filter,
  FolderOpen,
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

export default function DashboardClient({ projects, isAdmin }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    onHold: projects.filter(p => p.status === 'on-hold').length,
    cancelled: projects.filter(p => p.status === 'cancelled').length,
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      active: { label: 'En Progreso', icon: Clock, variant: 'default' as const, color: 'text-primary' },
      completed: { label: 'Completado', icon: CheckCircle2, variant: 'success' as const, color: 'text-green-600' },
      'on-hold': { label: 'En Pausa', icon: PauseCircle, variant: 'warning' as const, color: 'text-yellow-600' },
      cancelled: { label: 'Cancelado', icon: XCircle, variant: 'destructive' as const, color: 'text-red-600' },
    }
    return configs[status as keyof typeof configs] || configs.active
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1>Dashboard de Proyectos</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Gestiona y monitorea todos los proyectos de Epikom' : 'Tus proyectos activos'}
          </p>
        </div>
        {isAdmin && (
          <Link href="/projects/new">
            <Button className="gap-2 shadow-lg">
              <Plus className="w-4 h-4" />
              Nuevo Proyecto
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('active')}>
          <CardHeader className="pb-2">
            <CardDescription>Activos</CardDescription>
            <CardTitle className="text-3xl">{stats.active}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${(stats.active / Math.max(projects.length, 1)) * 100}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('completed')}>
          <CardHeader className="pb-2">
            <CardDescription>Completados</CardDescription>
            <CardTitle className="text-3xl">{stats.completed}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full" style={{ width: `${(stats.completed / Math.max(projects.length, 1)) * 100}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('on-hold')}>
          <CardHeader className="pb-2">
            <CardDescription>En Pausa</CardDescription>
            <CardTitle className="text-3xl">{stats.onHold}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(stats.onHold / Math.max(projects.length, 1)) * 100}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('all')}>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl">{projects.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: '100%' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proyectos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'completed', 'on-hold'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'Todos' : getStatusConfig(status).label}
            </Button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay proyectos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No se encontraron proyectos con esos criterios'
                : 'Crea tu primer proyecto para comenzar'}
            </p>
            {isAdmin && !searchQuery && statusFilter === 'all' && (
              <Link href="/projects/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Proyecto
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const statusConfig = getStatusConfig(project.status)
            const StatusIcon = statusConfig.icon

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {project.client.company_name || project.client.full_name}
                        </CardDescription>
                      </div>
                      <Badge variant={statusConfig.variant} className="shrink-0 gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="text-sm text-muted-foreground">
                      {formatDate(project.start_date)} - {formatDate(project.end_date)}
                    </div>

                    {/* Team */}
                    {project.team.length > 0 && (
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
                          <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs text-muted-foreground">
                            +{project.team.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
