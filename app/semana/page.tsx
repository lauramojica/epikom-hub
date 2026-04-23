import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { WeekKanban } from "@/components/WeekKanban";
import {
  formatPrettyDate,
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
    .select("id, name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/dashboard");

  const today = todayInPR();
  const { data: currentWeek } = await supabase
    .from("weeks")
    .select(
      "id, week_start_date, week_end_date, priorities, deadlines, rotation_national, notes"
    )
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
              <button
                type="button"
                disabled
                aria-label="Semana anterior"
                className="grid h-9 w-9 place-items-center rounded-md transition"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text-3)",
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
              >
                <ChevronLeft size={16} />
              </button>
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
              <button
                type="button"
                disabled
                aria-label="Semana siguiente"
                className="grid h-9 w-9 place-items-center rounded-md transition"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text-3)",
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
              >
                <ChevronRight size={16} />
              </button>
              <Link
                href="/dashboard"
                className="ml-2 inline-flex items-center gap-1.5 text-xs font-medium"
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

          {currentWeek && (
            <WeekKanban
              tasks={tasks}
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
