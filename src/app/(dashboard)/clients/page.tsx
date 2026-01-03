'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useClients, Client, formatPhone } from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import {
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  FolderKanban,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Archive,
  Loader2,
  Users,
  Filter,
} from 'lucide-react'

export default function ClientsPage() {
  const { clients, isLoading, fetchClients, deleteClient, archiveClient } = useClients()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    fetchClients(search, statusFilter)
  }, [fetchClients, search, statusFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients(search, statusFilter)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, statusFilter, fetchClients])

  const handleDelete = async (client: Client) => {
    if (!confirm(`¿Estás seguro de eliminar a "${client.name}"? Esta acción no se puede deshacer.`)) return
    await deleteClient(client.id)
    setActionMenuOpen(null)
  }

  const handleArchive = async (client: Client) => {
    if (!confirm(`¿Archivar a "${client.name}"?`)) return
    await archiveClient(client.id)
    setActionMenuOpen(null)
  }

  const getAvatarColor = (index: number) => {
    const colors = ['primary', 'secondary', 'amber', 'blue'] as const
    return colors[index % colors.length]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" size="sm">Activo</Badge>
      case 'inactive':
        return <Badge variant="warning" size="sm">Inactivo</Badge>
      case 'archived':
        return <Badge variant="muted" size="sm">Archivado</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gestiona tu cartera de clientes</p>
        </div>
        <Link href="/clients/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              variant="filled"
              placeholder="Buscar por nombre, email o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', 'active', 'inactive', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-border'
                }`}
              >
                {status === 'all' ? 'Todos' : 
                 status === 'active' ? 'Activos' :
                 status === 'inactive' ? 'Inactivos' : 'Archivados'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{clients.length}</p>
              <p className="text-xs text-muted-foreground">Total Clientes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-light flex items-center justify-center">
              <Users className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {clients.filter(c => c.status === 'active').length}
              </p>
              <p className="text-xs text-muted-foreground">Activos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-light flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {clients.reduce((sum, c) => sum + (c.active_projects || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Proyectos Activos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Building className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {new Set(clients.filter(c => c.company).map(c => c.company)).size}
              </p>
              <p className="text-xs text-muted-foreground">Empresas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Clients Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay clientes</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'No se encontraron resultados' : 'Agrega tu primer cliente'}
            </p>
            {!search && (
              <Link href="/clients/new">
                <Button className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Nuevo Cliente
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Contacto</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Empresa</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Proyectos</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Última Actividad</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Estado</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr 
                    key={client.id} 
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    {/* Client Name & Avatar */}
                    <td className="p-4">
                      <Link href={`/clients/${client.id}`} className="flex items-center gap-3 group">
                        <Avatar size="md">
                          <AvatarImage src={client.avatar_url || ''} />
                          <AvatarFallback variant={getAvatarColor(index)}>
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {client.name}
                          </p>
                          <p className="text-sm text-muted-foreground md:hidden">{client.email}</p>
                        </div>
                      </Link>
                    </td>

                    {/* Contact */}
                    <td className="p-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          {client.email}
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5" />
                            {formatPhone(client.phone)}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Company */}
                    <td className="p-4 hidden lg:table-cell">
                      {client.company ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          {client.company}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Projects Count */}
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted">
                        <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{client.active_projects || 0}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{client.total_projects || 0}</span>
                      </div>
                    </td>

                    {/* Last Activity */}
                    <td className="p-4 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {client.last_project_activity 
                          ? formatRelativeTime(client.last_project_activity)
                          : 'Sin actividad'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      {getStatusBadge(client.status)}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === client.id ? null : client.id)}
                          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {actionMenuOpen === client.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-background-card rounded-xl shadow-lg border border-border py-2 z-20">
                              <Link
                                href={`/clients/${client.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                                onClick={() => setActionMenuOpen(null)}
                              >
                                <Eye className="w-4 h-4" />
                                Ver detalle
                              </Link>
                              <Link
                                href={`/clients/${client.id}/edit`}
                                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                                onClick={() => setActionMenuOpen(null)}
                              >
                                <Edit className="w-4 h-4" />
                                Editar
                              </Link>
                              <button
                                onClick={() => handleArchive(client)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                              >
                                <Archive className="w-4 h-4" />
                                Archivar
                              </button>
                              <hr className="my-2 border-border" />
                              <button
                                onClick={() => handleDelete(client)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error-light transition-colors text-left"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
