'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HubClient {
  id: string;
  nombre: string;
  slug: string;
  color: string | null;
  activo: boolean;
}

interface ClientUser {
  id: string;
  user_id: string;
  client_id: string;
  nombre: string;
  email: string;
  puesto: string | null;
  puede_aprobar: boolean;
  puede_editar: boolean;
  activo: boolean;
  ultimo_acceso_at: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminClientesPage() {
  const [clients, setClients] = useState<HubClient[]>([]);
  const [clientUsers, setClientUsers] = useState<Map<string, ClientUser[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState<HubClient | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({
    nombre: '',
    email: '',
    puesto: '',
    puede_aprobar: true,
    puede_editar: false,
  });

  const supabase: SupabaseClient = useMemo(() => createClient(), []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch clients
    const { data: clientsData } = await supabase
      .from('hub_clients')
      .select('id, nombre, slug, color, activo')
      .eq('activo', true)
      .order('nombre');

    // Fetch client users
    const { data: usersData } = await supabase
      .from('client_users')
      .select('*')
      .eq('activo', true);

    // Group users by client
    const map = new Map<string, ClientUser[]>();
    (usersData || []).forEach((u: ClientUser) => {
      if (!map.has(u.client_id)) map.set(u.client_id, []);
      map.get(u.client_id)!.push(u);
    });

    setClients(clientsData || []);
    setClientUsers(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Invite client contact
  const inviteContact = async () => {
    if (!selectedClient || !inviteData.email || !inviteData.nombre) return;

    setSaving(true);

    try {
      // First, create auth user or get existing
      // For now, we create the client_user record
      // They'll need to sign up with this email to access

      const { data, error } = await supabase
        .from('client_users')
        .insert({
          user_id: crypto.randomUUID(), // Placeholder until they sign up
          client_id: selectedClient.id,
          nombre: inviteData.nombre,
          email: inviteData.email,
          puesto: inviteData.puesto || null,
          puede_aprobar: inviteData.puede_aprobar,
          puede_editar: inviteData.puede_editar,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const existing = clientUsers.get(selectedClient.id) || [];
      setClientUsers(new Map(clientUsers.set(selectedClient.id, [...existing, data])));

      // Reset form
      setInviteData({
        nombre: '',
        email: '',
        puesto: '',
        puede_aprobar: true,
        puede_editar: false,
      });
      setShowInvite(false);
      
      alert(`Invitación lista. ${inviteData.nombre} deberá registrarse con ${inviteData.email} para acceder.`);

    } catch (err: any) {
      console.error('Error inviting:', err);
      alert('Error al invitar: ' + err.message);
    }

    setSaving(false);
  };

  // Remove client contact
  const removeContact = async (clientId: string, userId: string) => {
    if (!confirm('¿Eliminar acceso de este contacto?')) return;

    setSaving(true);

    await supabase
      .from('client_users')
      .update({ activo: false })
      .eq('client_id', clientId)
      .eq('id', userId);

    const existing = clientUsers.get(clientId) || [];
    setClientUsers(new Map(clientUsers.set(
      clientId, 
      existing.filter(u => u.id !== userId)
    )));

    setSaving(false);
  };

  // Toggle permission
  const togglePermission = async (
    user: ClientUser, 
    field: 'puede_aprobar' | 'puede_editar'
  ) => {
    setSaving(true);

    const newValue = !user[field];

    await supabase
      .from('client_users')
      .update({ [field]: newValue })
      .eq('id', user.id);

    const existing = clientUsers.get(user.client_id) || [];
    setClientUsers(new Map(clientUsers.set(
      user.client_id,
      existing.map(u => u.id === user.id ? { ...u, [field]: newValue } : u)
    )));

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Acceso de Clientes</h1>
        <p className="text-sm text-gray-500">
          Gestiona quién de cada cliente puede acceder al portal
        </p>
      </div>

      {/* Clients list */}
      <div className="grid gap-4">
        {clients.map(client => {
          const contacts = clientUsers.get(client.id) || [];

          return (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              {/* Client header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {client.color && (
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: client.color }}
                    />
                  )}
                  <h3 className="font-semibold text-gray-900">{client.nombre}</h3>
                  <span className="text-sm text-gray-500">
                    {contacts.length} contacto{contacts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setSelectedClient(client);
                    setShowInvite(true);
                  }}
                  className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium"
                >
                  + Añadir contacto
                </button>
              </div>

              {/* Contacts table */}
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Sin contactos con acceso al portal. Añade uno para que puedan ver y aprobar contenido.
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Nombre</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Puesto</th>
                      <th className="pb-2 font-medium text-center">Aprobar</th>
                      <th className="pb-2 font-medium text-center">Editar</th>
                      <th className="pb-2 font-medium">Último acceso</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(contact => (
                      <tr key={contact.id} className="border-b border-gray-50">
                        <td className="py-2 text-sm text-gray-900">{contact.nombre}</td>
                        <td className="py-2 text-sm text-gray-600">{contact.email}</td>
                        <td className="py-2 text-sm text-gray-600">{contact.puesto || '—'}</td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            checked={contact.puede_aprobar}
                            onChange={() => togglePermission(contact, 'puede_aprobar')}
                            disabled={saving}
                            className="w-4 h-4 text-emerald-500 rounded"
                          />
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            checked={contact.puede_editar}
                            onChange={() => togglePermission(contact, 'puede_editar')}
                            disabled={saving}
                            className="w-4 h-4 text-emerald-500 rounded"
                          />
                        </td>
                        <td className="py-2 text-sm text-gray-500">
                          {contact.ultimo_acceso_at 
                            ? new Date(contact.ultimo_acceso_at).toLocaleDateString('es-PR')
                            : 'Nunca'
                          }
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => removeContact(client.id, contact.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      {showInvite && selectedClient && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowInvite(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Añadir contacto
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Para {selectedClient.nombre}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={inviteData.nombre}
                  onChange={e => setInviteData({ ...inviteData, nombre: e.target.value })}
                  placeholder="Ej: María González"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder="email@empresa.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Puesto
                </label>
                <input
                  type="text"
                  value={inviteData.puesto}
                  onChange={e => setInviteData({ ...inviteData, puesto: e.target.value })}
                  placeholder="Ej: Gerente de Marketing"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={inviteData.puede_aprobar}
                    onChange={e => setInviteData({ ...inviteData, puede_aprobar: e.target.checked })}
                    className="w-4 h-4 text-emerald-500 rounded"
                  />
                  <span className="text-sm text-gray-700">Puede aprobar contenido</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={inviteData.puede_editar}
                    onChange={e => setInviteData({ ...inviteData, puede_editar: e.target.checked })}
                    className="w-4 h-4 text-emerald-500 rounded"
                  />
                  <span className="text-sm text-gray-700">Puede editar copy</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 px-4 py-2 text-gray-700 font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={inviteContact}
                disabled={saving || !inviteData.email || !inviteData.nombre}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? 'Añadiendo...' : 'Añadir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
