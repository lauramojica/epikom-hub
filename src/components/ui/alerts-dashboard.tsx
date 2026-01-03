'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDate, getInitials } from '@/lib/utils'
import {
  AlertTriangle,
  Clock,
  FileText,
  Send,
  Loader2,
  ChevronRight,
  Bell,
  Calendar,
} from 'lucide-react'

interface OverdueDeliverable {
  id: string
  name: string
  status: string
  due_date: string
  project_id: string
  project_name: string
  client_name: string | null
  client_email: string | null
  days_overdue: number
}

interface UpcomingDeadline {
  id: string
  name: string
  end_date: string
  client_name: string | null
  progress: number
  days_until: number
}

const supabase = createClient()

export function AlertsDashboard() {
  const [overdueDeliverables, setOverdueDeliverables] = useState<OverdueDeliverable[]>([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    setIsLoading(true)
    try {
      // Fetch overdue deliverables
      const { data: overdue } = await supabase
        .from('overdue_deliverables')
        .select('*')
        .order('days_overdue', { ascending: false })
        .limit(10)

      setOverdueDeliverables(overdue || [])

      // Fetch upcoming project deadlines (next 7 days)
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          end_date,
          progress,
          client:client_id(name)
        `)
        .eq('status', 'active')
        .not('end_date', 'is', null)
        .lte('end_date', nextWeek.toISOString())
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true })
        .limit(5)

      const deadlines = (projects || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        end_date: p.end_date,
        client_name: p.client?.name || null,
        progress: p.progress,
        days_until: Math.ceil((new Date(p.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      }))

      setUpcomingDeadlines(deadlines)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendReminder = async (deliverable: OverdueDeliverable) => {
    setSendingReminder(deliverable.id)
    
    try {
      // Create notification for client
      if (deliverable.client_email) {
        // In a real app, this would send an email
        // For now, we create an in-app notification
        
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', deliverable.client_email)
          .single()

        if (clientProfile) {
          await supabase.from('notifications').insert({
            user_id: clientProfile.id,
            type: 'deadline',
            title: '⚠️ Recordatorio: Entregable pendiente',
            message: `El entregable "${deliverable.name}" del proyecto "${deliverable.project_name}" tiene ${deliverable.days_overdue} días de retraso.`,
            link: `/projects/${deliverable.project_id}`,
            project_id: deliverable.project_id,
          })
        }
      }

      alert('Recordatorio enviado correctamente')
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert('Error al enviar recordatorio')
    } finally {
      setSendingReminder(null)
    }
  }

  const getOverdueColor = (days: number) => {
    if (days >= 7) return 'error'
    if (days >= 3) return 'warning'
    return 'muted'
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  const hasAlerts = overdueDeliverables.length > 0 || upcomingDeadlines.length > 0

  if (!hasAlerts) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6 text-success" />
          </div>
          <p className="text-foreground font-medium">¡Todo al día!</p>
          <p className="text-sm text-muted-foreground mt-1">No hay alertas pendientes</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overdue Deliverables */}
      {overdueDeliverables.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-error-light flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-error" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Entregables Atrasados</h3>
              <p className="text-sm text-muted-foreground">
                {overdueDeliverables.length} entregable{overdueDeliverables.length > 1 ? 's' : ''} pendiente{overdueDeliverables.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {overdueDeliverables.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-muted hover:bg-border transition-all"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-background-card flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.project_name}
                      {item.client_name && ` • ${item.client_name}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={getOverdueColor(item.days_overdue) as any}>
                    {item.days_overdue} día{item.days_overdue > 1 ? 's' : ''} de retraso
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sendReminder(item)}
                    disabled={sendingReminder === item.id}
                    className="gap-1.5"
                  >
                    {sendingReminder === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Recordar
                  </Button>
                  <Link href={`/projects/${item.project_id}`}>
                    <Button variant="ghost" size="icon-sm">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-warning-light flex items-center justify-center">
              <Calendar className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Próximos Vencimientos</h3>
              <p className="text-sm text-muted-foreground">Proyectos que vencen esta semana</p>
            </div>
          </div>

          <div className="space-y-3">
            {upcomingDeadlines.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-muted hover:bg-border transition-all group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar size="md">
                    <AvatarFallback variant="secondary">
                      {project.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {project.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {project.client_name || 'Sin cliente'} • Vence {formatDate(project.end_date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{project.progress}%</p>
                    <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant={project.days_until <= 2 ? 'error' : 'warning'}>
                    {project.days_until === 0 ? 'Hoy' : 
                     project.days_until === 1 ? 'Mañana' : 
                     `${project.days_until} días`}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
