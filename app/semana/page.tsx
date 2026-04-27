import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { WeekKanban } from "@/components/WeekKanban";
import { NotificationsBell } from "@/components/NotificationsBell";
import { CrewMemberSwitcher } from "@/components/CrewMemberSwitcher";
import { NewTaskModal } from "@/components/NewTaskModal";
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
  searchParams?: { week?: string; crew?: string };
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

  const isAdmin = profile.role === "admin";

  // Crew list for NewTaskModal (everyone) + member-switcher / reassign dropdown (admin only).
  // Read via service role so RLS doesn't hide rows.
  const adminDb = createAdminClient();
  const { data: crewRaw } = await adminDb
    .from("users")
    .select("id, name, slug, role")
    .order("role", { ascending: true })
    .order("name", { ascending: true });
  const crewList = (crewRaw ?? []).map(
    ({ id, name, slug }: { id: string; name: string; slug: string }) => ({
      id,
      name,
      slug,
    })
  );

  // Determine which user's week to view (admin can switch via ?crew=slug)
  const requestedCrew =
    isAdmin && searchParams?.crew
      ? crewList.find((c) => c.slug === searchParams.crew)
      : null;
  const viewing = requestedCrew
    ? { id: requestedCrew.id, name: requestedCrew.name, slug: requestedCrew.slug }
    : { id: profile.id, name: profile.name, slug: null as string | null };
  const isViewingOther = !!requestedCrew && requestedCrew.id !== profile.id;

  // Use admin client to read tasks when viewing another crew member's week.
  const taskDb = isViewingOther ? createAdminClient() : supabase;

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
    const { data } = await taskDb
      .from("tasks")
      .select(
        "id, title, description, due_date, due_time, task_type, priority, status, notion_url, context, completed_at, user_note, assigned_to, task_clients(client_name)"
      )
      .eq("assigned_to", viewing.id)
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
      const { data: prior } = await taskDb
        .from("tasks")
        .select(
          "id, title, description, due_date, due_time, task_type, priority, status, notion_url, context, completed_at, user_note, assigned_to, task_clients(client_name)"
        )
        .eq("assigned_to", viewing.id)
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
  const profileFirstName = profile.name.split(" ")[0];
  const viewingFirstName = viewing.name.split(" ")[0];
  const rotationKey = (viewing.slug ?? viewingFirstName.toLowerCase()).toLowerCase();
  const rotationBlock =
    currentWeek?.rotation_national?.[rotationKey] ??
    currentWeek?.rotation_national?.[viewingFirstName] ??
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

  function semanaHref(opts: { week?: string | null; crew?: string | null } = {}) {
    const params = new URLSearchParams();
    const week = opts.week === undefined ? requestedWeek : opts.week;
    const crew = opts.crew === undefined ? viewing.slug : opts.crew;
    if (week) params.set("week", week);
    if (crew) params.set("crew", crew);
    const qs = params.toString();
    return qs ? `/semana?${qs}` : "/semana";
  }

  return (
    <AppShell role={profile.role} firstName={profileFirstName}>
      <main className="px-4 py-6 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div
                className="mb-2 text-xs uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
              >
                {isViewingOther ? `Semana de ${viewing.name.split(" ")[0]}` : "Mi semana"}
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
              {isAdmin && crewList.length > 0 && (
                <CrewMemberSwitcher
                  crew={crewList}
                  selectedSlug={viewing.slug}
                  myId={profile.id}
                  weekParam={requestedWeek}
                />
              )}
              <NavArrow
                href={prevWeekStart ? semanaHref({ week: prevWeekStart }) : null}
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
                  href={semanaHref({ week: null })}
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
                href={nextWeekStart ? semanaHref({ week: nextWeekStart }) : null}
                label="Semana siguiente"
                dir="next"
              />
              {currentWeek && (
                <div className="ml-2">
                  <NewTaskModal
                    weekId={currentWeek.id}
                    weekStart={currentWeek.week_start_date}
                    weekEnd={currentWeek.week_end_date}
                    crew={crewList}
                    defaultAssigneeId={viewing.id}
                    label="Nueva tarea"
                    variant="solid"
                  />
                </div>
              )}
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
              crew={isAdmin ? crewList : undefined}
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
