import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TaskCard } from "@/components/TaskCard";
import {
  formatPrettyDate,
  formatDayName,
  todayInPR,
  type TaskRow,
  type WeekRow,
} from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function SemanaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/dashboard");

  const today = todayInPR();
  const { data: currentWeek } = await supabase
    .from("weeks")
    .select("id, week_start_date, week_end_date, priorities, deadlines, rotation_national, notes")
    .lte("week_start_date", today)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle<WeekRow>();

  let tasks: TaskRow[] = [];
  if (currentWeek) {
    const { data } = await supabase
      .from("tasks")
      .select(
        "id, title, description, due_date, task_type, priority, status, notion_url, completed_at, user_note, task_clients(client_name)"
      )
      .eq("assigned_to", profile.id)
      .eq("week_id", currentWeek.id)
      .order("due_date", { ascending: true })
      .order("priority", { ascending: true })
      .returns<TaskRow[]>();
    tasks = data ?? [];
  }

  const completed = tasks.filter((t) => t.status === "completada").length;
  const groups = groupByDay(tasks);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-1 text-xs tracking-widest uppercase text-neutral-400">
              Semana completa
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Tu semana</h1>
            {currentWeek && (
              <p className="mt-1 text-xs text-neutral-500">
                {formatPrettyDate(currentWeek.week_start_date)} →{" "}
                {formatPrettyDate(currentWeek.week_end_date)}
              </p>
            )}
          </div>
          <div className="pt-1 text-xs text-neutral-500">
            <Link href="/dashboard" className="underline underline-offset-2">
              ← dashboard
            </Link>
          </div>
        </div>

        {!currentWeek && (
          <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
            Sin semana cargada todavía.
          </div>
        )}

        {currentWeek && (
          <>
            <div className="mb-6 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-700">
              <strong>{completed}</strong> de <strong>{tasks.length}</strong> tareas completadas
              {tasks.length > 0 && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((completed / tasks.length) * 100)}%`,
                      background: "var(--brand-turquesa)",
                    }}
                  />
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
                      <TaskCard key={t.id} task={t} />
                    ))}
                  </div>
                </section>
              ))}

              {tasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
                  No tienes tareas esta semana.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
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
