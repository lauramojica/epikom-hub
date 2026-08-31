import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";

/** Cliente admin (service role) para insertar notificaciones a otros usuarios */
function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function personalize(text: string, name: string, pending: number) {
  return text
    .replace(/\{nombre\}/g, name.split(" ")[0])
    .replace(/\{pendientes\}/g, String(pending));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Solo admins pueden enviar
  const { data: me } = await supabase.from("users").select("role, name").eq("id", user.id).single();
  if (!me || !["admin", "superadmin"].includes(me.role)) {
    return NextResponse.json({ error: "Solo admins pueden enviar mensajes" }, { status: 403 });
  }

  const body = await request.json();
  const { subject, message, recipientIds, channels, templateKey, pendingByUser = {} } = body as {
    subject: string; message: string; recipientIds: string[];
    channels: string[]; templateKey?: string; pendingByUser?: Record<string, number>;
  };

  if (!subject?.trim() || !message?.trim() || !recipientIds?.length) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const admin = adminClient();

  // Destinatarios con sus preferencias
  const { data: recipients } = await admin
    .from("users")
    .select("id, name, email, notif_email, notif_push")
    .in("id", recipientIds);

  if (!recipients?.length) {
    return NextResponse.json({ error: "Destinatarios no encontrados" }, { status: 400 });
  }

  // Registrar el mensaje
  const { data: msgRow } = await admin.from("hub_messages").insert({
    subject, body: message, sender_id: user.id,
    recipient_ids: recipientIds, template_key: templateKey ?? "custom",
    channels,
  }).select().single();

  const results = { hub: 0, email: 0, push: 0, failed: 0 };
  const deliveries: Record<string, unknown>[] = [];

  // ── 1. Notificaciones dentro del Hub ──
  if (channels.includes("hub")) {
    const notifs = recipients.map((r) => ({
      user_id: r.id,
      type: "message",
      priority: "medium",
      title: personalize(subject, r.name ?? r.email, pendingByUser[r.id] ?? 0),
      message: personalize(message, r.name ?? r.email, pendingByUser[r.id] ?? 0),
      read: false,
    }));
    const { error } = await admin.from("notifications").insert(notifs);
    if (!error) results.hub = notifs.length;
  }

  // ── 2. Push ──
  const diagnostics: string[] = [];
  if (channels.includes("push")) {
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;
    if (!pubKey || !privKey) {
      diagnostics.push("Faltan las claves VAPID en el servidor");
    }
    if (pubKey && privKey) {
      webpush.setVapidDetails(
        `mailto:${process.env.VAPID_SUBJECT ?? "laura@epikom.com"}`,
        pubKey, privKey
      );
      const pushable = recipients.filter((r) => r.notif_push !== false);
      const { data: subs, error: subsErr } = await admin
        .from("push_subscriptions")
        .select("*")
        .in("user_id", pushable.map((r) => r.id));

      if (subsErr) diagnostics.push(`Error leyendo suscripciones: ${subsErr.message}`);
      if (!subs?.length) {
        diagnostics.push("Nadie tiene notificaciones activadas en un dispositivo");
      }

      for (const sub of subs ?? []) {
        const r = recipients.find((x) => x.id === sub.user_id);
        if (!r) continue;
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: personalize(subject, r.name ?? r.email, pendingByUser[r.id] ?? 0),
              body: personalize(message, r.name ?? r.email, pendingByUser[r.id] ?? 0).slice(0, 160),
              url: "/",
            })
          );
          results.push++;
          deliveries.push({ message_id: msgRow?.id, user_id: r.id, channel: "push", status: "sent" });
        } catch (err: unknown) {
          const e = err as { statusCode?: number; message?: string };
          // 404/410 = suscripción muerta, la limpiamos
          if (e.statusCode === 404 || e.statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          results.failed++;
          deliveries.push({ message_id: msgRow?.id, user_id: r.id, channel: "push", status: "failed", error: e.message ?? "error" });
        }
      }
    }
  }

  // ── 3. Email (vía Resend si hay key; si no, se omite) ──
  if (channels.includes("email")) {
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "Epikom Hub <hub@epikominteractive.com>";
    const emailable = recipients.filter((r) => r.notif_email !== false && r.email);

    for (const r of emailable) {
      const subj = personalize(subject, r.name ?? r.email, pendingByUser[r.id] ?? 0);
      const text = personalize(message, r.name ?? r.email, pendingByUser[r.id] ?? 0);
      if (!resendKey) {
        deliveries.push({ message_id: msgRow?.id, user_id: r.id, channel: "email", status: "skipped", error: "Sin RESEND_API_KEY" });
        continue;
      }
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from, to: r.email, subject: subj,
            html: emailTemplate(subj, text),
          }),
        });
        if (res.ok) {
          results.email++;
          deliveries.push({ message_id: msgRow?.id, user_id: r.id, channel: "email", status: "sent" });
        } else {
          results.failed++;
          deliveries.push({ message_id: msgRow?.id, user_id: r.id, channel: "email", status: "failed", error: await res.text() });
        }
      } catch (err: unknown) {
        results.failed++;
        deliveries.push({ message_id: msgRow?.id, user_id: r.id, channel: "email", status: "failed", error: String(err) });
      }
    }
  }

  if (deliveries.length) await admin.from("message_deliveries").insert(deliveries);

  return NextResponse.json({ ok: true, results, diagnostics });
}

/** Plantilla de email en el look del Hub */
function emailTemplate(subject: string, body: string) {
  const paragraphs = body.split("\n").filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#3f4451;font-size:15px;">${escapeHtml(p)}</p>`)
    .join("");
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dde0e5;">
        <tr><td style="background:#0a0a0d;padding:20px 28px;">
          <span style="color:#dbfa45;font-size:18px;font-weight:800;letter-spacing:0.12em;">EPIKOM</span>
          <span style="color:#8b93a1;font-size:10px;letter-spacing:0.16em;margin-left:8px;">HUB INTERNO</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 18px;font-size:20px;color:#101114;font-weight:700;">${escapeHtml(subject)}</h1>
          ${paragraphs}
          <a href="https://hub.epikom.com" style="display:inline-block;margin-top:10px;background:#1e9a80;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;">Abrir el Hub →</a>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #eceef1;">
          <p style="margin:0;font-size:11px;color:#8b93a1;">Epikom Interactive · Bayamón, Puerto Rico</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c)
  );
}
