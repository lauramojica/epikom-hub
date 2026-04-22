import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TaskCard } from "@/components/TaskCard";
import { WeeklyContextCard } from "@/components/WeeklyContextCard";
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

  // Current week = the one whose start_date ≤ today ≤ end_date, else the most recent.
  const { data: currentWeek } = await supabase
    .from("weeks")
    .select("id, week_start_date, week_end_date, priorities, deadlines, rotation_national, notes")
    .lte("week_start_date", today)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle<WeekRow>();

  let todayTasks: TaskRow[] = [];
  let restOfWeek: TaskRow[] = [];
  let crewBySlug = new Map<string, string>();

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

    todayTasks = (tasks ?? []).filter((t) => t.due_date === today);
    restOfWeek = (tasks ?? []).filter((t) => t.due_date !== today && t.due_date >= today);

    // Crew map for rotation labels
    const { data: crew } = await supabase.from("users").select("slug, name");
    crewBySlug = new Map((crew ?? []).map((c) => [c.slug, c.name.split(" ")[0]]));
  }

  const firstName = profile.name.split(" ")[0];

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Header name={firstName} role={profile.role} today={formatPrettyDate(today)} />

        {!currentWeek && (
          <div className="mt-8 rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
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
              <WeeklyContextCard week={currentWeek} crewBySlug={crewBySlug} />
            </div>

            <Section title="Hoy" count={todayTasks.length}>
              {todayTasks.length === 0 ? (
                <EmptyState msg="No tienes tareas para hoy. Disfruta." />
              ) : (
                <div className="space-y-2">
                  {todayTasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Resto de la semana" count={restOfWeek.length}>
              {restOfWeek.length === 0 ? (
                <EmptyState msg="Nada más programado esta semana." />
              ) : (
                <div className="space-y-4">
                  {groupByDay(restOfWeek).map(([day, items]) => (
                    <div key={day}>
                      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
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
            </Section>
          </>
        )}
      </div>
    </main>
  );
}

function Header({ name, role, today }: { name: string; role: string; today: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="mb-1 text-xs tracking-widest uppercase text-neutral-400">
          {today}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {name}.</h1>
      </div>
      <div className="flex items-center gap-3 pt-1 text-xs text-neutral-500">
        <Link href="/semana" className="hover:text-neutral-800 underline-offset-2 hover:underline">
          Semana
        </Link>
        {role === "admin" && (
          <>
            <span className="text-neutral-300">·</span>
            <Link href="/admin" className="hover:text-neutral-800 underline-offset-2 hover:underline">
              Admin
            </Link>
          </>
        )}
        <span className="text-neutral-300">·</span>
        <form action="/auth/signout" method="post">
          <button type="submit" className="hover:text-neutral-800 underline-offset-2 hover:underline">
            Salir
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-neutral-800">{title}</h2>
        <span className="text-xs text-neutral-400">{count}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-200 p-5 text-center text-sm text-neutral-500">
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
