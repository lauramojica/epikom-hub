import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TaskCard } from "@/components/TaskCard";
import { WeeklyContextCard } from "@/components/WeeklyContextCard";
import { WeekProgress } from "@/components/WeekProgress";
import { NewTaskModal } from "@/components/NewTaskModal";
import {
  formatPrettyDate,
  formatDayName,
  todayInPR,
  type TaskRow,
  type WeekRow,
} from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
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

  const { data: currentWeek } = await supabase
    .from("weeks")
    .select("id, week_start_date, week_end_date, priorities, deadlines, rotation_national, notes")
    .lte("week_start_date", today)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle<WeekRow>();

  let allTasks: TaskRow[] = [];
  let todayTasks: TaskRow[] = [];
  let restOfWeek: TaskRow[] = [];
  let crewBySlug = new Map<string, string>();
  let crewList: { id: string; name: string; slug: string }[] = [];

  if (currentWeek) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select(
        "id, title, description, due_date, task_type, priority, status, notion_url, completed_at, user_note, task_clients(client_name)"
      )
      .eq("assigned_to", profile.id)
      .eq("week_id", currentWeek.id)
      .order("due_date", { ascending: true })
      .order("priority", { ascending: true })
      .returns<TaskRow[]>();

    allTasks = tasks ?? [];
    todayTasks = allTasks.filter((t) => t.due_date === today);
    restOfWeek = allTasks.filter((t) => t.due_date !== today && t.due_date >= today);

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
      defaultDueDate={today}
    />
  ) : null;

  return (
    <AppShell role={profile.role} firstName={firstName}>
      <main className="px-4 py-6 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <Header name={firstName} today={formatPrettyDate(today)} />

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

              <div className="mt-10">
                <WeeklyContextCard week={currentWeek} crewBySlug={crewBySlug} />
              </div>

              <SectionHeader
                eyebrow="Resto de la semana"
                title="Lo que viene"
                meta={`${restOfWeek.length} tarea${restOfWeek.length === 1 ? "" : "s"}`}
              />
              {restOfWeek.length === 0 ? (
                <EmptyState msg="Nada más programado esta semana." />
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

function Header({ name, today }: { name: string; today: string }) {
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
      <div className="hidden sm:flex items-center gap-2 pt-2">
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text-3)",
            minWidth: 260,
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
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative flex h-9 w-9 items-center justify-center rounded-md"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text-2)",
          }}
        >
          <Bell size={16} strokeWidth={1.75} />
          <span className="notif-dot" />
        </button>
      </div>
    </div>
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
        <p className="mt-2 text-sm text-neutral-500">
          Tu cuenta <strong>{email}</strong> existe en Auth pero todavía no hay fila en
          <code> public.users</code>. Pídele a Lau que te seedee.
        </p>
      </div>
    </main>
  );
}
