import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { oauthClient, adminDb } from "@/lib/gmail";

export const dynamic = "force-dynamic";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];

/**
 * GET sin code  → arranca el flujo de autorización
 * GET con code  → Google devuelve aquí; guardamos el refresh token
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/?email_setup=denied`);
  }

  // ── Paso 2: Google nos devolvió el código ──
  if (code) {
    try {
      const auth = oauthClient(origin);
      const { tokens } = await auth.getToken(code);

      if (!tokens.refresh_token) {
        // Ya estaba autorizado antes; hay que revocar para obtener uno nuevo
        return NextResponse.redirect(`${origin}/?email_setup=no_refresh_token`);
      }

      // Averiguar de qué cuenta es
      auth.setCredentials(tokens);
      const { google } = await import("googleapis");
      const profile = await google.gmail({ version: "v1", auth }).users.getProfile({ userId: "me" });

      const db = adminDb();
      await db.from("integration_tokens").upsert({
        provider: "gmail",
        refresh_token: tokens.refresh_token,
        account_email: profile.data.emailAddress,
        connected_at: new Date().toISOString(),
      }, { onConflict: "provider" });

      return NextResponse.redirect(`${origin}/?email_setup=ok`);
    } catch (e) {
      console.error("OAuth error:", e);
      return NextResponse.redirect(`${origin}/?email_setup=error`);
    }
  }

  // ── Paso 1: iniciar autorización (solo admins) ──
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  const { data: role } = await supabase.from("hub_roles").select("permissions").eq("key", me?.role ?? "").single();
  if (!(role?.permissions as Record<string, boolean>)?.["workshop.manage"]) {
    return NextResponse.json({ error: "Solo un admin puede conectar el correo" }, { status: 403 });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: "Falta configurar GOOGLE_CLIENT_ID" }, { status: 500 });
  }

  const auth = oauthClient(origin);
  const url = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",          // fuerza refresh_token aunque ya haya autorizado
    scope: SCOPES,
  });

  return NextResponse.redirect(url);
}

/** Desconectar la cuenta */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = adminDb();
  await db.from("integration_tokens").delete().eq("provider", "gmail");
  return NextResponse.json({ ok: true });
}
