'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [noSession, setNoSession] = useState(false)

  // El enlace de recovery ya estableció sesión al pasar por /auth/callback
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setNoSession(true)
      setReady(true)
    })
  }, [supabase])

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthLabel = ['', 'Débil', 'Aceptable', 'Fuerte'][strength]
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e'][strength]

  const handleSubmit = async () => {
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  const inputCls = 'w-full bg-surface2 border border-line rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50'

  return (
    <div className="min-h-dvh bg-bg text-ink flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mb-5">
            <svg width="24" height="24" viewBox="0 0 14 14" fill="none">
              <path d="M2 9L5 5L7.5 7.5L10 4L13 6.5" stroke="#0a0a0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="11" r="2.5" fill="#0a0a0d" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-800 uppercase tracking-widest leading-none">Epikom</h1>
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-1.5">Nueva contraseña</p>
        </div>

        {!ready ? (
          <div className="bg-surface border border-line rounded-2xl p-6 text-center">
            <p className="font-mono text-xs text-muted uppercase tracking-widest">Verificando enlace…</p>
          </div>
        ) : noSession ? (
          <div className="bg-surface border border-line rounded-2xl p-6 text-center animate-pop-in">
            <p className="text-4xl mb-3">⏳</p>
            <p className="text-sm font-600 text-ink mb-1.5">Enlace expirado o inválido</p>
            <p className="text-xs text-muted leading-relaxed mb-5">
              Los enlaces de recuperación caducan. Pide uno nuevo para continuar.
            </p>
            <Link href="/forgot-password" className="text-xs font-mono text-primary hover:opacity-80">
              Pedir un enlace nuevo →
            </Link>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-2xl p-6 space-y-4">
            <p className="text-xs text-muted leading-relaxed">Crea tu contraseña nueva. Mínimo 8 caracteres.</p>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                placeholder="••••••••"
                autoComplete="new-password"
                autoFocus
                className={inputCls}
              />
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 bg-surface2 rounded-full overflow-hidden">
                    <div className="h-full progress-fill rounded-full" style={{ width: `${(strength / 3) * 100}%`, background: strengthColor }} />
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
            {error && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary text-bg font-600 text-sm rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 font-body"
            >
              {loading ? 'Guardando…' : 'Guardar y entrar →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
