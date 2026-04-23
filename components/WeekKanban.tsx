"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertTriangle, Sparkles, Pencil } from "lucide-react";
import {
  PRIORITY_LABEL,
  type TaskRow,
  formatPrettyDate,
} from "@/lib/tasks";
import { EditTaskModal } from "./EditTaskModal";

type Props = {
  tasks: TaskRow[];
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string;
  today: string;
  rotationBlock?: string | null;
  rotationLabel?: string;
};

const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export function WeekKanban({
  tasks,
  weekStart,
  weekEnd,
  today,
  rotationBlock,
  rotationLabel,
}: Props) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const types = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.task_type))).sort(),
    [tasks]
  );
  const clients = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks)
      for (const c of t.task_clients) set.add(c.client_name);
    return Array.from(set).sort();
  }, [tasks]);

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (typeFilter !== "all" && t.task_type !== typeFilter) return false;
        if (
          clientFilter !== "all" &&
          !t.task_clients.some((c) => c.client_name === clientFilter)
        )
          return false;
        return true;
      }),
    [tasks, typeFilter, clientFilter]
  );

  const dayDates = useMemo(() => {
    const [y, m, d] = weekStart.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, d));
    return Array.from({ length: 5 }, (_, i) => {
      const dt = new Date(start);
      dt.setUTCDate(start.getUTCDate() + i);
      return dt.toISOString().slice(0, 10);
    });
  }, [weekStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const day of dayDates) map.set(day, []);
    for (const t of filtered) {
      if (map.has(t.due_date)) map.get(t.due_date)!.push(t);
    }
    return map;
  }, [filtered, dayDates]);

  const overdue = useMemo(
    () =>
      filtered.filter(
        (t) => t.status !== "completada" && t.due_date < today
      ),
    [filtered, today]
  );

  async function moveTaskToDay(taskId: string, newDate: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.due_date === newDate) return;
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ due_date: newDate }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <>
      {/* Filters row */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div
          className="text-[11px] font-medium uppercase"
          style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
        >
          Filtros
        </div>
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "all", label: "Todos los tipos" },
            ...types.map((t) => ({ value: t, label: t })),
          ]}
        />
        <Select
          value={clientFilter}
          onChange={setClientFilter}
          options={[
            { value: "all", label: "Todos los clientes" },
            ...clients.map((c) => ({ value: c, label: c })),
          ]}
        />
      </div>

      {/* Rotation block */}
      {rotationBlock && (
        <div
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg p-4"
          style={{
            background: "var(--brand-violeta-soft)",
            border: "1px solid transparent",
            borderRadius: "var(--r-md)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: "rgba(255,255,255,0.35)" }}
            >
              <Sparkles
                size={14}
                style={{ color: "var(--brand-violeta-ink)" }}
              />
            </div>
            <div>
              <div
                className="text-[11px] font-medium uppercase"
                style={{
                  letterSpacing: "0.08em",
                  color: "var(--brand-violeta-ink)",
                }}
              >
                Tu bloque National
              </div>
              <div
                className="text-sm font-medium"
                style={{ color: "var(--brand-violeta-ink)" }}
              >
                {rotationBlock}
              </div>
            </div>
          </div>
          {rotationLabel && (
            <div
              className="text-[12px]"
              style={{ color: "var(--brand-violeta-ink)", opacity: 0.8 }}
            >
              Rotación · {rotationLabel}
            </div>
          )}
        </div>
      )}

      {/* Overdue banner */}
      {overdue.length > 0 && (
        <div
          className="mb-6 rounded-lg p-4"
          style={{
            background: "var(--warn-soft)",
            border: "1px solid var(--warn)",
            borderRadius: "var(--r-md)",
          }}
        >
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: "var(--warn)" }} />
            <div
              className="text-[11px] font-semibold uppercase"
              style={{ letterSpacing: "0.08em", color: "var(--warn)" }}
            >
              Atrasadas · {overdue.length}
            </div>
          </div>
          <div className="space-y-2">
            {overdue.map((t) => (
              <OverdueRow key={t.id} task={t} onEdit={() => setEditing(t)} />
            ))}
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div
        className="grid gap-4 overflow-x-auto"
        style={{ gridTemplateColumns: "repeat(5, minmax(180px, 1fr))" }}
      >
        {dayDates.map((date, i) => {
          const items = byDay.get(date) ?? [];
          const done = items.filter((t) => t.status === "completada").length;
          const pct = items.length === 0 ? 0 : Math.round((done / items.length) * 100);
          const isToday = date === today;
          const isDropTarget = dragOverDay === date;
          const dayNum = Number(date.split("-")[2]);
          return (
            <section
              key={date}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverDay !== date) setDragOverDay(date);
              }}
              onDragLeave={() => {
                if (dragOverDay === date) setDragOverDay(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDay(null);
                const id = e.dataTransfer.getData("text/plain") || dragTaskId;
                if (id) moveTaskToDay(id, date);
                setDragTaskId(null);
              }}
              style={{
                borderRadius: "var(--r-md)",
                transition: "background 120ms",
                background: isDropTarget
                  ? "var(--brand-turquesa-soft)"
                  : "transparent",
                padding: isDropTarget ? 6 : 0,
              }}
            >
              <div className="mb-2 flex items-baseline gap-2">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {DAY_LABELS[i]}
                </h3>
                <span className="tnum text-sm" style={{ color: "var(--text-3)" }}>
                  {dayNum}
                </span>
                {isToday && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                    style={{
                      background: "var(--brand-turquesa-soft)",
                      color: "var(--brand-turquesa-ink)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Hoy
                  </span>
                )}
                <span
                  className="ml-auto tnum text-xs"
                  style={{ color: "var(--text-3)" }}
                >
                  {done}/{items.length}
                </span>
              </div>
              <div
                className="mb-3 h-[3px] w-full overflow-hidden rounded-full"
                style={{ background: "var(--bg-3)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: "var(--brand-turquesa)",
                  }}
                />
              </div>
              <div className="space-y-2">
                {items.map((t) => (
                  <MiniCard
                    key={t.id}
                    task={t}
                    onEdit={() => setEditing(t)}
                    onDragStart={() => setDragTaskId(t.id)}
                    onDragEnd={() => setDragTaskId(null)}
                    isDragging={dragTaskId === t.id}
                  />
                ))}
                {items.length === 0 && (
                  <div
                    className="rounded-md border border-dashed py-4 text-center text-[11px]"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-3)",
                    }}
                  >
                    —
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 text-center text-[11px]" style={{ color: "var(--text-3)" }}>
        {formatPrettyDate(weekStart)} → {formatPrettyDate(weekEnd)}
      </div>

      {editing && (
        <EditTaskModal
          task={editing}
          weekStart={weekStart}
          weekEnd={weekEnd}
          open={true}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: "6px 30px 6px 10px",
        color: "var(--text)",
        fontFamily: "inherit",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function MiniCard({
  task,
  onEdit,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: TaskRow;
  onEdit: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optStatus, setOptStatus] = useState(task.status);

  const completed = optStatus === "completada";
  const blocked = optStatus === "bloqueada";
  const clients = task.task_clients.map((c) => c.client_name).join(" · ");

  const bg = completed
    ? "var(--brand-lima-soft)"
    : blocked
      ? "var(--warn-soft)"
      : "var(--bg)";

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const next: TaskRow["status"] = completed ? "pendiente" : "completada";
    setOptStatus(next);
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next === "completada" }),
      });
      if (!res.ok) {
        setOptStatus(task.status);
        return;
      }
      router.refresh();
    });
  }

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={isPending ? "opacity-80" : ""}
      style={{
        background: bg,
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: "10px 12px",
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
      }}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={completed ? "Marcar pendiente" : "Marcar completada"}
          className="mt-0.5 grid place-items-center"
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            border: `1.5px solid ${
              completed ? "var(--brand-turquesa)" : "var(--border-strong)"
            }`,
            background: completed ? "var(--brand-turquesa)" : "transparent",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {completed && <Check size={10} strokeWidth={3} />}
        </button>
        <div
          className="flex-1 text-[13px] font-medium leading-snug"
          style={{
            textDecoration: completed ? "line-through" : "none",
            color: completed ? "var(--text-3)" : "var(--text)",
            overflowWrap: "anywhere",
          }}
        >
          {task.title}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label="Editar tarea"
          className="shrink-0 rounded p-0.5 transition hover:opacity-100"
          style={{ color: "var(--text-3)", opacity: 0.6 }}
        >
          <Pencil size={12} />
        </button>
      </div>
      {clients && (
        <div
          className="mt-1.5 text-[11px]"
          style={{ color: "var(--text-3)", paddingLeft: 24 }}
        >
          {clients}
        </div>
      )}
      <div className="mt-2 flex items-center gap-1.5" style={{ paddingLeft: 24 }}>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            background:
              task.priority === "HIGH"
                ? "var(--brand-violeta-soft)"
                : task.priority === "MEDIUM"
                  ? "var(--brand-turquesa-soft)"
                  : "var(--bg-3)",
            color:
              task.priority === "HIGH"
                ? "var(--brand-violeta-ink)"
                : task.priority === "MEDIUM"
                  ? "var(--brand-turquesa-ink)"
                  : "var(--text-2)",
            letterSpacing: "0.02em",
          }}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
        <span
          className="text-[10px] uppercase"
          style={{ letterSpacing: "0.04em", color: "var(--text-3)" }}
        >
          {task.task_type}
        </span>
      </div>
    </article>
  );
}

function OverdueRow({
  task,
  onEdit,
}: {
  task: TaskRow;
  onEdit: () => void;
}) {
  const clients = task.task_clients.map((c) => c.client_name).join(" · ");
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md p-2.5"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-medium leading-tight"
          style={{ color: "var(--text)" }}
        >
          {task.title}
        </div>
        <div className="mt-0.5 text-[11px]" style={{ color: "var(--text-3)" }}>
          {clients && <>{clients} · </>}vencida {formatPrettyDate(task.due_date)}
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar tarea"
        className="shrink-0 rounded p-1"
        style={{ color: "var(--text-3)" }}
      >
        <Pencil size={13} />
      </button>
      <span
        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
        style={{
          background:
            task.priority === "HIGH"
              ? "var(--brand-violeta-soft)"
              : "var(--brand-turquesa-soft)",
          color:
            task.priority === "HIGH"
              ? "var(--brand-violeta-ink)"
              : "var(--brand-turquesa-ink)",
        }}
      >
        {PRIORITY_LABEL[task.priority]}
      </span>
    </div>
  );
}
