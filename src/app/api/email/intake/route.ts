import { NextResponse, type NextRequest } from "next/server";
import {
  gmailClient, adminDb, extractBody, stripQuotedReply,
  header, parseEmail, parseRoutingToken, decodeB64,
} from "@/lib/gmail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Revisa la bandeja y convierte correos en tareas o comentarios.
 * Lo llama el cron de Vercel cada minuto, o un admin manualmente.
 */
export async function GET(request: NextRequest) {
  // El cron de Vercel manda este header; también aceptamos un secreto propio
  const isCron = request.headers.get("user-agent")?.includes("vercel-cron");
  const secret = new URL(request.url).searchParams.get("secret");
  const authorized = isCron || (process.env.CRON_SECRET && secret === process.env.CRON_SECRET);

  if (!authorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return await processInbox();
}

async function processInbox() {
  const gmail = await gmailClient();
  if (!gmail) {
    return NextResponse.json({ error: "Gmail no está conectado", processed: 0 }, { status: 200 });
  }

  const db = adminDb();
  const results = { tasks: 0, comments: 0, skipped: 0, errors: 0 };
  const details: string[] = [];

  // Solo correos no leídos dirigidos a nuestra dirección de intake
  const inbox = process.env.EMAIL_INTAKE_ADDRESS ?? "notifications@epikom.com";
  const localPart = inbox.split("@")[0];

  // Busca tanto las direcciones con token (+algo) como la genérica
  const list = await gmail.users.messages.list({
    userId: "me",
    q: `is:unread (to:${localPart}@ OR to:${localPart}+) -from:me`,
    maxResults: 20,
  });

  const messages = list.data.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json({ ok: true, ...results, note: "Sin correos nuevos" });
  }

  // Gente autorizada a crear tareas por email (solo el crew)
  const { data: crew } = await db
    .from("users").select("id, email, role");
  const { data: roles } = await db.from("hub_roles").select("key, scope");
  const externalRoles = new Set((roles ?? []).filter(r => r.scope === "own_client").map(r => r.key));
  const allowed = new Map(
    (crew ?? [])
      .filter(u => !externalRoles.has(u.role))
      .map(u => [u.email.toLowerCase(), u.id])
  );

  for (const msgRef of messages) {
    try {
      const { data: msg } = await gmail.users.messages.get({
        userId: "me", id: msgRef.id!, format: "full",
      });

      const headers = msg.payload?.headers ?? [];
      const messageId = header(headers, "Message-ID") || msg.id!;
      const from = parseEmail(header(headers, "From"));
      const to = header(headers, "To") + "," + header(headers, "Delivered-To") + "," + header(headers, "Cc");
      const subject = header(headers, "Subject") || "(sin asunto)";

      // ¿Ya lo procesamos?
      const { data: seen } = await db
        .from("email_intake_log").select("id").eq("message_id", messageId).maybeSingle();
      if (seen) {
        await markRead(gmail, msgRef.id!);
        results.skipped++;
        continue;
      }

      // ¿El remitente es del crew?
      const senderId = allowed.get(from);
      if (!senderId) {
        await db.from("email_intake_log").insert({
          message_id: messageId, from_email: from, to_email: to, subject,
          outcome: "rejected", note: "Remitente no autorizado",
        });
        await markRead(gmail, msgRef.id!);
        results.skipped++;
        details.push(`Rechazado: ${from} no pertenece al crew`);
        continue;
      }

      const token = parseRoutingToken(to);
      const rawBody = extractBody(msg.payload as Record<string, unknown>);
      const body = stripQuotedReply(rawBody);

      // ── ¿Es respuesta a una tarea existente? (token t-xxxxxx) ──
      if (token?.startsWith("t-")) {
        const taskId = await resolveTaskByToken(db, token.slice(2));
        if (taskId) {
          await db.from("hub_comments").insert({
            entity_type: "deliverable",   // las tareas usan este tipo en el board
            entity_id: taskId,
            body: body || "(sin contenido)",
            author_id: senderId,
          });
          await db.from("email_intake_log").insert({
            message_id: messageId, from_email: from, to_email: to, subject,
            outcome: "comment_added", task_id: taskId,
          });
          await markRead(gmail, msgRef.id!);
          results.comments++;
          continue;
        }
      }

      // ── Crear tarea ──
      const { clientId, projectId } = await resolveTarget(db, token);
      const attachments = await downloadAttachments(gmail, msgRef.id!, msg.payload as Record<string, unknown>, db);

      const { data: task, error } = await db.from("hub_tasks").insert({
        title: subject.replace(/^(re|fwd|rv):\s*/i, "").trim().slice(0, 200),
        description: body.slice(0, 5000),
        client_id: clientId,
        project_id: projectId,
        created_by: senderId,
        assignee_id: senderId,       // quien lo manda se la queda por defecto
        source: "email",
        source_email: from,
        source_message_id: messageId,
        attachments,
      }).select().single();

      if (error) throw error;

      await db.from("email_intake_log").insert({
        message_id: messageId, from_email: from, to_email: to, subject,
        outcome: "task_created", task_id: task.id,
      });

      await markRead(gmail, msgRef.id!);
      results.tasks++;
      details.push(`Tarea creada: ${task.title}`);
    } catch (e) {
      console.error("Error procesando mensaje:", e);
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results, details });
}

async function markRead(gmail: NonNullable<Awaited<ReturnType<typeof gmailClient>>>, id: string) {
  await gmail.users.messages.modify({
    userId: "me", id, requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

/** Del token deduce a qué cuenta o proyecto va la tarea */
async function resolveTarget(db: ReturnType<typeof adminDb>, token: string | null) {
  if (!token) return { clientId: null, projectId: null };

  // Formato: slug-token  (ej. sedco-a4f2)
  const parts = token.split("-");
  const shortToken = parts[parts.length - 1];

  const { data: project } = await db
    .from("projects").select("id, client_id").eq("email_token", shortToken).maybeSingle();
  if (project) return { clientId: project.client_id, projectId: project.id };

  const { data: client } = await db
    .from("hub_clients").select("id").eq("email_token", shortToken).maybeSingle();
  if (client) return { clientId: client.id, projectId: null };

  return { clientId: null, projectId: null };
}

/** Busca la tarea por los primeros caracteres de su id */
async function resolveTaskByToken(db: ReturnType<typeof adminDb>, shortId: string) {
  const { data } = await db.from("hub_tasks").select("id").limit(500);
  const match = (data ?? []).find(t => t.id.replace(/-/g, "").startsWith(shortId));
  return match?.id ?? null;
}

/** Baja los adjuntos del correo y los sube a Storage */
async function downloadAttachments(
  gmail: NonNullable<Awaited<ReturnType<typeof gmailClient>>>,
  messageId: string,
  payload: Record<string, unknown>,
  db: ReturnType<typeof adminDb>
) {
  const found: { id: string; name: string; size: number; type: string; url: string; uploadedAt: string }[] = [];

  const collect = (part: Record<string, unknown>): Record<string, unknown>[] => {
    const parts = part?.parts as Record<string, unknown>[] | undefined;
    const body = part?.body as { attachmentId?: string } | undefined;
    const out: Record<string, unknown>[] = [];
    if (body?.attachmentId && part.filename) out.push(part);
    if (parts) parts.forEach(p => out.push(...collect(p)));
    return out;
  };

  for (const part of collect(payload).slice(0, 5)) {
    try {
      const attId = (part.body as { attachmentId: string }).attachmentId;
      const { data } = await gmail.users.messages.attachments.get({
        userId: "me", messageId, id: attId,
      });
      if (!data.data) continue;

      const buffer = Buffer.from(data.data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
      const filename = part.filename as string;
      const ext = filename.split(".").pop() ?? "bin";
      const path = `email/${crypto.randomUUID()}.${ext}`;

      const { error } = await db.storage.from("hub-files").upload(path, buffer, {
        contentType: (part.mimeType as string) ?? "application/octet-stream",
      });
      if (error) continue;

      const { data: pub } = db.storage.from("hub-files").getPublicUrl(path);
      found.push({
        id: crypto.randomUUID(),
        name: filename,
        size: buffer.length,
        type: (part.mimeType as string) ?? "",
        url: pub.publicUrl,
        uploadedAt: new Date().toISOString().slice(0, 10),
      });
    } catch (e) {
      console.error("Error con adjunto:", e);
    }
  }

  return found;
}

/** POST: revisar manualmente desde el Hub */
export async function POST() {
  return await processInbox();
}
