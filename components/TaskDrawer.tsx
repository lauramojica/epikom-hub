"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Clock, User, Tag, CircleDot, AlertTriangle, Pencil } from "lucide-react";
import type { TaskRow } from "@/lib/tasks";
import { STATUS_LABEL } from "@/lib/tasks";
import { clientMeta } from "@/lib/clients";
import { TierBadge } from "./TierBadge";
import { LangBadge } from "./LangBadge";

type Props = {
  task: TaskRow | null;
  onClose: () => void;
  onEdit?: (t: TaskRow) => void;
};

export function TaskDrawer({ task, onClose, onEdit }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [savingNote, startSavingNote] = useTransition();
  const [togglePending, startToggle] = useTransition();

  useEffect(() => {
    setNote(task?.user_note ?? "");
  }, [task?.id, task?.user_note]);

  useEffect(() => {
    if (!task) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, onClose]);

  if (!task) return null;

  const firstClient = task.task_clients[0]?.client_name ?? null;
  const meta = firstClient ? clientMeta(firstClient) : null;
  const clientsLabel = task.task_clients.map((c) => c.client_name).join(" · ");
  const isBlocked = task.status === "bloqueada";
  const isDone = task.status === "completada";

  async function saveNote() {
    startSavingNote(async () => {
      const res = await fetch(`/api/tasks/${task!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_note: note }),
      });
      if (res.ok) router.refresh();
    });
  }

  async function toggleComplete() {
    startToggle(async () => {
      const res = await fetch(`/api/tasks/${task!.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !isDone }),
      });
      if (res.ok) {
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(26,26,26,0.35)" }}
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="fade-in h-full w-full overflow-y-auto sm:max-w-[420px]"
        style={{
          background: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
          padding: 24,
        }}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {meta && <TierBadge tier={meta.tier} />}
            {meta && <LangBadge lang={meta.lang} />}
            <span
              className="text-[10px] font-medium uppercase"
              style={{ letterSpacing: "0.04em", color: "var(--text-3)" }}
            >
              {task.task_type}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(task)}
                aria-label="Editar tarea"
                className="grid h-8 w-8 place-items-center rounded-md"
                style={{ color: "var(--text-2)" }}
              >
                <Pencil size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-8 w-8 place-items-center rounded-md"
              style={{ color: "var(--text-2)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <h2
          className="text-xl font-semibold leading-snug"
          style={{ letterSpacing: "-0.01em", color: "var(--text)" }}
        >
          {task.title}
        </h2>
        {clientsLabel && (
          <p className="mt-1 text-sm" style={{ color: "var(--text-2)" }}>
            {clientsLabel}
          </p>
        )}

        {task.description && (
          <p
            className="mt-4 text-sm leading-relaxed"
            style={{ color: "var(--text-2)" }}
          >
            {task.description}
          </p>
        )}

        {/* Meta grid */}
        <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <MetaCell icon={<Clock size={12} />} label="Hora límite"
            value={task.due_time ? task.due_time.slice(0, 5) : "—"} />
          <MetaCell icon={<User size={12} />} label="Cliente"
            value={firstClient ?? "—"} />
          <MetaCell icon={<Tag size={12} />} label="Tipo"
            value={task.task_type} />
          <MetaCell icon={<CircleDot size={12} />} label="Estado"
            value={STATUS_LABEL[task.status]} />
        </dl>

        {/* Context */}
        {task.context && (
          <div className="mt-5">
            <div
              className="mb-1.5 text-[11px] font-medium uppercase"
              style={{ letterSpacing: "0.04em", color: "var(--text-3)" }}
            >
              Contexto
            </div>
            <p
              className="rounded-md p-3 text-sm leading-relaxed"
              style={{ background: "var(--bg-2)", color: "var(--text-2)" }}
            >
              {task.context}
            </p>
          </div>
        )}

        {/* Blocked banner */}
        {isBlocked && (
          <div
            className="mt-5 flex items-start gap-2 rounded-md p-3 text-xs"
            style={{
              background: "var(--warn-soft)",
              color: "var(--warn)",
              border: "1px solid var(--warn)",
            }}
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold uppercase" style={{ letterSpacing: "0.04em" }}>
                Bloqueada
              </div>
              <div className="mt-0.5">Libera el bloqueo antes de marcarla completada.</div>
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mt-5">
          <div
            className="mb-1.5 text-[11px] font-medium uppercase"
            style={{ letterSpacing: "0.04em", color: "var(--text-3)" }}
          >
            Nota
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            rows={3}
            placeholder="Contexto, links, status…"
            className="w-full text-sm"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              padding: "8px 10px",
              color: "var(--text)",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 72,
            }}
          />
          {savingNote && (
            <div className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
              Guardando…
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleComplete}
            disabled={togglePending}
            className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60"
            style={{
              background: isDone ? "var(--text-3)" : "var(--brand-turquesa)",
            }}
          >
            {togglePending
              ? "Guardando…"
              : isDone
                ? "Marcar pendiente"
                : "Marcar completada"}
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="rounded-md px-4 py-2 text-sm"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-2)",
              }}
            >
              Reasignar
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function MetaCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-md p-2.5"
      style={{ border: "1px solid var(--border)", background: "var(--bg-2)" }}
    >
      <div
        className="mb-1 flex items-center gap-1.5 text-[10px] uppercase"
        style={{ letterSpacing: "0.04em", color: "var(--text-3)" }}
      >
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium tnum" style={{ color: "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}
