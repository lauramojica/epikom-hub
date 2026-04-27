import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TaskCard } from "@/components/TaskCard";
import { WeeklyContextCard } from "@/components/WeeklyContextCard";
import { WeekProgress } from "@/components/WeekProgress";
import { NewTaskModal } from "@/components/NewTaskModal";
import { NotificationsBell } from "@/components/NotificationsBell";
import { DailyBriefing } from "@/components/DailyBriefing";
import type { NotificationRow } from "@/app/api/notifications/route";
import {
  formatPrettyDate,
  formatDayName,
  todayInPR,
  type TaskRow,
  type WeekRow,
} from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function Dashboard({
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
    .select("id, name, role, slug")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return <NoProfile email={user.email ?? ""} />;
  }

  const today = todayInPR();

  const requestedWeek =
    searchParams?.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week)
      ? searchParams.week
      : null;

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

  const isLive =
    !!currentWeek &&
    currentWeek.week_start_date <= today &&
    today <= currentWeek.week_end_date;
  const isPast = !!currentWeek && currentWeek.week_end_date < today;

  let allTasks: TaskRow[] = [];
  let todayTasks: TaskRow[] = [];
  let restOfWeek: TaskRow[] = [];
  let crewBySlug = new Map<string, string>();
  let crewList: { id: string; name: string; slug: string }[] = [];

  const { data: notifData } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, unread, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const notifications = (notifData ?? []) as NotificationRow[];

  if (currentWeek) {
    // Multi-asignados: traer toda tarea donde el user esté en task_assignees.
    const { data: assignmentRows } = await supabase
      .from("task_assignees")
      .select("task_id")
      .eq("user_id", profile.id);
    const myTaskIds = (assignmentRows ?? []).map(
      (r: { task_id: string }) => r.task_id
    );

    let tasks: TaskRow[] | null = null;
    if (myTaskIds.length > 0) {
      const res = await supabase
        .from("tasks")
        .select(
          "id, title, description, due_date, due_time, task_type, priority, status, notion_url, context, completed_at, user_note, assigned_to, task_clients(client_name), task_assignees(user_id, is_primary, users(id, name, slug))"
        )
        .in("id", myTaskIds)
        .eq("week_id", currentWeek.id)
        .order("due_date", { ascending: true })
        .order("priority", { ascending: true })
        .returns<TaskRow[]>();
      tasks = res.data;
    }

    allTasks = tasks ?? [];
    if (isLive) {
      todayTasks = allTasks.filter((t) => t.due_date === today);
      restOfWeek = allTasks.filter((t) => t.due_date !== today && t.due_date >= today);
    } else {
      todayTasks = [];
      restOfWeek = allTasks;
    }

    const { data: crew } = await supabase
      .from("users")
      .select("id, slug, name")
      .order("name", { ascending: true });
    crewBySlug = new Map((crew ?? []).map((c) => [c.slug, c.name.split(" ")[0]]));
    crewList = crew ?? [];
  }

  const firstName = profile.name.split(" ")[0];
  const completedCount = allTasks.filter((t) => t.status === "completada").length;
  const blockedCount = allTasks.filter((t) => t.status === "bloqueada").length;

  const newTaskModal = currentWeek ? (
    <NewTaskModal
      weekId={currentWeek.id}
      weekStart={currentWeek.week_start_date}
      weekEnd={currentWeek.week_end_date}
      crew={crewList}
      defaultAssigneeId={profile.id}
      defaultDueDate={isLive ? today : currentWeek.week_start_date}
    />
  ) : null;

  return (
    <AppShell role={profile.role} firstName={firstName}>
      <main className="px-4 py-6 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <Header
            name={firstName}
            today={formatPrettyDate(today)}
            notifications={notifications}
            prevWeekStart={prevWeekStart}
            nextWeekStart={nextWeekStart}
            isLive={isLive}
          />

          {currentWeek && !isLive && (
            <div
              className="mt-6 rounded-md p-3 text-xs"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
              }}
            >
              {isPast
                ? `Estás viendo la semana del ${formatPrettyDate(currentWeek.week_start_date)} → ${formatPrettyDate(currentWeek.week_end_date)} en modo consulta.`
                : `Estás viendo la semana del ${formatPrettyDate(currentWeek.week_start_date)} → ${formatPrettyDate(currentWeek.week_end_date)}. Todavía no ha llegado.`}
            </div>
          )}

          {isLive && <DailyBriefing notifications={notifications} />}

          {!currentWeek && (
            <div
              className="mt-8 rounded-lg border border-dashed p-6 text-center text-sm"
              style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
            >
              Todavía no hay semana cargada.
              {profile.role === "admin" && (
                <>
                  {" "}
                  <Link href="/admin/upload" className="underline underline-offset-2">
                    Subir una semana
                  </Link>
                  .
                </>
              )}
            </div>
          )}

          {currentWeek && (
            <>
              <div className="mt-8">
                <WeekProgress
                  completed={completedCount}
                  total={allTasks.length}
                  weekId={currentWeek.id}
                />
              </div>

              {isLive && (
                <>
                  <SectionHeader
                    eyebrow="Hoy"
                    title="Qué haces hoy"
                    meta={`${todayTasks.length} tarea${todayTasks.length === 1 ? "" : "s"} · ${blockedCount} bloqueada${blockedCount === 1 ? "" : "s"}`}
                    action={newTaskModal}
                  />
                  {todayTasks.length === 0 ? (
                    <EmptyState msg="No tienes tareas para hoy. Disfruta." />
                  ) : (
                    <div className="space-y-2">
                      {todayTasks.map((t) => (
                        <TaskCard key={t.id} task={t} />
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="mt-10">
                <WeeklyContextCard week={currentWeek} crewBySlug={crewBySlug} />
              </div>

              <SectionHeader
                eyebrow={isLive ? "Resto de la semana" : "Semana"}
                title={isLive ? "Lo que viene" : "Tareas de la semana"}
                meta={`${restOfWeek.length} tarea${restOfWeek.length === 1 ? "" : "s"}`}
                action={isLive ? undefined : newTaskModal}
              />
              {restOfWeek.length === 0 ? (
                <EmptyState msg={isLive ? "Nada más programado esta semana." : "No hay tareas en esta semana."} />
              ) : (
                <div className="space-y-4">
                  {groupByDay(restOfWeek).map(([day, items]) => (
                    <div key={day}>
                      <div
                        className="mb-2 text-xs font-medium uppercase"
                        style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
                      >
                        {formatDayName(day)} · {formatPrettyDate(day)}
                      </div>
                      <div className="space-y-2">
                        {items.map((t) => (
                          <TaskCard key={t.id} task={t} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function Header({
  name,
  today,
  notifications,
  prevWeekStart,
  nextWeekStart,
  isLive,
}: {
  name: string;
  today: string;
  notifications: NotificationRow[];
  prevWeekStart: string | null;
  nextWeekStart: string | null;
  isLive: boolean;
}) {
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div
          className="mb-2 text-xs uppercase"
          style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
        >
          {today}
        </div>
        <h1
          className="text-3xl sm:text-4xl font-semibold"
          style={{ letterSpacing: "-0.02em", color: "var(--text)" }}
        >
          {greet}, {name}.
        </h1>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <NavArrow
          href={prevWeekStart ? `/dashboard?week=${prevWeekStart}` : null}
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
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{
              background: "var(--bg-2)",
              color: "var(--text-2)",
              border: "1px solid var(--border)",
              letterSpacing: "0.02em",
            }}
          >
            Hoy
          </Link>
        )}
        <NavArrow
          href={nextWeekStart ? `/dashboard?week=${nextWeekStart}` : null}
          label="Semana siguiente"
          dir="next"
        />
        <div className="hidden sm:flex items-center gap-2 ml-2">
          <div
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text-3)",
              minWidth: 220,
            }}
          >
            <Search size={14} />
            <span className="flex-1">Buscar tarea o cliente…</span>
            <kbd
              className="tnum text-[11px]"
              style={{ color: "var(--text-3)" }}
            >
              ⌘K
            </kbd>
          </div>
          <NotificationsBell initial={notifications} />
        </div>
      </div>
    </div>
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
        className="grid h-9 w-9 place-items-center rounded-md"
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

function SectionHeader({
  eyebrow,
  title,
  meta,
  action,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-10 mb-4 flex items-end justify-between gap-4">
      <div>
        <div
          className="mb-1.5 text-[11px] font-medium uppercase"
          style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
        >
          {eyebrow}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2
            className="text-xl sm:text-2xl font-semibold"
            style={{ letterSpacing: "-0.015em", color: "var(--text)" }}
          >
            {title}
          </h2>
          {meta && (
            <span className="text-[13px]" style={{ color: "var(--text-3)" }}>
              {meta}
            </span>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div
      className="rounded-lg border border-dashed p-5 text-center text-sm"
      style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
    >
      {msg}
    </div>
  );
}

function groupByDay(tasks: TaskRow[]): [string, TaskRow[]][] {
  const map = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    if (!map.has(t.due_date)) map.set(t.due_date, []);
    map.get(t.due_date)!.push(t);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function NoProfile({ email }: { email: string }) {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold tracking-tight">Falta tu perfil</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-3)" }}>
          Tu cuenta <strong>{email}</strong> existe en Auth pero todavía no hay fila en
          <code> public.users</code>. Pídele a Lau que te seedee.
        </p>
      </div>
    </main>
  );
}
