'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Bell, Save, Loader2, Check } from 'lucide-react'

interface ReminderSettingsProps {
  projectId: string
  initialSettings?: {
    on_start?: boolean
    on_deliverable_due?: boolean
    reminder_hours_before?: number
    overdue_reminders?: {
      first: number
      second: number
      third: number
    }
  }
  isAdmin: boolean
}

const DEFAULT_SETTINGS = {
  on_start: true,
  on_deliverable_due: true,
  reminder_hours_before: 24,
  overdue_reminders: {
    first: 1,
    second: 3,
    third: 7,
  },
}

export function ReminderSettings({ projectId, initialSettings, isAdmin }: ReminderSettingsProps) {
  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
    overdue_reminders: {
      ...DEFAULT_SETTINGS.overdue_reminders,
      ...initialSettings?.overdue_reminders,
    },
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  const handleSave = async () => {
    setIsSaving(true)
    setSaved(false)

    try {
      const { error } = await supabase
        .from('projects')
        .update({ notification_settings: settings })
        .eq('id', projectId)

      if (error) throw error
      
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error al guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Configuración de Recordatorios</h3>
            <p className="text-sm text-muted-foreground">Vista de solo lectura</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-muted text-center">
            <p className="text-2xl font-bold text-foreground">{settings.overdue_reminders.first}</p>
            <p className="text-xs text-muted-foreground">días - 1er recordatorio</p>
          </div>
          <div className="p-3 rounded-xl bg-muted text-center">
            <p className="text-2xl font-bold text-foreground">{settings.overdue_reminders.second}</p>
            <p className="text-xs text-muted-foreground">días - 2do recordatorio</p>
          </div>
          <div className="p-3 rounded-xl bg-muted text-center">
            <p className="text-2xl font-bold text-foreground">{settings.overdue_reminders.third}</p>
            <p className="text-xs text-muted-foreground">días - 3er recordatorio</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Recordatorios de Entregables</h3>
            <p className="text-sm text-muted-foreground">Configura cuándo enviar recordatorios</p>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="gap-2"
          size="sm"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Guardado' : 'Guardar'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
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
            value={settings.overdue_reminders.first}
            onChange={(e) => setSettings({
              ...settings,
              overdue_reminders: {
                ...settings.overdue_reminders,
                first: parseInt(e.target.value)
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
            value={settings.overdue_reminders.second}
            onChange={(e) => setSettings({
              ...settings,
              overdue_reminders: {
                ...settings.overdue_reminders,
                second: parseInt(e.target.value)
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
            value={settings.overdue_reminders.third}
            onChange={(e) => setSettings({
              ...settings,
              overdue_reminders: {
                ...settings.overdue_reminders,
                third: parseInt(e.target.value)
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

      <p className="text-xs text-muted-foreground mt-4">
        💡 Los recordatorios se envían automáticamente por email y notificación en la app cuando un entregable supera su fecha límite.
      </p>
    </Card>
  )
}
