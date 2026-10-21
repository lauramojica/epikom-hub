import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendGmail, GmailNotConnected, type InlineImage } from "@/lib/gmail-send";
import { rowHtml, emailLayout, plainText, type EmailRow } from "@/hub/reportes/emailReport";
import type { ReportColumn } from "@/hub/reportes/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_SRC = /src="\/api\/reportes\/media\/([0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,5})"/gi;
// Gmail admite 25 MB por mensaje; en base64 todo pesa ~33 % más
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/**
 * Envía uno o varios reportes por correo a personas del Hub.
 * Todo se lee con la sesión de quien envía: el RLS decide qué puede mandar.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    tableId?: string; rowIds?: string[]; recipientIds?: string[]; message?: string;
  } | null;
  const tableId = body?.tableId ?? "";
  const rowIds = (body?.rowIds ?? []).filter((id) => UUID.test(id));
  const recipientIds = [...new Set((body?.recipientIds ?? []).filter((id) => UUID.test(id)))];
  const message = String(body?.message ?? "").slice(0, 2000);

  if (!UUID.test(tableId) || rowIds.length === 0) return NextResponse.json({ error: "No hay reportes para enviar" }, { status: 400 });
  if (rowIds.length > 50) return NextResponse.json({ error: "Máximo 50 reportes por correo" }, { status: 400 });
  if (recipientIds.length === 0) return NextResponse.json({ error: "Elige al menos una persona" }, { status: 400 });
  if (recipientIds.length > 10) return NextResponse.json({ error: "Máximo 10 personas por envío" }, { status: 400 });

  const [{ data: table }, { data: rows }, { data: people }] = await Promise.all([
    supabase.from("report_tables").select("id, name, space_id, columns").eq("id", tableId).maybeSingle(),
    supabase.from("report_rows").select("id, title, values, content").eq("table_id", tableId).in("id", rowIds),
    supabase.from("users").select("id, name, email, role"),
  ]);
  if (!table) return NextResponse.json({ error: "Tabla no encontrada o sin acceso" }, { status: 404 });
  if (!rows?.length) return NextResponse.json({ error: "Reportes no encontrados o sin acceso" }, { status: 404 });

  // Solo personas del Hub: el Hub no sirve para escribirle a cualquier dirección
  const recipients = (people ?? []).filter((p) => recipientIds.includes(p.id) && p.email);
  if (recipients.length !== recipientIds.length) {
    return NextResponse.json({ error: "Alguna de las personas no existe en el Hub" }, { status: 400 });
  }
  const me = (people ?? []).find((p) => p.id === user.id);
  const senderName = me?.name || me?.email || user.email || "Epikom Hub";
  const peopleNames = Object.fromEntries((people ?? []).map((p) => [p.id, p.name || p.email]));

  const { data: space } = await supabase.from("report_spaces").select("name").eq("id", table.space_id).maybeSingle();
  const columns = (table.columns ?? []) as ReportColumn[];
  const ordered = rowIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as EmailRow[];

  // Contenido + capturas incrustadas (se descargan con la sesión del que envía)
  const images: InlineImage[] = [];
  const cidByPath = new Map<string, string>();
  let imageBytes = 0;
  let skipped = 0;
  const blocks: string[] = [];
  for (const row of ordered) {
    let html = rowHtml(row, columns, peopleNames);
    for (const [, path] of [...html.matchAll(MEDIA_SRC)]) {
      if (cidByPath.has(path) || imageBytes >= MAX_IMAGE_BYTES) continue;
      const { data: file } = await supabase.storage.from("report-media").download(path);
      if (!file) continue;
      const data = Buffer.from(await file.arrayBuffer());
      if (imageBytes + data.length > MAX_IMAGE_BYTES) { skipped++; continue; }
      imageBytes += data.length;
      const cid = `img${images.length}@epikom-hub`;
      images.push({ cid, filename: path.split("/")[1], contentType: file.type || "image/png", data });
      cidByPath.set(path, cid);
    }
    html = html.replace(MEDIA_SRC, (m, path: string) => {
      const cid = cidByPath.get(path);
      return cid ? `src="cid:${cid}"` : m;
    });
    // Imágenes que no entraron: un aviso en su lugar
    html = html.replace(/<img[^>]*src="\/api\/reportes\/media\/[^"]*"[^>]*>/g,
      '<p style="margin:6px 0;color:#6b7280;font-size:13px">[Imagen omitida por tamaño: ábrela en el Hub]</p>');
    blocks.push(html);
  }

  const separator = '<div style="height:1px;background:#dde0e5;margin:30px 0"></div>';
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const hubUrl = `${origin}/reportes/imprimir?table=${table.id}&rows=${ordered.map((r) => r.id).join(",")}&auto=0`;
  const heading = [space?.name, table.name].filter(Boolean).join(" · ");
  const subject = ordered.length === 1
    ? `${table.name}: ${ordered[0].title || "Sin título"}`
    : `${table.name}: ${ordered.length} reportes`;

  try {
    const sent = await sendGmail({
      fromName: `${senderName} vía Epikom Hub`,
      to: recipients.map((r) => ({ name: r.name ?? "", email: r.email })),
      replyTo: me?.email ? { name: senderName, email: me.email } : undefined,
      subject,
      html: emailLayout({ heading, senderName, message, body: blocks.join(separator), hubUrl }),
      text: plainText(ordered, columns, peopleNames, message, hubUrl),
      images,
    });

    // Registro (si la tabla de registro aún no existe, no impide el envío)
    await supabase.from("report_email_log").insert({
      table_id: table.id, row_ids: ordered.map((r) => r.id),
      recipients: recipients.map((r) => r.email), subject, gmail_id: sent.id,
    });

    return NextResponse.json({ ok: true, to: recipients.map((r) => r.name || r.email), from: sent.from, skippedImages: skipped });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error("Envío de reporte:", msg);
    return NextResponse.json({ error: msg }, { status: e instanceof GmailNotConnected ? 503 : 502 });
  }
}
