'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email) { setError('Escribe tu email.'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    // Siempre confirmamos, exista o no la cuenta (no filtramos qué emails existen)
    setSent(true)
  }

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
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-1.5">Recuperar acceso</p>
        </div>

        {sent ? (
          <div className="bg-surface border border-line rounded-2xl p-6 text-center animate-pop-in">
            <p className="text-4xl mb-3">🔑</p>
            <p className="text-sm font-600 text-ink mb-1.5">Enlace enviado</p>
            <p className="text-xs text-muted leading-relaxed mb-5">
              Si <span className="text-ink font-mono">{email}</span> tiene cuenta, te llegó un enlace para crear una contraseña nueva.
            </p>
            <Link href="/login" className="text-xs font-mono text-primary hover:opacity-80">← Volver al login</Link>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-2xl p-6 space-y-4">
            <p className="text-xs text-muted leading-relaxed">
              Escribe tu email y te mandamos un enlace para crear una contraseña nueva.
            </p>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="tu@epikom.com"
                autoComplete="email"
                autoFocus
                className="w-full bg-surface2 border border-line rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50"
              />
            </div>
            {error && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary text-bg font-600 text-sm rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 font-body"
            >
              {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>
            <div className="text-center pt-1">
              <Link href="/login" className="text-xs font-mono text-muted hover:text-ink">← Volver al login</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
