'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { 
  rangoSemana, 
  claveDia, 
  diasDeLaSemana, 
  nombreDia,
  DEFAULT_TZ,
  esPasado
} from '@/lib/timezone';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ItemTipo = 'contenido' | 'entregable' | 'tarea';

export interface ItemSemana {
  id: string;
  tipo: ItemTipo;
  titulo: string;
  subtitulo: string | null;
  estado: string;
  cliente: string | null;
  clienteColor: string | null;
  fecha: Date | null;
  url: string;
  completado?: boolean;
}

export interface DiaSemana {
  fecha: Date;
  clave: string;
  nombre: string;
  items: ItemSemana[];
  esHoy: boolean;
}

export interface MiSemana {
  inicio: Date;
  fin: Date;
  atrasado: ItemSemana[];
  dias: DiaSemana[];
  sinFecha: ItemSemana[];
  resumen: {
    total: number;
    atrasados: number;
    publicaHoy: number;
    completadosHoy: number;
  };
}

export interface UserSettings {
  timezone: string;
  inicio_semana: 0 | 1;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMiSemana(options?: {
  userId?: string;
  todoElCrew?: boolean; // Para dirección: ver todo
}) {
  const [data, setData] = useState<MiSemana | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    timezone: DEFAULT_TZ,
    inicio_semana: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase: SupabaseClient = useMemo(() => createClient(), []);

  // Fetch user settings
  const fetchSettings = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_settings')
      .select('timezone, inicio_semana')
      .eq('user_id', userId)
      .single();
    
    if (data) {
      setSettings({
        timezone: data.timezone || DEFAULT_TZ,
        inicio_semana: (data.inicio_semana as 0 | 1) || 1,
      });
      return data;
    }
    
    return null;
  }, [supabase]);

  // Main fetch function
  const fetchMiSemana = useCallback(async (userId?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get current user if not provided
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }

      if (!uid) {
        setError('No user');
        setLoading(false);
        return;
      }

      // Fetch settings first
      await fetchSettings(uid);
      
      const tz = settings.timezone;
      const inicioSemana = settings.inicio_semana;
      
      const { inicio, fin } = rangoSemana(new Date(), tz, inicioSemana);
      const verTodo = options?.todoElCrew === true;

      // Fetch content items
      let contentQuery = supabase
        .from('content_items')
        .select(`
          id,
          titulo,
          status,
          formato,
          publica_at,
          hub_clients!inner(nombre, color)
        `)
        .neq('status', 'publicado');

      if (!verTodo) {
        contentQuery = contentQuery.eq('asignado_a', uid);
      }

      // Fetch items: this week + overdue + no date
      contentQuery = contentQuery.or(
        `publica_at.gte.${inicio.toISOString()},publica_at.lt.${inicio.toISOString()},publica_at.is.null`
      );

      const { data: contentData, error: contentError } = await contentQuery
        .order('publica_at', { ascending: true, nullsFirst: false });

      if (contentError) {
        throw contentError;
      }

      // Fetch deliverables (tareas del Hub actual)
      let delivQuery = supabase
        .from('deliverables')
        .select(`
          id,
          name,
          status,
          due_date,
          projects!inner(name, client_id)
        `)
        .neq('status', 'approved');

      const { data: delivData, error: delivError } = await delivQuery
        .order('due_date', { ascending: true, nullsFirst: false });

      if (delivError) {
        console.warn('Deliverables fetch error:', delivError);
      }

      // Normalize items
      const items: ItemSemana[] = [];

      // Add content items
      (contentData || []).forEach((item: any) => {
        items.push({
          id: item.id,
          tipo: 'contenido',
          titulo: item.titulo,
          subtitulo: item.formato,
          estado: item.status,
          cliente: item.hub_clients?.nombre || null,
          clienteColor: item.hub_clients?.color || null,
          fecha: item.publica_at ? new Date(item.publica_at) : null,
          url: `/contenido/${item.id}`,
        });
      });

      // Add deliverables
      (delivData || []).forEach((item: any) => {
        items.push({
          id: item.id,
          tipo: 'entregable',
          titulo: item.name,
          subtitulo: item.projects?.name || null,
          estado: item.status,
          cliente: null,
          clienteColor: null,
          fecha: item.due_date ? new Date(item.due_date) : null,
          url: `/projects/${item.projects?.client_id}`,
        });
      });

      // Group items
      const atrasado: ItemSemana[] = [];
      const sinFecha: ItemSemana[] = [];
      const porDia = new Map<string, ItemSemana[]>();

      for (const item of items) {
        if (!item.fecha) {
          sinFecha.push(item);
        } else if (item.fecha < inicio) {
          atrasado.push(item);
        } else if (item.fecha <= fin) {
          const k = claveDia(item.fecha, tz);
          if (!porDia.has(k)) porDia.set(k, []);
          porDia.get(k)!.push(item);
        }
      }

      atrasado.sort((a, b) => (a.fecha!.getTime() - b.fecha!.getTime()));

      // Build days array
      const diasArr = diasDeLaSemana(new Date(), tz, inicioSemana);
      const hoy = claveDia(new Date(), tz);
      
      const dias: DiaSemana[] = diasArr.map((fecha, i) => {
        const clave = claveDia(fecha, tz);
        const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const diaSemana = new Date(fecha.getTime()).getDay();
        
        return {
          fecha,
          clave,
          nombre: DIAS_ES[diaSemana],
          items: (porDia.get(clave) || []).sort(
            (a, b) => (a.fecha?.getTime() || 0) - (b.fecha?.getTime() || 0)
          ),
          esHoy: clave === hoy,
        };
      });

      const diaHoy = dias.find(d => d.esHoy);

      setData({
        inicio,
        fin,
        atrasado,
        dias,
        sinFecha,
        resumen: {
          total: items.length,
          atrasados: atrasado.length,
          publicaHoy: diaHoy?.items.length || 0,
          completadosHoy: 0, // TODO: track completed today
        },
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, settings, options?.todoElCrew, fetchSettings]);

  // Mark item as complete (quick action)
  const marcarCompletado = useCallback(async (item: ItemSemana) => {
    if (item.tipo === 'contenido') {
      await supabase
        .from('content_items')
        .update({ status: 'publicado' })
        .eq('id', item.id);
    } else if (item.tipo === 'entregable') {
      await supabase
        .from('deliverables')
        .update({ status: 'approved' })
        .eq('id', item.id);
    }
    
    // Refetch
    fetchMiSemana();
  }, [supabase, fetchMiSemana]);

  // Get workload by crew member (for dirección)
  const getCargaDelCrew = useCallback(async () => {
    const { inicio, fin } = rangoSemana(new Date(), settings.timezone, settings.inicio_semana);
    
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        asignado_a,
        status,
        publica_at,
        profiles!inner(name)
      `)
      .neq('status', 'publicado')
      .lte('publica_at', fin.toISOString());
    
    if (error) {
      console.error('Error fetching crew workload:', error);
      return [];
    }

    // Group by user
    const byUser = new Map<string, { 
      userId: string; 
      nombre: string; 
      total: number; 
      atrasados: number;
      estaSemana: number;
    }>();

    (data || []).forEach((item: any) => {
      if (!item.asignado_a) return;
      
      if (!byUser.has(item.asignado_a)) {
        byUser.set(item.asignado_a, {
          userId: item.asignado_a,
          nombre: item.profiles?.name || 'Sin nombre',
          total: 0,
          atrasados: 0,
          estaSemana: 0,
        });
      }
      
      const entry = byUser.get(item.asignado_a)!;
      entry.total++;
      
      if (item.publica_at) {
        const fecha = new Date(item.publica_at);
        if (fecha < inicio) {
          entry.atrasados++;
        } else if (fecha <= fin) {
          entry.estaSemana++;
        }
      }
    });

    return Array.from(byUser.values()).sort((a, b) => b.total - a.total);
  }, [supabase, settings]);

  // Initial fetch
  useEffect(() => {
    fetchMiSemana(options?.userId);
  }, []);

  return {
    data,
    loading,
    error,
    settings,
    refetch: fetchMiSemana,
    marcarCompletado,
    getCargaDelCrew,
  };
}
