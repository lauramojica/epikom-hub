"use client";

import { useEffect, useState } from "react";
import { PartyPopper, X } from "lucide-react";

const CELEBRATION_DISMISSED_KEY = "celebration-dismissed";

export function WeekProgress({
  completed,
  total,
  weekId,
}: {
  completed: number;
  total: number;
  weekId: string;
}) {
  const [dismissed, setDismissed] = useState<boolean>(true);

  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const isComplete = total > 0 && completed === total;

  useEffect(() => {
    // Only run on client. Keyed by weekId so a new week re-triggers celebration.
    const key = `${CELEBRATION_DISMISSED_KEY}:${weekId}`;
    const already = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    setDismissed(already === "1");
  }, [weekId]);

  function dismiss() {
    const key = `${CELEBRATION_DISMISSED_KEY}:${weekId}`;
    localStorage.setItem(key, "1");
    setDismissed(true);
  }

  return (
    <>
      <div
        className="rounded-lg p-4"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
        }}
      >
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-sm" style={{ color: "var(--text)" }}>
            Progreso semanal
            <span className="ml-2 text-xs" style={{ color: "var(--text-3)" }}>
              {completed}/{total}
            </span>
          </div>
          <div
            className="tnum text-xs font-medium"
            style={{ color: "var(--text-2)" }}
          >
            {pct}%
          </div>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ background: "var(--bg-3)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: isComplete
                ? "linear-gradient(90deg, var(--brand-turquesa), var(--brand-lima, #bce36c))"
                : "var(--brand-turquesa)",
            }}
          />
        </div>
      </div>

      {isComplete && !dismissed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 text-white fade-in"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-turquesa), var(--brand-violeta) 55%, var(--brand-turquesa-ink))",
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
                <PartyPopper className="h-10 w-10" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              ¡Buen trabajo!
            </h1>
            <p className="mt-4 text-lg text-white/90">
              Completaste todas tus tareas de la semana.
            </p>
            <p className="mt-1 text-lg text-white/90">¡Sigue así! 🚀</p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-semibold shadow-lg transition hover:scale-[1.02]"
              style={{ color: "var(--brand-turquesa-ink)" }}
            >
              Gracias, cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
