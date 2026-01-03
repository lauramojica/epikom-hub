'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Plus,
  Mail,
  Phone,
  MoreHorizontal,
  Search,
  Filter,
  Grid3X3,
  List,
  Briefcase,
} from 'lucide-react'
import { useState } from 'react'

// Mock team data
const teamMembers = [
  {
    id: '1',
    name: 'Juan Delgado',
    initials: 'JD',
    role: 'Lead Developer',
    email: 'juan@epikom.com',
    phone: '+1 234 567 890',
    projects: 5,
    status: 'active',
    skills: ['React', 'Node.js', 'TypeScript'],
    color: 'primary' as const,
  },
  {
    id: '2',
    name: 'María Rodríguez',
    initials: 'MR',
    role: 'UI/UX Designer',
    email: 'maria@epikom.com',
    phone: '+1 234 567 891',
    projects: 4,
    status: 'active',
    skills: ['Figma', 'Sketch', 'Prototyping'],
    color: 'secondary' as const,
  },
  {
    id: '3',
    name: 'Ana López',
    initials: 'AL',
    role: 'Frontend Developer',
    email: 'ana@epikom.com',
    phone: '+1 234 567 892',
    projects: 3,
    status: 'active',
    skills: ['Vue.js', 'CSS', 'Animation'],
    color: 'amber' as const,
  },
  {
    id: '4',
    name: 'Carlos Luna',
    initials: 'KL',
    role: 'Backend Developer',
    email: 'carlos@epikom.com',
    phone: '+1 234 567 893',
    projects: 4,
    status: 'busy',
    skills: ['Python', 'PostgreSQL', 'AWS'],
    color: 'blue' as const,
  },
  {
    id: '5',
    name: 'Sofia García',
    initials: 'SG',
    role: 'Project Manager',
    email: 'sofia@epikom.com',
    phone: '+1 234 567 894',
    projects: 6,
    status: 'active',
    skills: ['Agile', 'Scrum', 'Jira'],
    color: 'primary' as const,
  },
  {
    id: '6',
    name: 'Diego Martín',
    initials: 'DM',
    role: 'DevOps Engineer',
    email: 'diego@epikom.com',
    phone: '+1 234 567 895',
    projects: 3,
    status: 'away',
    skills: ['Docker', 'Kubernetes', 'CI/CD'],
    color: 'secondary' as const,
  },
]

export default function TeamPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Disponible', variant: 'success' as const }
      case 'busy': return { label: 'Ocupado', variant: 'warning' as const }
      case 'away': return { label: 'Ausente', variant: 'muted' as const }
      default: return { label: 'Desconocido', variant: 'muted' as const }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-muted-foreground">{teamMembers.length} miembros en el equipo</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Agregar Miembro
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar miembros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtrar
          </Button>
          <div className="flex items-center rounded-lg bg-muted p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                viewMode === 'grid' ? 'bg-background-card shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                viewMode === 'list' ? 'bg-background-card shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMembers.map((member) => {
            const statusConfig = getStatusConfig(member.status)
            return (
              <Card key={member.id} variant="interactive" className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar size="lg">
                        <AvatarFallback variant={member.color}>{member.initials}</AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background-card ${
                        member.status === 'active' ? 'bg-success' :
                        member.status === 'busy' ? 'bg-warning' : 'bg-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-all">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    <span>{member.projects} proyectos activos</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {member.skills.map((skill, i) => (
                    <Badge key={i} variant="muted" size="sm">{skill}</Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  <Button variant="ghost" size="sm">Ver perfil</Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Miembro</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Rol</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Proyectos</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const statusConfig = getStatusConfig(member.status)
                  return (
                    <tr key={member.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            <AvatarFallback variant={member.color}>{member.initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{member.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{member.role}</td>
                      <td className="p-4 text-muted-foreground">{member.email}</td>
                      <td className="p-4 text-foreground">{member.projects}</td>
                      <td className="p-4">
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm">Ver</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
