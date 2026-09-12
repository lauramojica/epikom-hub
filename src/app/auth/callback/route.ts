import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Punto de aterrizaje de todos los enlaces que Supabase manda por email:
 * magic link, recuperación de contraseña e invitaciones.
 *
 * Soporta los dos formatos de plantilla de Supabase:
 *   - PKCE:      /auth/callback?code=...
 *   - token_hash: /auth/callback?token_hash=...&type=recovery
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  // Solo aceptamos rutas internas: evita redirecciones a dominios ajenos.
  const nextParam = url.searchParams.get('next') ?? '/'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  // Detrás del proxy de Vercel, el host real viene en x-forwarded-host.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const origin = isLocal || !forwardedHost ? url.origin : `https://${forwardedHost}`

  const fail = (reason: 'expired' | 'invalid') =>
    NextResponse.redirect(`${origin}/login?error=${reason}`)

  // Supabase puede devolver el error directamente en el query string.
  const errorCode = url.searchParams.get('error_code') ?? url.searchParams.get('error')
  if (errorCode) {
    return fail(errorCode.includes('expired') ? 'expired' : 'invalid')
  }

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return fail(error.message.toLowerCase().includes('expired') ? 'expired' : 'invalid')
    return NextResponse.redirect(`${origin}${next}`)
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) return fail(error.message.toLowerCase().includes('expired') ? 'expired' : 'invalid')
    // En recuperación mandamos siempre a poner contraseña nueva.
    const target = type === 'recovery' ? '/reset-password' : next
    return NextResponse.redirect(`${origin}${target}`)
  }

  return fail('invalid')
}
