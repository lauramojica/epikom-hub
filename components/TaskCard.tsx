"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertTriangle, Clock3, StickyNote } from "lucide-react";
import { PRIORITY_LABEL, type TaskRow } from "@/lib/tasks";

const priorityBadge: Record<TaskRow["priority"], { bg: string; fg: string }> = {
  HIGH: { bg: "var(--warn-soft)", fg: "var(--warn)" },
  MEDIUM: { bg: "var(--brand-turquesa-soft)", fg: "var(--brand-turquesa-ink)" },
  LOW: { bg: "var(--bg-3)", fg: "var(--text-2)" },
};

export function TaskCard({ task }: { task: TaskRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState<TaskRow["status"]>(task.status);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(task.user_note ?? "");
  const [hover, setHover] = useState(false);

  const completed = optimisticStatus === "completada";
  const blocked = optimisticStatus === "bloqueada";
  const clients = task.task_clients.map((c) => c.client_name).join(" · ");

  const bg = completed
    ? "var(--brand-lima-soft)"
    : blocked
      ? "var(--warn-soft)"
      : "var(--bg)";
  const borderColor = hover && !completed ? "var(--border-strong)" : "var(--border)";

  function toggleComplete() {
    const next: TaskRow["status"] = completed ? "pendiente" : "completada";
    setOptimisticStatus(next);
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next === "completada" }),
      });
      if (!res.ok) {
        setOptimisticStatus(task.status);
        return;
      }
      router.refresh();
    });
  }

  async function saveNote() {
    const res = await fetch(`/api/tasks/${task.id}/note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (res.ok) {
      setShowNote(false);
      router.refresh();
    }
  }

  const badgeStyle = priorityBadge[task.priority];

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={isPending ? "opacity-80" : ""}
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--r-md)",
        padding: "14px 16px",
        transition: "border-color 120ms, background 120ms",
      }}
    >
      <div className="grid" style={{ gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "flex-start" }}>
        {/* Checkbox */}
        <button
          type="button"
          onClick={toggleComplete}
          aria-label={completed ? "Marcar pendiente" : "Marcar completada"}
          className="grid place-items-center"
          style={{
            width: 18,
            height: 18,
            marginTop: 2,
            borderRadius: 5,
            border: `1.5px solid ${
              completed ? "var(--brand-turquesa)" : blocked ? "var(--warn)" : "var(--border-strong)"
            }`,
            background: completed ? "var(--brand-turquesa)" : "transparent",
            color: "#fff",
            flexShrink: 0,
            transition: "all 180ms",
          }}
        >
          {completed && <Check size={12} strokeWidth={2.8} />}
        </button>

        {/* Body */}
        <div className="min-w-0">
          <div
            className="text-sm font-medium leading-snug"
            style={{
              textDecoration: completed ? "line-through" : "none",
              color: completed ? "var(--text-3)" : "var(--text)",
              overflowWrap: "anywhere",
            }}
          >
            {task.title}
          </div>

          <div
            className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px]"
            style={{ color: "var(--text-2)" }}
          >
            {clients && <span style={{ fontWeight: 500 }}>{clients}</span>}
            {clients && <span style={{ color: "var(--text-3)" }}>·</span>}
            <span>{task.task_type}</span>
            {task.description && (
              <>
                <span style={{ color: "var(--text-3)" }}>·</span>
                <span style={{ color: "var(--text-3)" }}>{task.description}</span>
              </>
            )}
          </div>

          {blocked && (
            <div
              className="mt-2.5 flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "var(--warn)" }}
            >
              <AlertTriangle size={13} /> Bloqueada
            </div>
          )}

          <div
            className="mt-2.5 flex flex-wrap items-center gap-3 text-xs"
            style={{ color: "var(--text-3)" }}
          >
            <button
              type="button"
              onClick={() => setShowNote((s) => !s)}
              className="inline-flex items-center gap-1 hover:underline underline-offset-2"
              style={{ color: "var(--text-2)" }}
            >
              <StickyNote size={12} />
              {task.user_note ? "Editar nota" : "Añadir nota"}
            </button>
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

          {showNote && (
            <div className="mt-3 space-y-2 fade-in">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Nota para esta tarea…"
                className="w-full resize-y text-[13px]"
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: "8px 10px",
                  color: "var(--text)",
                  minHeight: 60,
                  fontFamily: "inherit",
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveNote}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                  style={{ background: "var(--brand-turquesa)" }}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNote(task.user_note ?? "");
                    setShowNote(false);
                  }}
                  className="rounded-md px-3 py-1.5 text-xs"
                  style={{ color: "var(--text-2)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!showNote && task.user_note && (
            <p
              className="mt-2 rounded-md p-2 text-[13px]"
              style={{ background: "var(--bg-2)", color: "var(--text-2)" }}
            >
              {task.user_note}
            </p>
          )}
        </div>

        {/* Meta right */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
            style={{
              background: badgeStyle.bg,
              color: badgeStyle.fg,
              letterSpacing: "0.02em",
            }}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>
          <div
            className="tnum flex items-center gap-1 text-[12px] whitespace-nowrap"
            style={{ color: "var(--text-3)" }}
          >
            <Clock3 size={12} /> {formatDay(task.due_date)}
          </div>
        </div>
      </div>
    </article>
  );
}

function formatDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}/${m}`;
}
