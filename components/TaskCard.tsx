"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PRIORITY_LABEL, STATUS_LABEL, type TaskRow } from "@/lib/tasks";

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

export function TaskCard({ task }: { task: TaskRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState<TaskRow["status"]>(task.status);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(task.user_note ?? "");

  const isDone = optimisticStatus === "completada";
  const clients = task.task_clients.map((c) => c.client_name).join(" · ");

  function toggleComplete() {
    const next: TaskRow["status"] = isDone ? "pendiente" : "completada";
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

  return (
    <article
      className={`group rounded-lg border border-neutral-200 bg-white p-4 transition ${
        isDone ? "opacity-70" : ""
      } ${isPending ? "scale-[0.995]" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggleComplete}
          aria-label={isDone ? "Marcar pendiente" : "Marcar completada"}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
            isDone
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-neutral-300 hover:border-[var(--brand-turquesa)]"
          }`}
        >
          {isDone && (
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${priorityStyle[task.priority]}`}
            >
              {PRIORITY_LABEL[task.priority]}
            </span>
            <span className="text-xs text-neutral-500">{clients}</span>
            <span className="text-xs text-neutral-400">· {task.task_type}</span>
          </div>
          <h3 className={`text-sm font-medium leading-snug ${statusStyle[optimisticStatus]}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span>{STATUS_LABEL[optimisticStatus]}</span>
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
            <button
              type="button"
              onClick={() => setShowNote((s) => !s)}
              className="text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
            >
              {task.user_note ? "Editar nota" : "Añadir nota"}
            </button>
          </div>

          {showNote && (
            <div className="mt-3 space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Nota interna (solo tú la ves)"
                className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand-turquesa)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveNote}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-white"
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
                  className="rounded-md px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!showNote && task.user_note && (
            <p className="mt-2 rounded-md bg-neutral-50 p-2 text-xs text-neutral-600">
              {task.user_note}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
