import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, smsTrim } from "@/lib/sms";
import { todayInPR } from "@/lib/tasks";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Cron lunes 8am hora PR (12:00 UTC, lunes).
 * Por cada miembro del crew con teléfono → SMS con tareas pendientes
 * (no completadas) para esta semana.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayInPR();

  // Semana actual = la que cubre hoy
  const { data: week } = await admin
    .from("weeks")
    .select("id, week_start_date, week_end_date")
    .lte("week_start_date", today)
    .gte("week_end_date", today)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!week) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      reason: "no week covering today",
    });
  }

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

    const { data: pending } = await admin
      .from("tasks")
      .select("id, title, due_date, due_time")
      .in("id", taskIds)
      .eq("week_id", week.id)
      .neq("status", "completada")
      .order("due_date", { ascending: true })
      .order("due_time", { ascending: true });

    if (!pending || pending.length === 0) {
      skipped++;
      continue;
    }

    const firstName = u.name.split(" ")[0];
    const sample = pending
      .slice(0, 3)
      .map((t) => {
        const dd = t.due_date.split("-").slice(1).reverse().join("/");
        return `· ${t.title} (${dd})`;
      })
      .join(" ");
    const more =
      pending.length > 3 ? ` +${pending.length - 3} más` : "";
    const body = smsTrim(
      `Epikom Hub · ${firstName}, esta semana tienes ${pending.length} tarea${
        pending.length === 1 ? "" : "s"
      } pendiente${pending.length === 1 ? "" : "s"}: ${sample}${more}. hub.epikom.com/semana`
    );

    const ok = await sendSms(u.phone, body);
    if (ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped, week_id: week.id });
}
