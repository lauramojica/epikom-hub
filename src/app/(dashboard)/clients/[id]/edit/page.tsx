'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useClients, Client, ClientInput } from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Globe,
  Bell,
  FileText,
  Loader2,
  Save,
  MessageCircle,
} from 'lucide-react'

export default function EditClientPage() {
  const params = useParams()
  const clientId = params.id as string
  const router = useRouter()
  const { getClient, updateClient } = useClients()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<ClientInput>({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    company: '',
    address: '',
    city: '',
    country: '',
    website: '',
    notification_preferences: {
      email: true,
      sms: false,
      whatsapp: false,
    },
    internal_notes: '',
    status: 'active',
  })

  useEffect(() => {
    const loadClient = async () => {
      setIsLoading(true)
      const client = await getClient(clientId)
      if (client) {
        setFormData({
          name: client.name,
          email: client.email,
          phone: client.phone || '',
          whatsapp: client.whatsapp || '',
          company: client.company || '',
          address: client.address || '',
          city: client.city || '',
          country: client.country || '',
          website: client.website || '',
          notification_preferences: client.notification_preferences || {
            email: true,
            sms: false,
            whatsapp: false,
          },
          internal_notes: client.internal_notes || '',
          status: client.status,
        })
      }
      setIsLoading(false)
    }
    loadClient()
  }, [clientId, getClient])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (field: 'email' | 'sms' | 'whatsapp') => {
    setFormData(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences!,
        [field]: !prev.notification_preferences![field],
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!formData.name.trim()) {
      setError('El nombre es requerido')
      setIsSubmitting(false)
      return
    }
    if (!formData.email.trim()) {
      setError('El email es requerido')
      setIsSubmitting(false)
      return
    }

    const { error: updateError } = await updateClient(clientId, formData)
    
    if (updateError) {
      setError(updateError)
      setIsSubmitting(false)
      return
    }

    router.push(`/clients/${clientId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/clients/${clientId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar Cliente</h1>
          <p className="text-muted-foreground">Actualiza la información del cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Estado del Cliente</h2>
              <p className="text-sm text-muted-foreground">Cambia el estado del cliente</p>
            </div>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="px-4 py-2 rounded-lg bg-muted border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="archived">Archivado</option>
            </select>
          </div>
        </Card>

        {/* Basic Info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Información Básica</h2>
              <p className="text-sm text-muted-foreground">Datos principales del cliente</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="cliente@email.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  value={formData.whatsapp || ''}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="company">Empresa / Organización</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="company"
                  name="company"
                  value={formData.company || ''}
                  onChange={handleChange}
                  placeholder="Mi Empresa S.A."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-secondary-light flex items-center justify-center">
              <MapPin className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Información de Contacto</h2>
              <p className="text-sm text-muted-foreground">Dirección y ubicación</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                placeholder="Calle 123, Colonia Centro"
              />
            </div>

            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                name="city"
                value={formData.city || ''}
                onChange={handleChange}
                placeholder="Ciudad de México"
              />
            </div>

            <div>
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                name="country"
                value={formData.country || ''}
                onChange={handleChange}
                placeholder="México"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="website">Sitio Web</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website || ''}
                  onChange={handleChange}
                  placeholder="https://www.ejemplo.com"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Preferencias de Notificación</h2>
              <p className="text-sm text-muted-foreground">Cómo prefiere recibir comunicaciones</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-3 p-4 rounded-xl bg-muted cursor-pointer hover:bg-border transition-colors">
              <input
                type="checkbox"
                checked={formData.notification_preferences?.email}
                onChange={() => handleCheckboxChange('email')}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Email</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-muted cursor-pointer hover:bg-border transition-colors">
              <input
                type="checkbox"
                checked={formData.notification_preferences?.sms}
                onChange={() => handleCheckboxChange('sms')}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">SMS</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-muted cursor-pointer hover:bg-border transition-colors">
              <input
                type="checkbox"
                checked={formData.notification_preferences?.whatsapp}
                onChange={() => handleCheckboxChange('whatsapp')}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">WhatsApp</span>
              </div>
            </label>
          </div>
        </Card>

        {/* Internal Notes */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-error-light flex items-center justify-center">
              <FileText className="w-5 h-5 text-error" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Notas Internas</h2>
              <p className="text-sm text-muted-foreground">Solo visible para administradores</p>
            </div>
          </div>

          <textarea
            name="internal_notes"
            value={formData.internal_notes || ''}
            onChange={handleChange}
            rows={4}
            placeholder="Agrega notas internas sobre este cliente..."
            className="w-full p-4 rounded-xl bg-muted border-0 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Card>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl bg-error-light text-error text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/clients/${clientId}`}>
            <Button variant="ghost">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
