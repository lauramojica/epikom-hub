import { type WeekRow } from "@/lib/tasks";

export function WeeklyContextCard({
  week,
  crewBySlug,
}: {
  week: WeekRow | null;
  crewBySlug: Map<string, string>;
}) {
  if (!week) return null;

  const priorities = week.priorities ?? [];
  const rotation = week.rotation_national ?? {};

  return (
    <div
      className="rounded-lg p-5"
      style={{
        border: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div
          className="text-xs uppercase"
          style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
        >
          Esta semana
        </div>
        <div className="text-xs" style={{ color: "var(--text-3)" }}>
          {week.week_start_date} → {week.week_end_date}
        </div>
      </div>

      {priorities.length > 0 && (
        <div className="mb-4">
          <div
            className="mb-1 text-xs font-medium"
            style={{ color: "var(--text-2)" }}
          >
            Prioridades
          </div>
          <ul className="space-y-1 text-sm" style={{ color: "var(--text)" }}>
            {priorities.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: "var(--brand-turquesa-ink)" }}>·</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(rotation).length > 0 && (
        <div className="mb-2">
          <div
            className="mb-1 text-xs font-medium"
            style={{ color: "var(--text-2)" }}
          >
            Rotación National
          </div>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {Object.entries(rotation).map(([slot, slug]) => (
              <div key={slot} className="flex justify-between gap-2">
                <dt
                  className="capitalize"
                  style={{ color: "var(--text-3)" }}
                >
                  {slot.replace(/_/g, " ")}
                </dt>
                <dd style={{ color: "var(--text)" }}>
                  {crewBySlug.get(slug) ?? slug}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {week.notes && (
        <p
          className="mt-3 rounded-md p-3 text-xs"
          style={{ background: "var(--bg-2)", color: "var(--text-2)" }}
        >
          {week.notes}
        </p>
      )}
    </div>
  );
}
