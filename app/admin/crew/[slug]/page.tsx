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

const priorityStyle: Record<TaskRow["priority"], string> = {
  HIGH: "bg-red-50 text-red-700 border-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-neutral-50 text-neutral-600 border-neutral-200",
};

const statusStyle: Record<TaskRow["status"], string> = {
  pendiente: "text-neutral-500",
  en_progreso: "text-[var(--brand-turquesa-ink)]",
  completada: "text-emerald-700 line-through decoration-neutral-300",
  bloqueada: "text-red-600",
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
        "id, title, description, due_date, task_type, priority, status, notion_url, completed_at, user_note, task_clients(client_name)"
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
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-1 text-xs tracking-widest uppercase text-neutral-400">
              {member.role} · {member.email}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{member.name}</h1>
            {currentWeek && (
              <p className="mt-1 text-xs text-neutral-500">
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
          <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
            No hay semana cargada.
          </div>
        )}

        {currentWeek && (
          <>
            <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <div className="text-sm">
                  <strong>{completed}</strong> de <strong>{tasks.length}</strong> completadas
                </div>
                <div className="text-xs text-neutral-500">{pct}%</div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
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
                    <span className="text-red-600">
                      {overdue} atrasada{overdue > 1 ? "s" : ""}
                    </span>
                  )}
                  {blocked > 0 && (
                    <span className="text-amber-700">
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
                    <h2 className="text-sm font-semibold tracking-tight text-neutral-800 capitalize">
                      {formatDayName(day)}
                      <span className="ml-2 text-xs font-normal text-neutral-400">
                        {formatPrettyDate(day)}
                      </span>
                    </h2>
                    <span className="text-xs text-neutral-400">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((t) => (
                      <ReadOnlyTask key={t.id} task={t} today={today} />
                    ))}
                  </div>
                </section>
              ))}

              {tasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
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

  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${priorityStyle[task.priority]}`}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
        <span className="text-xs text-neutral-500">{clients}</span>
        <span className="text-xs text-neutral-400">· {task.task_type}</span>
      </div>
      <h3 className={`text-sm font-medium leading-snug ${statusStyle[task.status]}`}>
        {task.title}
      </h3>
      {task.description && (
        <p className="mt-1 text-xs text-neutral-500 leading-relaxed">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
        <span
          className={
            task.status === "bloqueada"
              ? "text-red-600"
              : isOverdue
                ? "text-red-600"
                : task.status === "completada"
                  ? "text-emerald-700"
                  : ""
          }
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
            className="text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
          >
            Notion ↗
          </a>
        )}
      </div>

      {task.user_note && (
        <p className="mt-2 rounded-md bg-neutral-50 p-2 text-xs text-neutral-600">
          <span className="font-medium text-neutral-700">Nota: </span>
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
