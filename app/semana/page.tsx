import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { WeekKanban } from "@/components/WeekKanban";
import { NotificationsBell } from "@/components/NotificationsBell";
import type { NotificationRow } from "@/app/api/notifications/route";
import {
  formatPrettyDate,
  todayInPR,
  type TaskRow,
  type WeekRow,
} from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function SemanaPage({
  searchParams,
}: {
  searchParams?: { week?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/dashboard");

  const today = todayInPR();
  const requestedWeek = searchParams?.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week)
    ? searchParams.week
    : null;

  // Load the week: either the requested one, or the most recent week that started on or before today.
  let currentWeek: WeekRow | null = null;
  if (requestedWeek) {
    const { data } = await supabase
      .from("weeks")
      .select("id, week_start_date, week_end_date, priorities, deadlines, rotation_national, notes")
      .eq("week_start_date", requestedWeek)
      .maybeSingle<WeekRow>();
    currentWeek = data ?? null;
  }
  if (!currentWeek) {
    const { data } = await supabase
      .from("weeks")
      .select("id, week_start_date, week_end_date, priorities, deadlines, rotation_national, notes")
      .lte("week_start_date", today)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle<WeekRow>();
    currentWeek = data ?? null;
  }

  // Neighbor weeks for prev/next nav
  let prevWeekStart: string | null = null;
  let nextWeekStart: string | null = null;
  if (currentWeek) {
    const [{ data: prev }, { data: next }] = await Promise.all([
      supabase
        .from("weeks")
        .select("week_start_date")
        .lt("week_start_date", currentWeek.week_start_date)
        .order("week_start_date", { ascending: false })
        .limit(1)
        .maybeSingle<{ week_start_date: string }>(),
      supabase
        .from("weeks")
        .select("week_start_date")
        .gt("week_start_date", currentWeek.week_start_date)
        .order("week_start_date", { ascending: true })
        .limit(1)
        .maybeSingle<{ week_start_date: string }>(),
    ]);
    prevWeekStart = prev?.week_start_date ?? null;
    nextWeekStart = next?.week_start_date ?? null;
  }

  const { data: notifData } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, unread, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const notifications = (notifData ?? []) as NotificationRow[];

  let tasks: TaskRow[] = [];
  let priorPending: TaskRow[] = [];
  if (currentWeek) {
    const { data } = await supabase
      .from("tasks")
      .select(
        "id, title, description, due_date, due_time, task_type, priority, status, notion_url, context, completed_at, user_note, task_clients(client_name)"
      )
      .eq("assigned_to", profile.id)
      .eq("week_id", currentWeek.id)
      .order("due_date", { ascending: true })
      .order("priority", { ascending: true })
      .returns<TaskRow[]>();
    tasks = data ?? [];

    // Roll-over strip only makes sense when looking at the live week.
    const isLiveWeek =
      currentWeek.week_start_date <= today &&
      today <= currentWeek.week_end_date;
    if (isLiveWeek) {
      const { data: prior } = await supabase
        .from("tasks")
        .select(
          "id, title, description, due_date, due_time, task_type, priority, status, notion_url, context, completed_at, user_note, task_clients(client_name)"
        )
        .eq("assigned_to", profile.id)
        .neq("week_id", currentWeek.id)
        .neq("status", "completada")
        .lt("due_date", currentWeek.week_start_date)
        .order("due_date", { ascending: true })
        .limit(30)
        .returns<TaskRow[]>();
      priorPending = prior ?? [];
    }
  }

  const completed = tasks.filter((t) => t.status === "completada").length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  // rotation_national is keyed by first-name lowercase (e.g. { "laura": "Shoppers + Digo pauta" })
  const firstName = profile.name.split(" ")[0];
  const slug = firstName.toLowerCase();
  const rotationBlock =
    currentWeek?.rotation_national?.[slug] ??
    currentWeek?.rotation_national?.[firstName] ??
    null;

  const rangeLabel = currentWeek
    ? `${formatPrettyDate(currentWeek.week_start_date)
        .replace(/,.*/, "")
        .trim()} al ${formatPrettyDate(currentWeek.week_end_date)
        .replace(/,.*/, "")
        .trim()}`
    : "";

  const isLive =
    !!currentWeek &&
    currentWeek.week_start_date <= today &&
    today <= currentWeek.week_end_date;
  const isFuture = !!currentWeek && currentWeek.week_start_date > today;
  const isPast = !!currentWeek && currentWeek.week_end_date < today;

  return (
    <AppShell role={profile.role} firstName={firstName}>
      <main className="px-4 py-6 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div
                className="mb-2 text-xs uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
              >
                Mi semana
              </div>
              <h1
                className="text-3xl font-semibold sm:text-4xl"
                style={{ letterSpacing: "-0.02em", color: "var(--text)" }}
              >
                {currentWeek ? `Semana del ${rangeLabel}` : "Tu semana"}
              </h1>
              {currentWeek && (
                <p
                  className="mt-2 text-sm tnum"
                  style={{ color: "var(--text-3)" }}
                >
                  {completed}/{total} completadas · {pct}% del total
                </p>
              )}
            </div>

            {/* Week nav */}
            <div className="flex items-center gap-2">
              <NavArrow
                href={prevWeekStart ? `/semana?week=${prevWeekStart}` : null}
                label="Semana anterior"
                dir="prev"
              />
              {isLive ? (
                <span
                  className="rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: "var(--brand-turquesa-soft)",
                    color: "var(--brand-turquesa-ink)",
                    letterSpacing: "0.02em",
                  }}
                >
                  Esta semana
                </span>
              ) : (
                <Link
                  href="/semana"
                  className="rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: "var(--bg-2)",
                    color: "var(--text-2)",
                    border: "1px solid var(--border)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {isPast ? "Volver a hoy" : isFuture ? "Volver a hoy" : "Hoy"}
                </Link>
              )}
              <NavArrow
                href={nextWeekStart ? `/semana?week=${nextWeekStart}` : null}
                label="Semana siguiente"
                dir="next"
              />
              <div className="ml-2">
                <NotificationsBell initial={notifications} />
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-medium"
                style={{ color: "var(--text-2)" }}
              >
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
            </div>
          </div>

          {!currentWeek && (
            <div
              className="rounded-lg border border-dashed p-6 text-center text-sm"
              style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
            >
              No hay semana cargada.
            </div>
          )}

          {currentWeek && !isLive && (
            <div
              className="mb-6 rounded-md p-3 text-xs"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
              }}
            >
              {isPast
                ? "Estás viendo una semana pasada en modo consulta. Puedes editar tareas, pero el contexto es histórico."
                : "Estás viendo una semana futura. Todavía no ha llegado."}
            </div>
          )}

          {currentWeek && (
            <WeekKanban
              tasks={tasks}
              priorPending={priorPending}
              weekId={currentWeek.id}
              weekStart={currentWeek.week_start_date}
              weekEnd={currentWeek.week_end_date}
              today={today}
              rotationBlock={rotationBlock}
              rotationLabel={rangeLabel}
            />
          )}
        </div>
      </main>
    </AppShell>
  );
}

function NavArrow({
  href,
  label,
  dir,
}: {
  href: string | null;
  label: string;
  dir: "prev" | "next";
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  if (!href) {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        className="grid h-9 w-9 place-items-center rounded-md transition"
        style={{
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--text-3)",
          opacity: 0.4,
          cursor: "not-allowed",
        }}
      >
        <Icon size={16} />
      </button>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-md transition"
      style={{
        border: "1px solid var(--border)",
        background: "var(--bg)",
        color: "var(--text-2)",
      }}
    >
      <Icon size={16} />
    </Link>
  );
}
