import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, smsTrim } from "@/lib/sms";
import { todayInPR } from "@/lib/tasks";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Cron viernes 5pm hora PR (21:00 UTC, viernes).
 * Por cada miembro del crew con teléfono → SMS con resumen de tareas
 * completadas esta semana.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayInPR();

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

    const { data: weekTasks } = await admin
      .from("tasks")
      .select("id, title, status")
      .in("id", taskIds)
      .eq("week_id", week.id);
    const total = weekTasks?.length ?? 0;
    const completed = (weekTasks ?? []).filter(
      (t) => t.status === "completada"
    );
    const pending = total - completed.length;

    if (total === 0) {
      skipped++;
      continue;
    }

    const firstName = u.name.split(" ")[0];
    const pct = total === 0 ? 0 : Math.round((completed.length / total) * 100);
    const sample = completed
      .slice(0, 3)
      .map((t) => `· ${t.title}`)
      .join(" ");
    const more =
      completed.length > 3 ? ` +${completed.length - 3} más` : "";
    const tail =
      pending > 0
        ? ` Te quedan ${pending} pendiente${pending === 1 ? "" : "s"}.`
        : " ¡Semana cerrada!";
    const body = smsTrim(
      `Epikom Hub · ${firstName}, cerraste ${completed.length}/${total} (${pct}%) esta semana: ${sample}${more}.${tail}`
    );

    const ok = await sendSms(u.phone, body);
    if (ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped, week_id: week.id });
}
