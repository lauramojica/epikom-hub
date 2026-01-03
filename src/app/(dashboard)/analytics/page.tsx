'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  FolderKanban,
  Users,
  Clock,
  CheckCircle2,
  FileText,
  DollarSign,
  Loader2,
} from 'lucide-react'

const supabase = createClient()

// Colors for charts
const COLORS = ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899']

interface Stats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalClients: number
  totalFiles: number
  totalHours: number
}

interface ProjectsByMonth {
  month: string
  proyectos: number
  completados: number
}

interface ProjectsByStatus {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [projectsByMonth, setProjectsByMonth] = useState<ProjectsByMonth[]>([])
  const [projectsByStatus, setProjectsByStatus] = useState<ProjectsByStatus[]>([])
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)

      try {
        // Fetch projects
        const { data: projects } = await supabase
          .from('projects')
          .select('*, client:client_id(full_name, company_name)')

        // Fetch clients count
        const { count: clientCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'client')

        // Fetch files count
        const { count: filesCount } = await supabase
          .from('files')
          .select('*', { count: 'exact', head: true })

        if (projects) {
          // Calculate stats
          const totalHours = projects.reduce((sum, p) => sum + (p.estimated_hours || 0), 0)
          
          setStats({
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'active').length,
            completedProjects: projects.filter(p => p.status === 'completed').length,
            totalClients: clientCount || 0,
            totalFiles: filesCount || 0,
            totalHours,
          })

          // Projects by status for pie chart
          const statusCounts = {
            active: projects.filter(p => p.status === 'active').length,
            completed: projects.filter(p => p.status === 'completed').length,
            'on-hold': projects.filter(p => p.status === 'on-hold').length,
            cancelled: projects.filter(p => p.status === 'cancelled').length,
          }

          setProjectsByStatus([
            { name: 'Activos', value: statusCounts.active, color: '#10B981' },
            { name: 'Completados', value: statusCounts.completed, color: '#8B5CF6' },
            { name: 'En pausa', value: statusCounts['on-hold'], color: '#F59E0B' },
            { name: 'Cancelados', value: statusCounts.cancelled, color: '#EF4444' },
          ].filter(s => s.value > 0))

          // Projects by month (last 6 months)
          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
          const last6Months: ProjectsByMonth[] = []
          const now = new Date()

          for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const month = monthNames[date.getMonth()]
            const year = date.getFullYear()
            const monthYear = `${month} ${year}`

            const monthProjects = projects.filter(p => {
              const pDate = new Date(p.created_at)
              return pDate.getMonth() === date.getMonth() && pDate.getFullYear() === year
            })

            const completedInMonth = projects.filter(p => {
              if (p.status !== 'completed') return false
              const pDate = new Date(p.updated_at)
              return pDate.getMonth() === date.getMonth() && pDate.getFullYear() === year
            })

            last6Months.push({
              month,
              proyectos: monthProjects.length,
              completados: completedInMonth.length,
            })
          }

          setProjectsByMonth(last6Months)

          // Recent projects
          setRecentProjects(
            projects
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5)
          )
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando analytics...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Proyectos',
      value: stats?.totalProjects || 0,
      icon: FolderKanban,
      color: 'primary',
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Proyectos Activos',
      value: stats?.activeProjects || 0,
      icon: Clock,
      color: 'secondary',
      trend: '+5%',
      trendUp: true,
    },
    {
      label: 'Completados',
      value: stats?.completedProjects || 0,
      icon: CheckCircle2,
      color: 'success',
      trend: '+8%',
      trendUp: true,
    },
    {
      label: 'Clientes',
      value: stats?.totalClients || 0,
      icon: Users,
      color: 'amber',
      trend: '+3%',
      trendUp: true,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Métricas y estadísticas de tus proyectos</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trendUp ? (
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-error" />
                    )}
                    <span className={`text-xs font-medium ${stat.trendUp ? 'text-success' : 'text-error'}`}>
                      {stat.trend}
                    </span>
                    <span className="text-xs text-muted-foreground">vs mes anterior</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  stat.color === 'primary' ? 'bg-primary-light text-primary' :
                  stat.color === 'secondary' ? 'bg-secondary-light text-secondary' :
                  stat.color === 'success' ? 'bg-success-light text-success' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects by Month - Bar Chart */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Proyectos por Mes</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectsByMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="proyectos" fill="#10B981" radius={[6, 6, 0, 0]} name="Nuevos" />
                <Bar dataKey="completados" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Completados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Projects by Status - Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Estado de Proyectos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {projectsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {projectsByStatus.map((status, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="text-sm text-muted-foreground">{status.name}</span>
                <span className="text-sm font-medium text-foreground">{status.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Proyectos Recientes</h3>
          <div className="space-y-3">
            {recentProjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay proyectos</p>
            ) : (
              recentProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-border transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarFallback variant={index % 2 === 0 ? 'primary' : 'secondary'}>
                        {project.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.client?.company_name || project.client?.full_name || 'Sin cliente'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      project.status === 'active' ? 'soft-primary' :
                      project.status === 'completed' ? 'success' :
                      project.status === 'on-hold' ? 'warning' : 'muted'
                    }
                    size="sm"
                  >
                    {project.progress}%
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card variant="gradient-primary" className="p-6 text-white">
          <h3 className="text-lg font-semibold mb-6">Resumen General</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 opacity-80" />
                <span className="text-sm opacity-80">Archivos</span>
              </div>
              <p className="text-3xl font-bold">{stats?.totalFiles || 0}</p>
            </div>
            
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 opacity-80" />
                <span className="text-sm opacity-80">Horas Est.</span>
              </div>
              <p className="text-3xl font-bold">{stats?.totalHours || 0}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="flex items-center justify-between">
              <span className="opacity-80">Tasa de completado</span>
              <span className="text-2xl font-bold">
                {stats?.totalProjects ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ 
                  width: `${stats?.totalProjects ? (stats.completedProjects / stats.totalProjects) * 100 : 0}%` 
                }}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
