'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrewMember {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'crew' | 'cliente';
  avatar_url: string | null;
  created_at: string;
}

interface HubClient {
  id: string;
  nombre: string;
  slug: string;
  color: string | null;
  activo: boolean;
}

interface CrewAccess {
  user_id: string;
  client_id: string;
  puede_ver: boolean;
  puede_editar: boolean;
  puede_publicar: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminCrewPage() {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [clients, setClients] = useState<HubClient[]>([]);
  const [accessMap, setAccessMap] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const supabase: SupabaseClient = useMemo(() => createClient(), []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch crew members (role = crew, admin, or superadmin)
    const { data: crewData } = await supabase
      .from('users')
      .select('*')
      .in('role', ['superadmin', 'admin', 'crew'])
      .order('name');

    // Fetch clients
    const { data: clientsData } = await supabase
      .from('hub_clients')
      .select('id, nombre, slug, color, activo')
      .eq('activo', true)
      .order('nombre');

    // Fetch access assignments
    const { data: accessData } = await supabase
      .from('crew_client_access')
      .select('user_id, client_id');

    // Build access map
    const map = new Map<string, Set<string>>();
    (accessData || []).forEach((a: any) => {
      if (!map.has(a.user_id)) map.set(a.user_id, new Set());
      map.get(a.user_id)!.add(a.client_id);
    });

    setCrew(crewData || []);
    setClients(clientsData || []);
    setAccessMap(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle client access for a crew member
  const toggleAccess = async (userId: string, clientId: string) => {
    const userAccess = accessMap.get(userId) || new Set();
    const hasAccess = userAccess.has(clientId);

    setSaving(true);

    if (hasAccess) {
      // Remove access
      await supabase
        .from('crew_client_access')
        .delete()
        .eq('user_id', userId)
        .eq('client_id', clientId);

      userAccess.delete(clientId);
    } else {
      // Add access
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('crew_client_access')
        .insert({
          user_id: userId,
          client_id: clientId,
          asignado_por: user?.id,
        });

      userAccess.add(clientId);
    }

    setAccessMap(new Map(accessMap.set(userId, userAccess)));
    setSaving(false);
  };

  // Assign all clients to a crew member
  const assignAll = async (userId: string) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Delete existing
    await supabase
      .from('crew_client_access')
      .delete()
      .eq('user_id', userId);

    // Insert all
    const inserts = clients.map(c => ({
      user_id: userId,
      client_id: c.id,
      asignado_por: user?.id,
    }));

    await supabase.from('crew_client_access').insert(inserts);

    // Update local state
    setAccessMap(new Map(accessMap.set(userId, new Set(clients.map(c => c.id)))));
    setSaving(false);
  };

  // Remove all client access from a crew member
  const removeAll = async (userId: string) => {
    setSaving(true);

    await supabase
      .from('crew_client_access')
      .delete()
      .eq('user_id', userId);

    setAccessMap(new Map(accessMap.set(userId, new Set())));
    setSaving(false);
  };

  // Invite new crew member
  const inviteCrew = async () => {
    if (!inviteEmail || !inviteName) return;

    setSaving(true);

    // Create auth user invite (this sends an email)
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
      data: {
        name: inviteName,
        role: 'crew',
      },
    });

    if (error) {
      // If admin API not available, create profile directly
      // User will need to sign up themselves
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          email: inviteEmail,
          name: inviteName,
          role: 'crew',
        });

      if (profileError) {
        console.error('Error inviting:', profileError);
        alert('Error al invitar. El usuario deberá registrarse manualmente.');
      } else {
        alert('Perfil creado. El usuario deberá registrarse con este email.');
      }
    }

    setInviteEmail('');
    setInviteName('');
    setShowInvite(false);
    setSaving(false);
    fetchData();
  };

  // Change crew role
  const changeRole = async (userId: string, newRole: 'superadmin' | 'admin' | 'crew') => {
    setSaving(true);

    await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    setCrew(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión del Crew</h1>
          <p className="text-sm text-gray-500">
            Asigna qué clientes puede ver cada miembro del equipo
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600"
        >
          + Invitar crew
        </button>
      </div>

      {/* Crew list */}
      <div className="grid gap-4">
        {crew.map(member => {
          const memberAccess = accessMap.get(member.id) || new Set();
          const accessCount = memberAccess.size;

          const roleColors: Record<string, string> = {
            superadmin: 'bg-purple-100 text-purple-700',
            admin: 'bg-amber-100 text-amber-700',
            crew: 'bg-blue-100 text-blue-700',
          };

          return (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              {/* Member header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium">
                    {member.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  
                  {/* Role selector - only superadmin can change roles */}
                  <select
                    value={member.role}
                    onChange={e => changeRole(member.id, e.target.value as 'superadmin' | 'admin' | 'crew')}
                    disabled={saving || member.role === 'superadmin'}
                    className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full border-0 cursor-pointer ${roleColors[member.role] || 'bg-gray-100'}`}
                  >
                    <option value="crew">crew</option>
                    <option value="admin">admin</option>
                    <option value="superadmin" disabled>superadmin</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {accessCount} de {clients.length} clientes
                  </span>
                  
                  {member.role === 'crew' && (
                    <>
                      <button
                        onClick={() => assignAll(member.id)}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => removeAll(member.id)}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Ninguno
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Client checkboxes */}
              {(member.role === 'superadmin' || member.role === 'admin') ? (
                <p className="text-sm text-gray-500 italic">
                  {member.role === 'superadmin' ? 'Superadmin' : 'Admin'} tiene acceso a todos los clientes automáticamente.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {clients.map(client => {
                    const hasAccess = memberAccess.has(client.id);
                    
                    return (
                      <label
                        key={client.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          hasAccess ? 'bg-emerald-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={hasAccess}
                          onChange={() => toggleAccess(member.id, client.id)}
                          disabled={saving}
                          className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          {client.color && (
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: client.color }}
                            />
                          )}
                          <span className="text-sm text-gray-700 truncate">
                            {client.nombre}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowInvite(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invitar al crew</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Ej: Christopher Rodríguez"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
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
                onClick={inviteCrew}
                disabled={saving || !inviteEmail || !inviteName}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? 'Invitando...' : 'Invitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
