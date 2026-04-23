import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { formatPrettyDate, todayInPR, type WeekRow } from "@/lib/tasks";

export const dynamic = "force-dynamic";

type CrewStats = {
  id: string;
  slug: string;
  name: string;
  total: number;
  completed: number;
  blocked: number;
  overdue: number;
};

export default async function AdminDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Middleware already gates /admin to admin role, but double-check.
  const { data: me } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const today = todayInPR();
  const admin = createAdminClient(); // bypass RLS for aggregate views

  const { data: currentWeek } = await admin
    .from("weeks")
    .select("id, week_start_date, week_end_date, priorities, deadlines, rotation_national, notes, uploaded_at")
    .lte("week_start_date", today)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle<WeekRow & { uploaded_at: string }>();

  const { data: crew } = await admin
    .from("users")
    .select("id, slug, name, role")
    .order("role", { ascending: true })
    .order("name", { ascending: true });

  let stats: CrewStats[] = [];
  let totalTasks = 0;
  let attention: {
    id: string;
    title: string;
    assignee: string;
    status: string;
    due_date: string;
  }[] = [];
  let pendingNotifs = 0;

  if (currentWeek && crew) {
    const { data: tasks } = await admin
      .from("tasks")
      .select("id, assigned_to, status, due_date, title")
      .eq("week_id", currentWeek.id);

    totalTasks = tasks?.length ?? 0;
    const byUser = new Map<string, { total: number; completed: number; blocked: number; overdue: number }>();
    for (const c of crew) byUser.set(c.id, { total: 0, completed: 0, blocked: 0, overdue: 0 });

    for (const t of tasks ?? []) {
      const agg = byUser.get(t.assigned_to);
      if (!agg) continue;
      agg.total += 1;
      if (t.status === "completada") agg.completed += 1;
      if (t.status === "bloqueada") agg.blocked += 1;
      if (t.status !== "completada" && t.due_date < today) agg.overdue += 1;
    }

    stats = crew
      .filter((c) => c.role === "crew" || byUser.get(c.id)!.total > 0)
      .map((c) => {
        const s = byUser.get(c.id)!;
        return {
          id: c.id,
          slug: c.slug,
          name: c.name,
          total: s.total,
          completed: s.completed,
          blocked: s.blocked,
          overdue: s.overdue,
        };
      });

    const userMap = new Map(crew.map((c) => [c.id, c.name.split(" ")[0]]));
    attention = (tasks ?? [])
      .filter(
        (t) =>
          t.status === "bloqueada" ||
          (t.status !== "completada" && t.due_date < today)
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        assignee: userMap.get(t.assigned_to) ?? "—",
        status: t.status,
        due_date: t.due_date,
      }));

    const { count } = await admin
      .from("scheduled_notifications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pendingNotifs = count ?? 0;
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-1 text-xs tracking-widest uppercase text-neutral-400">admin</div>
            <h1 className="text-2xl font-semibold tracking-tight">Vista del crew</h1>
          </div>
          <div className="flex items-center gap-3 pt-1 text-xs text-neutral-500">
            <Link href="/admin/upload" className="underline underline-offset-2 hover:text-neutral-800">
              Subir semana
            </Link>
            <span className="text-neutral-300">·</span>
            <Link href="/dashboard" className="underline underline-offset-2 hover:text-neutral-800">
              Dashboard
            </Link>
          </div>
        </div>

        {!currentWeek && (
          <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
            No hay semana cargada.{" "}
            <Link href="/admin/upload" className="underline underline-offset-2">
              Subir JSON
            </Link>
            .
          </div>
        )}

        {currentWeek && (
          <>
            <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-neutral-500">Semana: </span>
                  <strong>{formatPrettyDate(currentWeek.week_start_date)}</strong> →{" "}
                  <strong>{formatPrettyDate(currentWeek.week_end_date)}</strong>
                </div>
                <div>
                  <span className="text-neutral-500">Tareas: </span>
                  <strong>{totalTasks}</strong>
                </div>
                <div>
                  <span className="text-neutral-500">Notifs pendientes: </span>
                  <strong>{pendingNotifs}</strong>
                </div>
              </div>
              <div className="mt-2 text-xs text-neutral-400">
                Subida {new Date(currentWeek.uploaded_at).toLocaleString("es-PR")}
              </div>
            </div>

            <h2 className="mb-3 text-sm font-semibold tracking-tight text-neutral-800">Crew</h2>
            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {stats.map((s) => {
                const pct = s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100);
                return (
                  <Link
                    key={s.id}
                    href={`/admin/crew/${s.slug}`}
                    className="group rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-baseline justify-between">
                      <div className="text-sm font-medium group-hover:text-[var(--brand-turquesa-ink)]">
                        {s.name}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {s.completed}/{s.total}
                      </div>
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
                    {(s.overdue > 0 || s.blocked > 0) && (
                      <div className="mt-2 flex gap-3 text-xs">
                        {s.overdue > 0 && (
                          <span className="text-red-600">{s.overdue} atrasada{s.overdue > 1 ? "s" : ""}</span>
                        )}
                        {s.blocked > 0 && (
                          <span className="text-amber-700">
                            {s.blocked} bloqueada{s.blocked > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            {attention.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-sm font-semibold tracking-tight text-neutral-800">
                  Atención ({attention.length})
                </h2>
                <div className="rounded-lg border border-amber-200 bg-amber-50 divide-y divide-amber-100">
                  {attention.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                      <div className="min-w-0">
                        <div className="font-medium text-amber-900 truncate">{a.title}</div>
                        <div className="text-amber-700">
                          {a.assignee} · {a.status === "bloqueada" ? "bloqueada" : `atrasada (${a.due_date})`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
