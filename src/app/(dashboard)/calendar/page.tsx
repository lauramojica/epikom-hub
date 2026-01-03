'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
} from 'lucide-react'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Mock events
const events = [
  { id: 1, title: 'Revisión de diseños', date: 15, time: '10:00', type: 'meeting', color: 'primary' },
  { id: 2, title: 'Entrega homepage', date: 18, time: '14:00', type: 'deadline', color: 'secondary' },
  { id: 3, title: 'Call con cliente', date: 20, time: '11:30', type: 'meeting', color: 'primary' },
  { id: 4, title: 'Sprint review', date: 22, time: '15:00', type: 'meeting', color: 'amber' },
  { id: 5, title: 'Deploy a producción', date: 25, time: '09:00', type: 'deadline', color: 'secondary' },
]

const upcomingEvents = [
  { id: 1, title: 'Revisión de diseños TechCorp', time: '10:00 - 11:00', date: 'Hoy', assignees: ['JD', 'MR'], color: 'primary' },
  { id: 2, title: 'Call semanal equipo', time: '14:00 - 14:30', date: 'Mañana', assignees: ['AL', 'KL', 'JD'], color: 'secondary' },
  { id: 3, title: 'Presentación Fashion Store', time: '11:00 - 12:00', date: '15 Feb', assignees: ['MR'], color: 'amber' },
]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<number | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().getDate()
  const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year

  const prevMonth = () => setCurrentDate(new Date(year, month - 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1))

  const getEventsForDay = (day: number) => events.filter(e => e.date === day)

  const getAvatarColor = (index: number) => {
    const colors = ['primary', 'secondary', 'amber', 'blue'] as const
    return colors[index % colors.length]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
          <p className="text-muted-foreground">Gestiona tus eventos y entregas</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Evento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                {MONTHS[month]} {year}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square p-1" />
              ))}
              
              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const isToday = isCurrentMonth && day === today
                const isSelected = day === selectedDate
                const dayEvents = getEventsForDay(day)
                
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day === selectedDate ? null : day)}
                    className={`aspect-square p-1 rounded-xl transition-all relative ${
                      isSelected
                        ? 'bg-primary text-white'
                        : isToday
                          ? 'bg-primary-light text-primary'
                          : 'hover:bg-muted'
                    }`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? '' : isToday ? '' : 'text-foreground'}`}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && !isSelected && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              event.color === 'primary' ? 'bg-primary' :
                              event.color === 'secondary' ? 'bg-secondary' :
                              'bg-amber-500'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected day events */}
            {selectedDate && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold text-foreground mb-4">
                  Eventos del {selectedDate} de {MONTHS[month]}
                </h3>
                {getEventsForDay(selectedDate).length > 0 ? (
                  <div className="space-y-2">
                    {getEventsForDay(selectedDate).map(event => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-border transition-all cursor-pointer"
                      >
                        <div className={`w-1 h-10 rounded-full ${
                          event.color === 'primary' ? 'bg-primary' :
                          event.color === 'secondary' ? 'bg-secondary' :
                          'bg-amber-500'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{event.title}</p>
                          <p className="text-sm text-muted-foreground">{event.time}</p>
                        </div>
                        <Badge variant={event.type === 'meeting' ? 'soft-primary' : 'soft-secondary'}>
                          {event.type === 'meeting' ? 'Reunión' : 'Entrega'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No hay eventos este día</p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Upcoming Events */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Próximos Eventos</h3>
              <button className="text-xs text-primary font-medium hover:underline">Ver todos</button>
            </div>
            
            <div className="space-y-4">
              {upcomingEvents.map((event, i) => (
                <div key={event.id} className="p-4 rounded-2xl bg-muted hover:bg-border transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      event.color === 'primary' ? 'bg-primary-light text-primary' :
                      event.color === 'secondary' ? 'bg-secondary-light text-secondary' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{event.time}</span>
                        <span>•</span>
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {event.assignees.map((assignee, idx) => (
                          <Avatar key={idx} size="xs">
                            <AvatarFallback variant={getAvatarColor(idx)}>{assignee}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card variant="gradient-secondary" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Esta Semana</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-3xl font-bold">5</p>
                <p className="text-sm opacity-80">Reuniones</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-3xl font-bold">3</p>
                <p className="text-sm opacity-80">Entregas</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
