import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;

function configureOnce() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:laura@epikom.com";
  if (!pub || !priv) {
    console.warn("[push] VAPID keys missing; skipping push");
    return false;
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string; // dónde abre al hacer click
  tag?: string; // agrupar / reemplazar notifs del mismo tag
};

/**
 * Envía push a TODAS las suscripciones de los user_ids dados.
 * Si una suscripción está expirada (410) la borra automáticamente.
 * Best-effort: no rompe el flujo si falla.
 */
export async function pushToUsers(userIds: string[], payload: PushPayload) {
  if (!configureOnce()) return { sent: 0, removed: 0 };
  if (userIds.length === 0) return { sent: 0, removed: 0 };

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return { sent: 0, removed: 0 };

  const json = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          json
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          expiredIds.push(s.id);
        } else {
          console.error("[push] send failed", err);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
    removed = expiredIds.length;
  }

  return { sent, removed };
}
