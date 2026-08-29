'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rangoMes, rangoSemana, claveDia, DEFAULT_TZ } from '@/lib/timezone';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentStatus = 
  | 'idea' 
  | 'creacion' 
  | 'diseno' 
  | 'revision' 
  | 'aprobado' 
  | 'programado' 
  | 'publicado';

export type ContentChannel = 
  | 'facebook' 
  | 'instagram' 
  | 'fb_ig' 
  | 'tiktok' 
  | 'linkedin' 
  | 'youtube' 
  | 'email';

export type ContentFormat = 
  | 'imagen' 
  | 'carrusel' 
  | 'video' 
  | 'reel' 
  | 'story' 
  | 'foto' 
  | 'texto' 
  | 'evento' 
  | 'shopper' 
  | 'email';

export interface ContentItem {
  id: string;
  titulo: string;
  client_id: string;
  status: ContentStatus;
  canal: ContentChannel | null;
  formato: ContentFormat | null;
  angulo: string | null;
  publica_at: string | null;
  copy: string | null;
  marca_producto: string | null;
  asignado_a: string | null;
  campana: string | null;
  hashtags: string[];
  boosted: boolean;
  notas: string | null;
  recordatorio_minutos: number;
  archivos: unknown[];
  created_at: string;
  updated_at: string;
  // Joined fields
  cliente_nombre?: string;
  cliente_color?: string;
  asignado_nombre?: string;
}

export interface HubClient {
  id: string;
  nombre: string;
  slug: string;
  color: string | null;
  idioma: string;
  timezone: string;
  notas_marca: string | null;
  reglas_marca: Record<string, unknown>;
  activo: boolean;
}

export interface ContentItemInput {
  titulo: string;
  client_id: string;
  status?: ContentStatus;
  canal?: ContentChannel | null;
  formato?: ContentFormat | null;
  angulo?: string | null;
  publica_at?: string | null;
  copy?: string | null;
  marca_producto?: string | null;
  asignado_a?: string | null;
  campana?: string | null;
  hashtags?: string[];
  notas?: string | null;
  recordatorio_minutos?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STATUSES: { value: ContentStatus; label: string; color: string }[] = [
  { value: 'idea', label: 'Idea', color: 'bg-gray-100 text-gray-800' },
  { value: 'creacion', label: 'Creación', color: 'bg-blue-100 text-blue-800' },
  { value: 'diseno', label: 'Diseño', color: 'bg-purple-100 text-purple-800' },
  { value: 'revision', label: 'Revisión', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-green-100 text-green-800' },
  { value: 'programado', label: 'Programado', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'publicado', label: 'Publicado', color: 'bg-emerald-100 text-emerald-800' },
];

export const CHANNELS: { value: ContentChannel; label: string; icon: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'fb_ig', label: 'FB + IG', icon: '📱' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'youtube', label: 'YouTube', icon: '🎬' },
  { value: 'email', label: 'Email', icon: '📧' },
];

export const FORMATS: { value: ContentFormat; label: string }[] = [
  { value: 'imagen', label: 'Imagen' },
  { value: 'carrusel', label: 'Carrusel' },
  { value: 'video', label: 'Video' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
  { value: 'foto', label: 'Foto' },
  { value: 'texto', label: 'Texto' },
  { value: 'evento', label: 'Evento' },
  { value: 'shopper', label: 'Shopper' },
  { value: 'email', label: 'Email' },
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useContentCalendar(options?: {
  clientId?: string;
  userId?: string;
  timezone?: string;
}) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [clients, setClients] = useState<HubClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase: SupabaseClient = useMemo(() => createClient(), []);
  const tz = options?.timezone ?? DEFAULT_TZ;

  // Fetch clients
  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_clients')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    
    if (error) {
      console.error('Error fetching clients:', error);
      return;
    }
    
    setClients(data || []);
  }, [supabase]);

  // Fetch items for month view
  const fetchMonthView = useCallback(async (year: number, month: number, clientId?: string) => {
    setLoading(true);
    setError(null);
    
    const { inicio, fin } = rangoMes(year, month, tz);
    
    let query = supabase
      .from('content_items')
      .select(`
        *,
        hub_clients!inner(nombre, color)
      `)
      .gte('publica_at', inicio.toISOString())
      .lte('publica_at', fin.toISOString())
      .order('publica_at', { ascending: true });
    
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    
    const { data, error: fetchError } = await query;
    
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    
    const mapped = (data || []).map(item => ({
      ...item,
      cliente_nombre: item.hub_clients?.nombre,
      cliente_color: item.hub_clients?.color,
    }));
    
    setItems(mapped);
    setLoading(false);
  }, [supabase, tz]);

  // Fetch items for board view (by status)
  const fetchBoardView = useCallback(async (clientId?: string) => {
    setLoading(true);
    setError(null);
    
    let query = supabase
      .from('content_items')
      .select(`
        *,
        hub_clients!inner(nombre, color)
      `)
      .neq('status', 'publicado')
      .order('publica_at', { ascending: true, nullsFirst: false });
    
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    
    const { data, error: fetchError } = await query;
    
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    
    const mapped = (data || []).map(item => ({
      ...item,
      cliente_nombre: item.hub_clients?.nombre,
      cliente_color: item.hub_clients?.color,
    }));
    
    setItems(mapped);
    setLoading(false);
  }, [supabase]);

  // Fetch my queue (assigned to me, not published)
  const fetchMyQueue = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('content_items')
      .select(`
        *,
        hub_clients!inner(nombre, color)
      `)
      .eq('asignado_a', userId)
      .neq('status', 'publicado')
      .order('publica_at', { ascending: true, nullsFirst: false });
    
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    
    const mapped = (data || []).map(item => ({
      ...item,
      cliente_nombre: item.hub_clients?.nombre,
      cliente_color: item.hub_clients?.color,
    }));
    
    setItems(mapped);
    setLoading(false);
  }, [supabase]);

  // Create item
  const createItem = useCallback(async (input: ContentItemInput) => {
    const { data, error } = await supabase
      .from('content_items')
      .insert(input)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  }, [supabase]);

  // Update item
  const updateItem = useCallback(async (id: string, updates: Partial<ContentItemInput>) => {
    const { data, error } = await supabase
      .from('content_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Update local state
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    
    return data;
  }, [supabase]);

  // Move item (change status)
  const moveItem = useCallback(async (id: string, status: ContentStatus) => {
    return updateItem(id, { status });
  }, [updateItem]);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    setItems(prev => prev.filter(item => item.id !== id));
  }, [supabase]);

  // Duplicate item
  const duplicateItem = useCallback(async (id: string, overrides?: Partial<ContentItemInput>) => {
    const original = items.find(item => item.id === id);
    if (!original) throw new Error('Item not found');
    
    const { id: _, created_at, updated_at, ...rest } = original;
    
    const newItem = {
      ...rest,
      ...overrides,
      titulo: `${original.titulo} (copia)`,
      status: 'idea' as ContentStatus,
    };
    
    return createItem(newItem);
  }, [items, createItem]);

  // Get item by id
  const getItem = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        *,
        hub_clients!inner(nombre, color, notas_marca, reglas_marca, idioma, timezone)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return {
      ...data,
      cliente_nombre: data.hub_clients?.nombre,
      cliente_color: data.hub_clients?.color,
      cliente_notas_marca: data.hub_clients?.notas_marca,
      cliente_reglas_marca: data.hub_clients?.reglas_marca,
      cliente_idioma: data.hub_clients?.idioma,
      cliente_timezone: data.hub_clients?.timezone,
    };
  }, [supabase]);

  // Group items by status for board view
  const itemsByStatus = useCallback(() => {
    const grouped: Record<ContentStatus, ContentItem[]> = {
      idea: [],
      creacion: [],
      diseno: [],
      revision: [],
      aprobado: [],
      programado: [],
      publicado: [],
    };
    
    items.forEach(item => {
      if (grouped[item.status]) {
        grouped[item.status].push(item);
      }
    });
    
    return grouped;
  }, [items]);

  // Group items by day for calendar view
  const itemsByDay = useCallback(() => {
    const grouped: Record<string, ContentItem[]> = {};
    
    items.forEach(item => {
      if (item.publica_at) {
        const key = claveDia(new Date(item.publica_at), tz);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }
    });
    
    return grouped;
  }, [items, tz]);

  // Initial fetch of clients
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('content_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_items' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the full item with joins
            getItem(payload.new.id).then(item => {
              setItems(prev => [...prev, item]);
            }).catch(console.error);
          } else if (payload.eventType === 'UPDATE') {
            getItem(payload.new.id).then(item => {
              setItems(prev => prev.map(i => i.id === item.id ? item : i));
            }).catch(console.error);
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, getItem]);

  return {
    items,
    clients,
    loading,
    error,
    fetchMonthView,
    fetchBoardView,
    fetchMyQueue,
    createItem,
    updateItem,
    moveItem,
    deleteItem,
    duplicateItem,
    getItem,
    itemsByStatus,
    itemsByDay,
    refetch: fetchBoardView,
  };
}
