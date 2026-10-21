import "server-only";
import { createClient as createAdmin } from "@supabase/supabase-js";

/**
 * Envío de correos con la cuenta de Gmail conectada al Hub
 * (integration_tokens, provider = 'gmail'; hoy notifications@epikom.com).
 * Usa la API REST de Google directamente: no hace falta la librería googleapis.
 */

export interface InlineImage {
  cid: string;
  filename: string;
  contentType: string;
  data: Buffer;
}

export interface OutgoingMail {
  fromName: string;
  to: { name: string; email: string }[];
  replyTo?: { name: string; email: string };
  subject: string;
  html: string;
  text: string;
  images: InlineImage[];
}

export class GmailNotConnected extends Error {}

/** Token de acceso de Gmail a partir del refresh token guardado */
export async function gmailAccess(): Promise<{ accessToken: string; email: string }> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_SERVICE_ROLE_KEY || !NEXT_PUBLIC_SUPABASE_URL) {
    throw new GmailNotConnected("Faltan las variables de Google o de Supabase en el servidor");
  }

  // El refresh token solo lo puede leer el servidor (service role)
  const admin = createAdmin(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("integration_tokens").select("refresh_token, account_email").eq("provider", "gmail").maybeSingle();
  if (error) throw new Error(`No se pudo leer la conexión de Gmail: ${error.message}`);
  if (!data?.refresh_token || !data.account_email) throw new GmailNotConnected("No hay una cuenta de Gmail conectada al Hub");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json() as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    // invalid_grant = el permiso fue revocado o caducó: hay que reconectar Gmail
    if (json.error === "invalid_grant") throw new GmailNotConnected("La conexión con Gmail caducó; hay que volver a conectarla");
    throw new Error(`Google rechazó el acceso: ${json.error_description ?? json.error ?? res.status}`);
  }
  return { accessToken: json.access_token, email: data.account_email };
}

// ---------------------------------------------------------------------------
// MIME
// ---------------------------------------------------------------------------

/** Nada de saltos de línea en encabezados (evita inyectar encabezados) */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

/** Encabezado con acentos: =?UTF-8?B?...?= */
const encodeWord = (s: string) =>
  /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;

const address = (a: { name: string; email: string }) =>
  a.name ? `${encodeWord(`"${oneLine(a.name).replace(/"/g, "'")}"`)} <${oneLine(a.email)}>` : `<${oneLine(a.email)}>`;

const base64Lines = (b: Buffer) => b.toString("base64").replace(/.{76}/g, "$&\r\n");

export function buildMime(mail: OutgoingMail, fromEmail: string): string {
  const id = Math.random().toString(36).slice(2);
  const related = `rel_${id}`;
  const alternative = `alt_${id}`;
  const lines: string[] = [
    `From: ${address({ name: mail.fromName, email: fromEmail })}`,
    `To: ${mail.to.map(address).join(", ")}`,
    ...(mail.replyTo ? [`Reply-To: ${address(mail.replyTo)}`] : []),
    `Subject: ${encodeWord(oneLine(mail.subject))}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${related}"`,
    "",
    `--${related}`,
    `Content-Type: multipart/alternative; boundary="${alternative}"`,
    "",
    `--${alternative}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(Buffer.from(mail.text, "utf8")),
    `--${alternative}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(Buffer.from(mail.html, "utf8")),
    `--${alternative}--`,
  ];
  for (const img of mail.images) {
    const name = oneLine(img.filename).replace(/"/g, "");
    lines.push(
      `--${related}`,
      `Content-Type: ${img.contentType}; name="${name}"`,
      "Content-Transfer-Encoding: base64",
      `Content-ID: <${img.cid}>`,
      `Content-Disposition: inline; filename="${name}"`,
      "",
      base64Lines(img.data),
    );
  }
  lines.push(`--${related}--`, "");
  return lines.join("\r\n");
}

export async function sendGmail(mail: OutgoingMail): Promise<{ id: string; from: string }> {
  const { accessToken, email } = await gmailAccess();
  const raw = Buffer.from(buildMime(mail, email), "utf8").toString("base64url");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  const json = await res.json() as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) throw new Error(`Gmail no envió el correo: ${json.error?.message ?? res.status}`);
  return { id: json.id, from: email };
}
