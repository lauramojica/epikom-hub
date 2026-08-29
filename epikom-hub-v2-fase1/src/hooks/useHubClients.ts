'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient as getSupabase } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_TZ } from '@/lib/timezone';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HubClient {
  id: string;
  nombre: string;
  slug: string;
  color: string | null;
  idioma: string;
  timezone: string;
  notas_marca: string | null;
  reglas_marca: {
    palabras_prohibidas?: string[];
    estilo_imagenes?: string;
    [key: string]: unknown;
  };
  contactos: Array<{
    nombre: string;
    email: string;
    puesto?: string;
    telefono?: string;
  }>;
  notif_email: boolean;
  notif_sms: boolean;
  notif_whatsapp: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface HubClientInput {
  nombre: string;
  slug?: string;
  color?: string | null;
  idioma?: string;
  timezone?: string;
  notas_marca?: string | null;
  reglas_marca?: Record<string, unknown>;
  contactos?: Array<{
    nombre: string;
    email: string;
    puesto?: string;
    telefono?: string;
  }>;
  notif_email?: boolean;
  notif_sms?: boolean;
  notif_whatsapp?: boolean;
  activo?: boolean;
}

export interface ClientStats {
  id: string;
  nombre: string;
  color: string | null;
  total_items: number;
  items_pendientes: number;
  items_publicados: number;
  ultimo_post: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHubClients() {
  const [clients, setClients] = useState<HubClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase: SupabaseClient = useMemo(() => getSupabase(), []);

  // Generate slug from name
  const generateSlug = useCallback((nombre: string): string => {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  // Fetch all clients
  const fetchClients = useCallback(async (includeInactive = false) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('hub_clients')
        .select('*')
        .order('nombre');

      if (!includeInactive) {
        query = query.eq('activo', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setClients(data as HubClient[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Get single client
  const getClient = useCallback(async (id: string): Promise<HubClient | null> => {
    const { data, error } = await supabase
      .from('hub_clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching client:', error);
      return null;
    }

    return data as HubClient;
  }, [supabase]);

  // Create client
  const createClient = useCallback(async (input: HubClientInput): Promise<HubClient> => {
    const slug = input.slug || generateSlug(input.nombre);

    const { data, error } = await supabase
      .from('hub_clients')
      .insert({
        ...input,
        slug,
        timezone: input.timezone || DEFAULT_TZ,
        idioma: input.idioma || 'es',
        reglas_marca: input.reglas_marca || {},
        contactos: input.contactos || [],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    setClients(prev => [...prev, data as HubClient].sort((a, b) => 
      a.nombre.localeCompare(b.nombre)
    ));

    return data as HubClient;
  }, [supabase, generateSlug]);

  // Update client
  const updateClient = useCallback(async (id: string, updates: Partial<HubClientInput>): Promise<HubClient> => {
    const { data, error } = await supabase
      .from('hub_clients')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    setClients(prev => prev.map(c => c.id === id ? data as HubClient : c));

    return data as HubClient;
  }, [supabase]);

  // Delete client (soft delete - just set inactive)
  const deactivateClient = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('hub_clients')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    setClients(prev => prev.filter(c => c.id !== id));
  }, [supabase]);

  // Get client stats
  const getClientStats = useCallback(async (): Promise<ClientStats[]> => {
    const { data, error } = await supabase
      .from('hub_clients')
      .select(`
        id,
        nombre,
        color,
        content_items(
          id,
          status,
          publica_at
        )
      `)
      .eq('activo', true);

    if (error) {
      console.error('Error fetching client stats:', error);
      return [];
    }

    return (data || []).map((client: any) => {
      const items = client.content_items || [];
      const publicados = items.filter((i: any) => i.status === 'publicado');
      const pendientes = items.filter((i: any) => i.status !== 'publicado');
      const ultimoPost = publicados
        .map((i: any) => i.publica_at)
        .filter(Boolean)
        .sort()
        .pop();

      return {
        id: client.id,
        nombre: client.nombre,
        color: client.color,
        total_items: items.length,
        items_pendientes: pendientes.length,
        items_publicados: publicados.length,
        ultimo_post: ultimoPost || null,
      };
    });
  }, [supabase]);

  // Add contact to client
  const addContact = useCallback(async (
    clientId: string,
    contact: { nombre: string; email: string; puesto?: string; telefono?: string }
  ) => {
    const client = await getClient(clientId);
    if (!client) throw new Error('Client not found');

    const contactos = [...(client.contactos || []), contact];

    return updateClient(clientId, { contactos });
  }, [getClient, updateClient]);

  // Remove contact from client
  const removeContact = useCallback(async (clientId: string, email: string) => {
    const client = await getClient(clientId);
    if (!client) throw new Error('Client not found');

    const contactos = (client.contactos || []).filter(c => c.email !== email);

    return updateClient(clientId, { contactos });
  }, [getClient, updateClient]);

  // Update brand rules
  const updateReglasMarca = useCallback(async (
    clientId: string,
    reglas: Record<string, unknown>
  ) => {
    const client = await getClient(clientId);
    if (!client) throw new Error('Client not found');

    const reglas_marca = {
      ...(client.reglas_marca || {}),
      ...reglas,
    };

    return updateClient(clientId, { reglas_marca });
  }, [getClient, updateClient]);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    fetchClients,
    getClient,
    createClient,
    updateClient,
    deactivateClient,
    getClientStats,
    addContact,
    removeContact,
    updateReglasMarca,
    generateSlug,
  };
}

// ---------------------------------------------------------------------------
// Predefined clients for Epikom (for initial data seeding)
// ---------------------------------------------------------------------------

export const EPIKOM_CLIENTS_SEED: HubClientInput[] = [
  {
    nombre: 'Ferreterías National',
    slug: 'national',
    color: '#E63946',
    idioma: 'es',
    timezone: 'America/Puerto_Rico',
    notas_marca: 'Casas de cemento clase media puertorriqueña moderna. Nunca lujo, nunca colonial de Viejo San Juan.',
    reglas_marca: {
      estilo_imagenes: 'casas cemento clase media moderna',
      evitar: ['lujo', 'colonial', 'viejo san juan'],
    },
  },
  {
    nombre: 'IG Sports Academy',
    slug: 'ig-sports',
    color: '#B8860B',
    idioma: 'en',
    timezone: 'America/Chicago',
    notas_marca: 'All content in English. Omaha, Nebraska audience.',
    reglas_marca: {
      palabras_prohibidas: ['elevate your game', 'unlock your potential', 'next level'],
      idioma_obligatorio: 'en',
      paleta: ['#353839', '#b8860b', '#c19a6b', '#e3dac9', '#faf0e6'],
    },
  },
  {
    nombre: 'ACHA Trading',
    slug: 'acha',
    color: '#1D3557',
    idioma: 'es',
    timezone: 'America/Puerto_Rico',
  },
  {
    nombre: 'Drouyn & Co',
    slug: 'drouyn',
    color: '#2D6A4F',
    idioma: 'es',
    timezone: 'America/Puerto_Rico',
    notas_marca: 'Voz "Bold & Jugoso" - estilo Oatly/Graza/Olipop. Bilingual ES/EN.',
  },
  {
    nombre: 'HCS',
    slug: 'hcs',
    color: '#457B9D',
    idioma: 'es',
    timezone: 'America/Puerto_Rico',
  },
  {
    nombre: 'misResultados',
    slug: 'misresultados',
    color: '#F4A261',
    idioma: 'es',
    timezone: 'America/Puerto_Rico',
  },
  {
    nombre: 'Cangrejeras de Santurce',
    slug: 'cangrejeras',
    color: '#E76F51',
    idioma: 'es',
    timezone: 'America/Puerto_Rico',
  },
  {
    nombre: 'Plaza Centro',
    slug: 'plaza-centro',
    color: '#9B2335',
    idioma: 'es',
    timezone: 'America/Puerto_Rico',
  },
  {
    nombre: 'Shops@Caguas',
    slug: 'shops-caguas',
    color: '#264653',
    idioma: 'es',
    timezone: 'America/Puerto_Rico',
  },
  {
    nombre: 'Outlets at Montehiedra',
    slug: 'montehiedra',
    color: '#023047',
    idioma: 'es',
    timezone: 'America/Puerto_Rico',
  },
  {
    nombre: 'Sedco Corp',
    slug: 'sedco',
    color: '#1D2758',
    idioma: 'es',
    timezone: 'America/Puerto_Rico',
    notas_marca: 'Voz: autoridad del oficio. Paleta oficial: Ultramarine #1D2758, Deep Blue #002F87, Sacré Bleu #0033A1, Steel Blue #4B89B5.',
    reglas_marca: {
      paleta: ['#1D2758', '#002F87', '#0033A1', '#4B89B5'],
      tipografia: ['Gotham', 'Montserrat', 'Helvetica'],
    },
  },
];
