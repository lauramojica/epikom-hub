'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [brand, setBrand] = useState<{ icon_url?: string | null; wordmark?: string; wordmark_sub?: string } | null>(null)

  useEffect(() => {
    supabase.from('agency_settings').select('icon_url, icon_url_light, logo_url, logo_url_light, wordmark, wordmark_sub').eq('id', 1).single()
      .then(({ data }) => {
        if (!data) return
        // El login respeta el tema guardado por el usuario
        const saved = localStorage.getItem('epikom-theme') ?? 'dark'
        const hour = new Date().getHours()
        const isLight = saved === 'light' || (saved === 'auto' && hour >= 7 && hour < 19)
        if (isLight) document.documentElement.classList.add('light')
        const icon = isLight
          ? (data.icon_url_light ?? data.icon_url ?? data.logo_url_light ?? data.logo_url)
          : (data.icon_url ?? data.logo_url)
        setBrand({ icon_url: icon, wordmark: data.wordmark, wordmark_sub: data.wordmark_sub })
      })
  }, [supabase])

  const handlePasswordLogin = async () => {
    if (!email || !password) { setError('Escribe tu email y contraseña.'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Credenciales inválidas. Revisa tu email y contraseña.'
          : error.message
      )
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  const handleMagicLink = async () => {
    if (!email) { setError('Escribe tu email.'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) {
      setError(
        error.message.toLowerCase().includes('signups not allowed')
          ? 'Ese email no tiene cuenta en el hub. Pídele acceso a Laura.'
          : error.message
      )
      return
    }
    setSent(true)
  }

  const inputCls = 'w-full bg-surface2 border border-line rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50'

  return (
    <div className="min-h-dvh bg-bg text-ink flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          {brand?.icon_url ? (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden mb-5 bg-surface2">
              <img src={brand.icon_url} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mb-5">
              <svg width="24" height="24" viewBox="0 0 14 14" fill="none">
                <path d="M2 9L5 5L7.5 7.5L10 4L13 6.5" stroke="#0a0a0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="11" r="2.5" fill="#0a0a0d" />
              </svg>
            </div>
          )}
          <h1 className="font-display text-3xl font-800 uppercase tracking-widest leading-none">{brand?.wordmark ?? 'Epikom'}</h1>
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-1.5">{brand?.wordmark_sub ?? 'Hub Interno'}</p>
        </div>

        {sent ? (
          <div className="bg-surface border border-line rounded-2xl p-6 text-center animate-pop-in">
            <p className="text-4xl mb-3">📬</p>
            <p className="text-sm font-600 text-ink mb-1.5">Revisa tu email</p>
            <p className="text-xs text-muted leading-relaxed mb-5">
              Te enviamos un enlace mágico a <span className="text-ink font-mono">{email}</span>.
              Ábrelo desde este mismo dispositivo.
            </p>
            <button
              onClick={() => { setSent(false); setError(null) }}
              className="text-xs font-mono text-primary hover:opacity-80"
            >
              ← Usar otro email
            </button>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-2xl p-6 space-y-4">
            <div className="flex gap-1 bg-surface2 border border-line rounded-xl p-1">
              {(['password', 'magic'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null) }}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wide transition-all ${
                    mode === m ? 'bg-primary text-bg font-600' : 'text-muted hover:text-ink'
                  }`}
                >
                  {m === 'password' ? 'Contraseña' : '✨ Magic Link'}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && (mode === 'password' ? handlePasswordLogin() : handleMagicLink())}
                placeholder="tu@epikom.com"
                autoComplete="email"
                className={inputCls}
              />
            </div>

            {mode === 'password' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono text-muted uppercase tracking-widest">Contraseña</label>
                  <Link href="/forgot-password" className="text-[10px] font-mono text-primary hover:opacity-80">
                    ¿Olvidaste?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={inputCls}
                />
              </div>
            )}

            {mode === 'magic' && (
              <p className="text-[11px] text-muted leading-relaxed">
                Te mandamos un enlace al correo y entras sin contraseña. Solo funciona con emails que ya tienen cuenta.
              </p>
            )}

            {error && (
              <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              onClick={mode === 'password' ? handlePasswordLogin : handleMagicLink}
              disabled={loading}
              className="w-full bg-primary text-bg font-600 text-sm rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 font-body"
            >
              {loading
                ? (mode === 'password' ? 'Entrando…' : 'Enviando…')
                : (mode === 'password' ? 'Entrar al hub →' : 'Enviar enlace mágico ✨')}
            </button>
          </div>
        )}

        <p className="text-center text-[10px] font-mono text-muted mt-6 uppercase tracking-widest">
          Epikom Interactive · Bayamón PR
        </p>
      </div>
    </div>
  )
}
