'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setError('Escribe tu email y contraseña.'); return }
    setLoading(true)
    setError(null)
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

  return (
    <div className="min-h-dvh bg-bg text-ink flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Marca */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mb-5">
            <svg width="24" height="24" viewBox="0 0 14 14" fill="none">
              <path d="M2 9L5 5L7.5 7.5L10 4L13 6.5" stroke="#0a0a0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="11" r="2.5" fill="#0a0a0d" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-800 uppercase tracking-widest leading-none">Epikom</h1>
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-1.5">Hub Interno</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-line rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="tu@epikom.com"
              autoComplete="email"
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-primary text-bg font-600 text-sm rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 font-body"
          >
            {loading ? 'Entrando…' : 'Entrar al hub →'}
          </button>
        </div>

        <p className="text-center text-[10px] font-mono text-muted mt-6 uppercase tracking-widest">
          Epikom Interactive · Bayamón PR
        </p>
      </div>
    </div>
  )
}
