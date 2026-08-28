'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsPage() {
  const { 
    settings, 
    loading, 
    saving, 
    error, 
    updateSettings,
    formatTime,
    parseTime,
    ZONAS_COMUNES,
  } = useSettings();

  const [form, setForm] = useState({
    timezone: 'America/Puerto_Rico',
    inicio_semana: 1 as 0 | 1,
    idioma: 'es' as 'es' | 'en',
    notif_push: true,
    notif_email: true,
    notif_sms: false,
    resumen_diario_activo: true,
    resumen_diario_hora: '8:00 AM',
  });

  // Sync form with settings
  useEffect(() => {
    if (settings) {
      setForm({
        timezone: settings.timezone,
        inicio_semana: settings.inicio_semana as 0 | 1,
        idioma: settings.idioma as 'es' | 'en',
        notif_push: settings.notif_push,
        notif_email: settings.notif_email,
        notif_sms: settings.notif_sms,
        resumen_diario_activo: settings.resumen_diario_activo,
        resumen_diario_hora: formatTime(settings.resumen_diario_min),
      });
    }
  }, [settings, formatTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await updateSettings({
      timezone: form.timezone,
      inicio_semana: form.inicio_semana,
      idioma: form.idioma,
      notif_push: form.notif_push,
      notif_email: form.notif_email,
      notif_sms: form.notif_sms,
      resumen_diario_activo: form.resumen_diario_activo,
      resumen_diario_min: parseTime(form.resumen_diario_hora),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500">Personaliza tu experiencia en el Hub</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Timezone & Language */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">Zona horaria e idioma</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zona horaria
              </label>
              <select
                value={form.timezone}
                onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {ZONAS_COMUNES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Esta zona se usa para mostrar fechas y calcular "Mi Semana"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inicio de semana
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="inicio_semana"
                    checked={form.inicio_semana === 1}
                    onChange={() => setForm(f => ({ ...f, inicio_semana: 1 }))}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Lunes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="inicio_semana"
                    checked={form.inicio_semana === 0}
                    onChange={() => setForm(f => ({ ...f, inicio_semana: 0 }))}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Domingo</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Idioma
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="idioma"
                    checked={form.idioma === 'es'}
                    onChange={() => setForm(f => ({ ...f, idioma: 'es' }))}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Español</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="idioma"
                    checked={form.idioma === 'en'}
                    onChange={() => setForm(f => ({ ...f, idioma: 'en' }))}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">English</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">Notificaciones</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Notificaciones push</p>
                <p className="text-xs text-gray-500">En el navegador o app</p>
              </div>
              <input
                type="checkbox"
                checked={form.notif_push}
                onChange={e => setForm(f => ({ ...f, notif_push: e.target.checked }))}
                className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-xs text-gray-500">Nuevas asignaciones y recordatorios</p>
              </div>
              <input
                type="checkbox"
                checked={form.notif_email}
                onChange={e => setForm(f => ({ ...f, notif_email: e.target.checked }))}
                className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">SMS</p>
                <p className="text-xs text-gray-500">Solo para alertas urgentes</p>
              </div>
              <input
                type="checkbox"
                checked={form.notif_sms}
                onChange={e => setForm(f => ({ ...f, notif_sms: e.target.checked }))}
                className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500"
              />
            </label>
          </div>
        </section>

        {/* Daily Summary */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">Resumen diario</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Recibir resumen diario</p>
                <p className="text-xs text-gray-500">Un email con lo que tienes para el día</p>
              </div>
              <input
                type="checkbox"
                checked={form.resumen_diario_activo}
                onChange={e => setForm(f => ({ ...f, resumen_diario_activo: e.target.checked }))}
                className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500"
              />
            </label>

            {form.resumen_diario_activo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de envío
                </label>
                <select
                  value={form.resumen_diario_hora}
                  onChange={e => setForm(f => ({ ...f, resumen_diario_hora: e.target.value }))}
                  className="w-48 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM'].map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  En tu zona horaria ({form.timezone.split('/')[1]?.replace('_', ' ')})
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
