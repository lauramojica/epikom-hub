import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, smsTrim } from "@/lib/sms";
import { todayInPR } from "@/lib/tasks";

export const dynamic = "force-dynamic";

/**
 * Cron diario (Vercel Cron): a las 8am hora Puerto Rico (12:00 UTC).
 * Envía a cada miembro del crew con teléfono un SMS digest de:
 *   - Tareas de HOY no completadas
 *   - Tareas de MAÑANA
 *
 * Auth: requiere header `Authorization: Bearer ${CRON_SECRET}`.
 * Vercel Cron lo añade automáticamente cuando configuras CRON_SECRET en env.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayInPR();
  // Calcular "mañana" en hora PR (UTC-4)
  const tomorrow = (() => {
    const [y, m, d] = today.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    return dt.toISOString().slice(0, 10);
  })();

  const { data: users } = await admin
    .from("users")
    .select("id, name, phone, sms_daily_digest")
    .not("phone", "is", null);

  let sent = 0;
  let skipped = 0;

  for (const u of users ?? []) {
    if (!u.sms_daily_digest || !u.phone) {
      skipped++;
      continue;
    }

    const { data: assignments } = await admin
      .from("task_assignees")
      .select("task_id")
      .eq("user_id", u.id);
    const taskIds = (assignments ?? []).map((r) => r.task_id);
    if (taskIds.length === 0) {
      skipped++;
      continue;
    }

    const { data: tasks } = await admin
      .from("tasks")
      .select("id, title, due_date, due_time, status")
      .in("id", taskIds)
      .neq("status", "completada")
      .in("due_date", [today, tomorrow])
      .order("due_date", { ascending: true })
      .order("due_time", { ascending: true });

    const todayTasks = (tasks ?? []).filter((t) => t.due_date === today);
    const tomorrowTasks = (tasks ?? []).filter(
      (t) => t.due_date === tomorrow
    );

    if (todayTasks.length === 0 && tomorrowTasks.length === 0) {
      skipped++;
      continue;
    }

    const firstName = u.name.split(" ")[0];
    const parts: string[] = [`Hola ${firstName}, tu día en Epikom Hub:`];

    if (todayTasks.length > 0) {
      const titles = todayTasks
        .slice(0, 3)
        .map((t) => `· ${t.title}${t.due_time ? ` (${t.due_time.slice(0, 5)})` : ""}`)
        .join(" ");
      const more =
        todayTasks.length > 3 ? ` +${todayTasks.length - 3} más` : "";
      parts.push(`HOY (${todayTasks.length}): ${titles}${more}`);
    } else {
      parts.push("HOY: nada pendiente.");
    }

    if (tomorrowTasks.length > 0) {
      parts.push(
        `MAÑANA: ${tomorrowTasks.length} tarea${tomorrowTasks.length === 1 ? "" : "s"}.`
      );
    }

    const body = smsTrim(parts.join(" "));
    const ok = await sendSms(u.phone, body);
    if (ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped, today, tomorrow });
}
