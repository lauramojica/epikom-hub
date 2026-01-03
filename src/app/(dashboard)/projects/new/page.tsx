'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Loader2, FolderPlus, Calendar, Clock, Globe, User } from 'lucide-react'

interface Client {
  id: string
  full_name: string
  email: string
  company_name: string | null
}

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    estimated_hours: '',
    language: 'es',
  })

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, company_name')
        .eq('role', 'client')
        .order('full_name')
      
      setClients(data || [])
    }
    fetchClients()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('projects')
      .insert({
        name: formData.name,
        description: formData.description || null,
        client_id: formData.client_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        estimated_hours: parseFloat(formData.estimated_hours) || 0,
        language: formData.language as 'es' | 'en',
        created_by: user?.id,
      })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Proyecto</h1>
          <p className="text-muted-foreground">Crea un nuevo proyecto para un cliente</p>
        </div>
      </div>

      {/* Form Card */}
      <Card variant="elevated">
        <CardContent className="p-8">
          {/* Icon Header */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.25)]">
              <FolderPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Información del Proyecto</h2>
              <p className="text-sm text-muted-foreground">Completa los datos básicos</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-error-light border border-error/20 text-error text-sm">
                {error}
              </div>
            )}

            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Proyecto *</Label>
              <Input
                id="name"
                variant="filled"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Rediseño de Identidad Corporativa"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe brevemente el proyecto..."
                className="w-full min-h-[120px] px-4 py-3 rounded-xl border-0 bg-muted text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background-card placeholder:text-muted-foreground"
              />
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="client" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Cliente *
              </Label>
              <select
                id="client"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border-0 bg-muted text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background-card"
                required
              >
                <option value="">Selecciona un cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name} {client.company_name ? `(${client.company_name})` : ''}
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay clientes registrados. Primero debes crear usuarios con rol cliente.
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Fecha de Inicio *
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  variant="filled"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Fecha de Entrega *
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  variant="filled"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Hours & Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_hours" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Horas Estimadas
                </Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  variant="filled"
                  min="0"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  Idioma
                </Label>
                <select
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border-0 bg-muted text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background-card"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-border">
              <Link href="/" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" className="flex-1 gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4" />
                    Crear Proyecto
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
