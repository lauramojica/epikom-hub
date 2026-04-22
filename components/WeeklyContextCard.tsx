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
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs tracking-widest uppercase text-neutral-400">
          Esta semana
        </div>
        <div className="text-xs text-neutral-400">
          {week.week_start_date} → {week.week_end_date}
        </div>
      </div>

      {priorities.length > 0 && (
        <div className="mb-4">
          <div className="mb-1 text-xs font-medium text-neutral-600">Prioridades</div>
          <ul className="space-y-1 text-sm text-neutral-700">
            {priorities.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[var(--brand-turquesa-ink)]">·</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(rotation).length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-xs font-medium text-neutral-600">Rotación National</div>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {Object.entries(rotation).map(([slot, slug]) => (
              <div key={slot} className="flex justify-between gap-2">
                <dt className="text-neutral-500 capitalize">
                  {slot.replace(/_/g, " ")}
                </dt>
                <dd className="text-neutral-800">{crewBySlug.get(slug) ?? slug}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {week.notes && (
        <p className="mt-3 rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
          {week.notes}
        </p>
      )}
    </div>
  );
}
