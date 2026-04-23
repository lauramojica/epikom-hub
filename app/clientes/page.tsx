import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { TaskCard } from "@/components/TaskCard";
import {
  todayInPR,
  formatPrettyDate,
  type TaskRow,
  type WeekRow,
} from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
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
  if (!profile) redirect("/");

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

  // Group by client
  const byClient = new Map<string, TaskRow[]>();
  const SIN_CLIENTE = "Sin cliente";
  for (const t of tasks) {
    if (t.task_clients.length === 0) {
      if (!byClient.has(SIN_CLIENTE)) byClient.set(SIN_CLIENTE, []);
      byClient.get(SIN_CLIENTE)!.push(t);
    } else {
      for (const c of t.task_clients) {
        if (!byClient.has(c.client_name)) byClient.set(c.client_name, []);
        byClient.get(c.client_name)!.push(t);
      }
    }
  }

  const groups = Array.from(byClient.entries()).sort(([a], [b]) => {
    if (a === SIN_CLIENTE) return 1;
    if (b === SIN_CLIENTE) return -1;
    return a.localeCompare(b);
  });

  const firstName = profile.name.split(" ")[0];

  return (
    <AppShell role={profile.role} firstName={firstName}>
      <main className="px-4 py-6 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <div
              className="mb-2 text-xs uppercase"
              style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
            >
              Cliente por cliente
            </div>
            <h1
              className="text-3xl sm:text-4xl font-semibold"
              style={{ letterSpacing: "-0.02em", color: "var(--text)" }}
            >
              Tus clientes esta semana
            </h1>
            {currentWeek && (
              <p className="mt-2 text-sm" style={{ color: "var(--text-3)" }}>
                {formatPrettyDate(currentWeek.week_start_date)} →{" "}
                {formatPrettyDate(currentWeek.week_end_date)}
              </p>
            )}
          </div>

          {!currentWeek && (
            <div
              className="rounded-lg border border-dashed p-6 text-center text-sm"
              style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
            >
              No hay semana cargada.
            </div>
          )}

          {currentWeek && groups.length === 0 && (
            <div
              className="rounded-lg border border-dashed p-6 text-center text-sm"
              style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
            >
              No tienes tareas asignadas esta semana.
            </div>
          )}

          <div className="space-y-10">
            {groups.map(([client, items]) => {
              const completed = items.filter(
                (t) => t.status === "completada"
              ).length;
              const pct =
                items.length === 0
                  ? 0
                  : Math.round((completed / items.length) * 100);
              return (
                <section key={client}>
                  <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                      <div
                        className="mb-1 text-[11px] font-medium uppercase"
                        style={{
                          letterSpacing: "0.08em",
                          color: "var(--text-3)",
                        }}
                      >
                        Cliente
                      </div>
                      <h2
                        className="text-xl sm:text-2xl font-semibold"
                        style={{
                          letterSpacing: "-0.015em",
                          color: "var(--text)",
                        }}
                      >
                        {client}
                      </h2>
                    </div>
                    <div
                      className="text-right text-[13px]"
                      style={{ color: "var(--text-3)" }}
                    >
                      <div className="tnum">
                        {completed}/{items.length} · {pct}%
                      </div>
                      <div
                        className="mt-1 h-1.5 w-24 overflow-hidden rounded-full"
                        style={{ background: "var(--bg-3)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: "var(--brand-turquesa)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {items.map((t) => (
                      <TaskCard key={`${client}-${t.id}`} task={t} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
