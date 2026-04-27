"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

type CrewMember = { id: string; name: string; slug: string };

type Props = {
  weekId: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  crew: CrewMember[];
  defaultAssigneeId?: string;
  defaultAssigneeIds?: string[];
  defaultDueDate?: string;
  label?: string;
  variant?: "solid" | "outline";
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

export function NewTaskModal({
  weekId,
  weekStart,
  weekEnd,
  crew,
  defaultAssigneeId,
  defaultAssigneeIds,
  defaultDueDate,
  label = "Nueva tarea",
  variant = "outline",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedIds, setAssignedIds] = useState<string[]>(
    defaultAssigneeIds && defaultAssigneeIds.length > 0
      ? defaultAssigneeIds
      : defaultAssigneeId
      ? [defaultAssigneeId]
      : crew[0]?.id
      ? [crew[0].id]
      : []
  );
  const [dueDate, setDueDate] = useState(defaultDueDate ?? weekStart);
  const [taskType, setTaskType] = useState("General");
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [dueTime, setDueTime] = useState("");
  const [clientsInput, setClientsInput] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [context, setContext] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function reset() {
    setTitle("");
    setDescription("");
    setAssignedIds(
      defaultAssigneeIds && defaultAssigneeIds.length > 0
        ? defaultAssigneeIds
        : defaultAssigneeId
        ? [defaultAssigneeId]
        : crew[0]?.id
        ? [crew[0].id]
        : []
    );
    setDueDate(defaultDueDate ?? weekStart);
    setTaskType("General");
    setPriority("MEDIUM");
    setDueTime("");
    setClientsInput("");
    setNotionUrl("");
    setContext("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          assigned_to: assignedIds[0] ?? "",
          assignees: assignedIds,
          due_date: dueDate,
          due_time: dueTime || null,
          task_type: taskType,
          priority,
          notion_url: notionUrl,
          context: context || null,
          clients: clientsInput
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          week_id: weekId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear");
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition"
        style={
          variant === "solid"
            ? { background: "var(--brand-turquesa)", color: "#fff" }
            : {
                background: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }
        }
      >
        <Plus size={14} strokeWidth={2.5} />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(26,26,26,0.4)" }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg fade-in"
            style={{
              background: "var(--bg)",
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-md)",
              padding: "20px",
              maxHeight: "95vh",
              overflowY: "auto",
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                className="text-base font-semibold"
                style={{ letterSpacing: "-0.01em", color: "var(--text)" }}
              >
                Nueva tarea
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
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
                  placeholder="Ej. Diseñar arte para historia del martes"
                  style={inputStyle}
                  autoFocus
                />
              </Field>

              <Field label="Descripción (opcional)">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Contexto, links, detalles…"
                  style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
                />
              </Field>

              <Field label="Asignar a (puede ser más de uno)">
                <AssigneeMultiSelect
                  crew={crew}
                  value={assignedIds}
                  onChange={setAssignedIds}
                />
              </Field>

              <div className="grid grid-cols-1 gap-3">
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
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Hora (opcional)">
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Tipo">
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    style={inputStyle}
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Prioridad">
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as "HIGH" | "MEDIUM" | "LOW")
                    }
                    style={inputStyle}
                  >
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Media</option>
                    <option value="LOW">Baja</option>
                  </select>
                </Field>
              </div>

              <Field label="Clientes (separa con comas)">
                <input
                  value={clientsInput}
                  onChange={(e) => setClientsInput(e.target.value)}
                  placeholder="National, Shops@Caguas"
                  style={inputStyle}
                />
              </Field>

              <Field label="Contexto (opcional)">
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={2}
                  placeholder="Historia previa, quién pidió qué, dependencias…"
                  style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
                />
              </Field>

              <Field label="Link de Notion (opcional)">
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

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60"
                  style={{ background: "var(--brand-turquesa)" }}
                >
                  {saving ? "Creando…" : "Crear tarea"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-4 py-2 text-sm"
                  style={{ color: "var(--text-2)" }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function AssigneeMultiSelect({
  crew,
  value,
  onChange,
}: {
  crew: CrewMember[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = crew.filter((c) => value.includes(c.id));
  const available = crew.filter((c) => !value.includes(c.id));

  function add(id: string) {
    if (!id) return;
    onChange([...value, id]);
  }
  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-md p-1.5"
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        minHeight: 36,
      }}
    >
      {selected.map((c, i) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[12px]"
          style={{
            background: i === 0 ? "var(--brand-turquesa-soft)" : "var(--bg)",
            color: i === 0 ? "var(--brand-turquesa-ink)" : "var(--text)",
            border: "1px solid var(--border)",
          }}
          title={i === 0 ? "Asignado principal" : undefined}
        >
          {c.name.split(" ")[0]}
          <button
            type="button"
            onClick={() => remove(c.id)}
            aria-label={`Quitar ${c.name}`}
            style={{ color: "var(--text-3)", lineHeight: 1 }}
          >
            ×
          </button>
        </span>
      ))}
      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => add(e.target.value)}
          className="text-[12px]"
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-3)",
            fontFamily: "inherit",
            padding: "2px 4px",
          }}
        >
          <option value="">+ Añadir…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
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
