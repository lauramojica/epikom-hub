'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'password' | 'magic'

/** Adónde volver después de entrar: solo rutas internas del Hub */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next') ?? '/'
  // "//x" y "/\x" los navegadores los toman como otro sitio
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/'
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  // Errores que vienen del callback (link vencido, código inválido, etc.)
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('error')
    if (e === 'expired') setError('Ese enlace ya venció. Pide uno nuevo abajo.')
    else if (e === 'invalid') setError('El enlace no es válido. Pide uno nuevo abajo.')
  }, [])

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setSent(false)
  }

  const handlePasswordLogin = async () => {
    if (!email || !password) {
      setError('Escribe tu email y contraseña.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Credenciales inválidas. Revisa tu email y contraseña.'
          : error.message === 'Email not confirmed'
            ? 'Tu email todavía no está confirmado. Entra con enlace mágico o pide que te confirmen la cuenta.'
            : error.message
      )
      setLoading(false)
      return
    }
    router.push(nextPath())
    router.refresh()
  }

  const handleMagicLink = async () => {
    if (!email) {
      setError('Escribe tu email.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`,
        shouldCreateUser: false, // el hub es interno: solo entran cuentas ya creadas
      },
    })
    setLoading(false)
    if (error) {
      setError(
        error.message.toLowerCase().includes('signups not allowed')
          ? 'Ese email no tiene cuenta en el hub. Pide acceso a un admin.'
          : error.message
      )
      return
    }
    setSent(true)
  }

  const submit = () => (mode === 'password' ? handlePasswordLogin() : handleMagicLink())

  return (
    <div className="min-h-dvh bg-bg text-ink flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Marca */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mb-5">
            <svg width="24" height="24" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 9L5 5L7.5 7.5L10 4L13 6.5" stroke="#0a0a0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="11" r="2.5" fill="#0a0a0d" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-800 uppercase tracking-widest leading-none">Epikom</h1>
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-1.5">Hub Interno</p>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6">
          {sent ? (
            /* ---------- Enlace enviado ---------- */
            <div className="text-center py-4">
              <p className="text-2xl mb-3">📬</p>
              <p className="text-sm font-600 mb-1.5">Revisa tu correo</p>
              <p className="text-xs text-muted leading-relaxed mb-5">
                Te mandamos un enlace a <span className="text-ink">{email}</span>. Ábrelo en este
                mismo navegador y entras directo.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-[10px] font-mono text-muted uppercase tracking-widest hover:text-ink transition-colors"
              >
                ← Usar otro email
              </button>
            </div>
          ) : (
            <>
              {/* ---------- Selector de método ---------- */}
              <div className="flex gap-1 p-1 bg-surface2 rounded-lg mb-5" role="tablist">
                {(
                  [
                    ['password', 'Contraseña'],
                    ['magic', 'Enlace mágico'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={mode === key}
                    onClick={() => switchMode(key)}
                    className={`flex-1 text-[10px] font-mono uppercase tracking-widest py-2 rounded-md transition-colors ${
                      mode === key ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="tu@epikom.com"
                    autoComplete="email"
                    className="w-full bg-surface2 border border-line rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50"
                  />
                </div>

                {mode === 'password' && (
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label htmlFor="password" className="text-[10px] font-mono text-muted uppercase tracking-widest">
                        Contraseña
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-[10px] font-mono text-muted uppercase tracking-widest hover:text-primary transition-colors"
                      >
                        ¿La olvidaste?
                      </Link>
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submit()}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full bg-surface2 border border-line rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50"
                    />
                  </div>
                )}

                {mode === 'magic' && (
                  <p className="text-xs text-muted leading-relaxed">
                    Te mandamos un enlace de un solo uso. No necesitas contraseña.
                  </p>
                )}

                {error && (
                  <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  onClick={submit}
                  disabled={loading}
                  className="w-full bg-primary text-bg font-600 text-sm rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 font-body"
                >
                  {loading
                    ? mode === 'password'
                      ? 'Entrando…'
                      : 'Enviando…'
                    : mode === 'password'
                      ? 'Entrar al hub →'
                      : 'Enviar enlace →'}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[10px] font-mono text-muted mt-6 uppercase tracking-widest">
          Epikom Interactive · Bayamón PR
        </p>
      </div>
    </div>
  )
}
