import { google } from "googleapis";
import { createClient as createAdmin } from "@supabase/supabase-js";

export function adminDb() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Cliente OAuth de Google configurado con las credenciales del Hub */
export function oauthClient(origin?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://hub.epikom.com"}/api/email/oauth`
  );
}

/** Recupera el refresh token guardado y devuelve un cliente listo para usar */
export async function gmailClient() {
  const db = adminDb();
  const { data } = await db
    .from("integration_tokens")
    .select("refresh_token")
    .eq("provider", "gmail")
    .maybeSingle();

  if (!data?.refresh_token) return null;

  const auth = oauthClient();
  auth.setCredentials({ refresh_token: data.refresh_token });
  return google.gmail({ version: "v1", auth });
}

/** Decodifica base64url de Gmail */
export function decodeB64(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

/** Extrae el cuerpo de texto de un mensaje de Gmail */
export function extractBody(payload: Record<string, unknown>): string {
  const mime = payload?.mimeType as string;
  const body = payload?.body as { data?: string } | undefined;
  const parts = payload?.parts as Record<string, unknown>[] | undefined;

  if (mime === "text/plain" && body?.data) return decodeB64(body.data);

  if (parts?.length) {
    // Preferir texto plano
    for (const p of parts) {
      if (p.mimeType === "text/plain" && (p.body as { data?: string })?.data) {
        return decodeB64((p.body as { data: string }).data);
      }
    }
    // Buscar en multipart anidado
    for (const p of parts) {
      const nested = extractBody(p);
      if (nested) return nested;
    }
    // Último recurso: HTML convertido a texto
    for (const p of parts) {
      if (p.mimeType === "text/html" && (p.body as { data?: string })?.data) {
        return htmlToText(decodeB64((p.body as { data: string }).data));
      }
    }
  }

  if (mime === "text/html" && body?.data) return htmlToText(decodeB64(body.data));
  return "";
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Quita la parte citada de una respuesta de email.
 * Sin esto, cada comentario arrastraría todo el hilo anterior.
 */
export function stripQuotedReply(text: string): string {
  const markers = [
    /^On .+ wrote:$/m,                        // Gmail inglés
    /^El .+ escribió:$/m,                     // Gmail español
    /^-{2,}\s*Mensaje original\s*-{2,}/im,
    /^-{2,}\s*Original Message\s*-{2,}/im,
    /^_{10,}/m,                               // Outlook
    /^De:\s.+$/m,                             // Outlook español
    /^From:\s.+$/m,                           // Outlook inglés
    /^Enviado desde mi /im,
    /^Sent from my /im,
  ];

  let cut = text.length;
  for (const re of markers) {
    const m = text.match(re);
    if (m?.index !== undefined && m.index < cut) cut = m.index;
  }

  let body = text.slice(0, cut);

  // Quitar líneas que empiezan con ">"
  body = body
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n");

  return body.trim();
}

/** Lee un header específico del mensaje */
export function header(headers: { name?: string | null; value?: string | null }[], name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Extrae el email limpio de un header tipo "Nombre <correo@dominio.com>" */
export function parseEmail(raw: string): string {
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

/**
 * Del destinatario extrae el token de enrutado.
 * notifications+sedco-a4f2@epikom.com  →  "sedco-a4f2"
 */
export function parseRoutingToken(toHeader: string): string | null {
  // Puede haber varios destinatarios
  const candidates = toHeader.split(",").map((s) => parseEmail(s));
  for (const addr of candidates) {
    const m = addr.match(/^[^+]+\+([^@]+)@/);
    if (m) return m[1].toLowerCase();
  }
  return null;
}
