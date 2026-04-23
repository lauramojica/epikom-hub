"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import type { TaskRow } from "@/lib/tasks";

type Props = {
  task: TaskRow;
  weekStart: string;
  weekEnd: string;
  open: boolean;
  onClose: () => void;
};

const TASK_TYPES = [
  "General",
  "RRSS",
  "Reel",
  "Diseño",
  "Campaña",
  "Reunión",
  "Web",
  "Reporte",
];

export function EditTaskModal({ task, weekStart, weekEnd, open, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date);
  const [taskType, setTaskType] = useState(task.task_type);
  const [priority, setPriority] = useState<TaskRow["priority"]>(task.priority);
  const [clientsInput, setClientsInput] = useState(
    task.task_clients.map((c) => c.client_name).join(", ")
  );
  const [notionUrl, setNotionUrl] = useState(task.notion_url ?? "");

  useEffect(() => {
    if (!open) return;
    // Reset to latest task values each time it opens
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueDate(task.due_date);
    setTaskType(task.task_type);
    setPriority(task.priority);
    setClientsInput(task.task_clients.map((c) => c.client_name).join(", "));
    setNotionUrl(task.notion_url ?? "");
    setError(null);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, task, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          due_date: dueDate,
          task_type: taskType,
          priority,
          notion_url: notionUrl,
          clients: clientsInput
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar esta tarea? No se puede deshacer.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al eliminar");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(26,26,26,0.4)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg fade-in"
        style={{
          background: "var(--bg)",
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
          padding: 20,
          maxHeight: "95vh",
          overflowY: "auto",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ letterSpacing: "-0.01em", color: "var(--text)" }}
          >
            Editar tarea
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ color: "var(--text-2)" }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="Título">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input
                type="date"
                required
                value={dueDate}
                min={weekStart}
                max={weekEnd}
                onChange={(e) => setDueDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Prioridad">
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as TaskRow["priority"])
                }
                style={inputStyle}
              >
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Media</option>
                <option value="LOW">Baja</option>
              </select>
            </Field>
          </div>

          <Field label="Tipo">
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              style={inputStyle}
            >
              {Array.from(new Set([taskType, ...TASK_TYPES])).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Clientes (separa con comas)">
            <input
              value={clientsInput}
              onChange={(e) => setClientsInput(e.target.value)}
              placeholder="National, Shops@Caguas"
              style={inputStyle}
            />
          </Field>

          <Field label="Link de Notion">
            <input
              type="url"
              value={notionUrl}
              onChange={(e) => setNotionUrl(e.target.value)}
              placeholder="https://notion.so/…"
              style={inputStyle}
            />
          </Field>

          {error && (
            <div
              className="rounded-md p-2 text-xs"
              style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={remove}
              disabled={deleting || saving}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition disabled:opacity-60"
              style={{
                color: "var(--warn)",
                border: "1px solid var(--warn-soft)",
                background: "transparent",
              }}
            >
              <Trash2 size={13} />
              {deleting ? "Eliminando…" : "Eliminar"}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm"
                style={{ color: "var(--text-2)" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60"
                style={{ background: "var(--brand-turquesa)" }}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  padding: "8px 10px",
  fontSize: 13,
  color: "var(--text)",
  fontFamily: "inherit",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div
        className="mb-1 text-[11px] font-medium uppercase"
        style={{ letterSpacing: "0.04em", color: "var(--text-3)" }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}
