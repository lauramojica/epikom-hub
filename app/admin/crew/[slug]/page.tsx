import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewTaskModal } from "@/components/NewTaskModal";
import {
  formatPrettyDate,
  formatDayName,
  todayInPR,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type TaskRow,
  type WeekRow,
} from "@/lib/tasks";

export const dynamic = "force-dynamic";

const priorityTone: Record<
  TaskRow["priority"],
  { bg: string; fg: string }
> = {
  HIGH: { bg: "var(--brand-violeta-soft)", fg: "var(--brand-violeta-ink)" },
  MEDIUM: { bg: "var(--brand-turquesa-soft)", fg: "var(--brand-turquesa-ink)" },
  LOW: { bg: "var(--bg-3)", fg: "var(--text-2)" },
};

export default async function AdminCrewDetail({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("users")
    .select("id, slug, name, role, email")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!member) notFound();

  const today = todayInPR();
  const { data: currentWeek } = await admin
    .from("weeks")
    .select("id, week_start_date, week_end_date, priorities, deadlines, rotation_national, notes")
    .lte("week_start_date", today)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle<WeekRow>();

  const { data: crew } = await admin
    .from("users")
    .select("id, slug, name")
    .order("name", { ascending: true });
  const crewList = crew ?? [];

  let tasks: TaskRow[] = [];
  if (currentWeek) {
    const { data } = await admin
      .from("tasks")
      .select(
        "id, title, description, due_date, due_time, task_type, priority, status, notion_url, context, completed_at, user_note, task_clients(client_name)"
      )
      .eq("assigned_to", member.id)
      .eq("week_id", currentWeek.id)
      .order("due_date", { ascending: true })
      .order("priority", { ascending: true })
      .returns<TaskRow[]>();
    tasks = data ?? [];
  }

  const completed = tasks.filter((t) => t.status === "completada").length;
  const blocked = tasks.filter((t) => t.status === "bloqueada").length;
  const overdue = tasks.filter(
    (t) => t.status !== "completada" && t.due_date < today
  ).length;
  const pct = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
  const groups = groupByDay(tasks);

  return (
    <main className="min-h-screen px-6 py-10" style={{ color: "var(--text)" }}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div
              className="mb-1 text-xs uppercase"
              style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
            >
              {member.role} · {member.email}
            </div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              {member.name}
            </h1>
            {currentWeek && (
              <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>
                {formatPrettyDate(currentWeek.week_start_date)} →{" "}
                {formatPrettyDate(currentWeek.week_end_date)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 pt-1">
            <Link
              href="/admin"
              className="text-xs underline underline-offset-2"
              style={{ color: "var(--text-3)" }}
            >
              ← admin
            </Link>
            {currentWeek && (
              <NewTaskModal
                weekId={currentWeek.id}
                weekStart={currentWeek.week_start_date}
                weekEnd={currentWeek.week_end_date}
                crew={crewList}
                defaultAssigneeId={member.id}
                defaultDueDate={today}
                label="Asignar tarea"
              />
            )}
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

        {currentWeek && (
          <>
            <div
              className="mb-6 rounded-lg p-4"
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg)",
              }}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <div className="text-sm" style={{ color: "var(--text)" }}>
                  <strong>{completed}</strong> de <strong>{tasks.length}</strong>{" "}
                  completadas
                </div>
                <div className="text-xs" style={{ color: "var(--text-3)" }}>
                  {pct}%
                </div>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: "var(--bg-3)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: "var(--brand-turquesa)",
                  }}
                />
              </div>
              {(overdue > 0 || blocked > 0) && (
                <div className="mt-3 flex gap-4 text-xs">
                  {overdue > 0 && (
                    <span style={{ color: "var(--warn)" }}>
                      {overdue} atrasada{overdue > 1 ? "s" : ""}
                    </span>
                  )}
                  {blocked > 0 && (
                    <span style={{ color: "var(--warn)" }}>
                      {blocked} bloqueada{blocked > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {groups.map(([day, items]) => (
                <section key={day}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2
                      className="text-sm font-semibold tracking-tight capitalize"
                      style={{ color: "var(--text)" }}
                    >
                      {formatDayName(day)}
                      <span
                        className="ml-2 text-xs font-normal"
                        style={{ color: "var(--text-3)" }}
                      >
                        {formatPrettyDate(day)}
                      </span>
                    </h2>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-3)" }}
                    >
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((t) => (
                      <ReadOnlyTask key={t.id} task={t} today={today} />
                    ))}
                  </div>
                </section>
              ))}

              {tasks.length === 0 && (
                <div
                  className="rounded-lg border border-dashed p-6 text-center text-sm"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-3)",
                  }}
                >
                  Sin tareas asignadas esta semana.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ReadOnlyTask({ task, today }: { task: TaskRow; today: string }) {
  const clients = task.task_clients.map((c) => c.client_name).join(" · ");
  const isOverdue = task.status !== "completada" && task.due_date < today;
  const completedAt = task.completed_at
    ? new Date(task.completed_at).toLocaleString("es-PR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const tone = priorityTone[task.priority];
  const isDone = task.status === "completada";

  return (
    <article
      className="rounded-lg p-4"
      style={{
        border: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
          style={{
            background: tone.bg,
            color: tone.fg,
            letterSpacing: "0.04em",
          }}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
        <span className="text-xs" style={{ color: "var(--text-2)" }}>
          {clients}
        </span>
        <span className="text-xs" style={{ color: "var(--text-3)" }}>
          · {task.task_type}
        </span>
      </div>
      <h3
        className="text-sm font-medium leading-snug"
        style={{
          color: isDone ? "var(--text-3)" : "var(--text)",
          textDecoration: isDone ? "line-through" : "none",
        }}
      >
        {task.title}
      </h3>
      {task.description && (
        <p
          className="mt-1 text-xs leading-relaxed"
          style={{ color: "var(--text-2)" }}
        >
          {task.description}
        </p>
      )}

      <div
        className="mt-3 flex flex-wrap items-center gap-3 text-xs"
        style={{ color: "var(--text-3)" }}
      >
        <span
          style={{
            color:
              task.status === "bloqueada" || isOverdue
                ? "var(--warn)"
                : task.status === "completada"
                  ? "var(--brand-turquesa-ink)"
                  : "var(--text-3)",
          }}
        >
          {STATUS_LABEL[task.status]}
          {isOverdue && task.status !== "completada" && " · atrasada"}
        </span>
        {completedAt && <span>Completada {completedAt}</span>}
        {task.notion_url && (
          <a
            href={task.notion_url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
            style={{ color: "var(--text-2)" }}
          >
            Notion ↗
          </a>
        )}
      </div>

      {task.user_note && (
        <p
          className="mt-2 rounded-md p-2 text-xs"
          style={{ background: "var(--bg-2)", color: "var(--text-2)" }}
        >
          <span style={{ fontWeight: 500, color: "var(--text)" }}>Nota: </span>
          {task.user_note}
        </p>
      )}
    </article>
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
