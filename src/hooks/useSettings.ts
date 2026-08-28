'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_TZ, esZonaValida, ZONAS_COMUNES } from '@/lib/timezone';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserSettings {
  user_id: string;
  timezone: string;
  inicio_semana: 0 | 1;
  idioma: 'es' | 'en';
  notif_push: boolean;
  notif_email: boolean;
  notif_sms: boolean;
  resumen_diario_min: number;
  resumen_diario_activo: boolean;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id' | 'updated_at'> = {
  timezone: DEFAULT_TZ,
  inicio_semana: 1,
  idioma: 'es',
  notif_push: true,
  notif_email: true,
  notif_sms: false,
  resumen_diario_min: 480, // 8:00 AM
  resumen_diario_activo: true,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase: SupabaseClient = useMemo(() => createClient(), []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw fetchError;
      }

      if (data) {
        setSettings(data as UserSettings);
      } else {
        // Return defaults if no settings exist
        setSettings({
          ...DEFAULT_SETTINGS,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        } as UserSettings);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<Omit<UserSettings, 'user_id' | 'updated_at'>>) => {
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate timezone if provided
      if (updates.timezone && !esZonaValida(updates.timezone)) {
        throw new Error('Zona horaria inválida');
      }

      const { data, error: upsertError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setSettings(data as UserSettings);
      return { ok: true };
    } catch (err: any) {
      setError(err.message);
      return { ok: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, [supabase]);

  // Detect timezone on first login
  const detectarZonaSiNoTiene = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if settings exist
      const { data: existing } = await supabase
        .from('user_settings')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (existing) return; // Already has settings

      // Get browser timezone
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!esZonaValida(browserTz)) return;

      // Create initial settings
      await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          timezone: browserTz,
        });

      fetchSettings();
    } catch (err) {
      console.error('Error detecting timezone:', err);
    }
  }, [supabase, fetchSettings]);

  // Helper: format time from minutes
  const formatTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  }, []);

  // Helper: parse time to minutes
  const parseTime = useCallback((time: string): number => {
    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 480;
    
    let hours = parseInt(match[1]);
    const mins = parseInt(match[2]);
    const period = match[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + mins;
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    updateSettings,
    detectarZonaSiNoTiene,
    formatTime,
    parseTime,
    refetch: fetchSettings,
    // Re-export for convenience
    ZONAS_COMUNES,
    DEFAULT_TZ,
  };
}
