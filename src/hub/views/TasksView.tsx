"use client";
import { useMemo, useState } from "react";
import type { HubTask, TaskStatus, TaskPriority, Client, Project, User } from "../types";
import { useTasks } from "../useTasks";
import { todayPR } from "../adapters";
import Avatar from "../components/Avatar";
import DiscussionBoard from "../components/DiscussionBoard";
import FileUpload from "../components/FileUpload";

const STATUSES: { key: TaskStatus; label: string; color: string }[] = [
  { key: "pendiente", label: "Pendiente", color: "#8b93a1" },
  { key: "en_proceso", label: "En proceso", color: "#31b498" },
  { key: "bloqueada", label: "Bloqueada", color: "#ef4444" },
  { key: "completada", label: "Completada", color: "#dbfa45" },
];

const PRIORITIES: { key: TaskPriority; label: string; color: string }[] = [
  { key: "baja", label: "Baja", color: "#8b93a1" },
  { key: "media", label: "Media", color: "#31b498" },
  { key: "alta", label: "Alta", color: "#f59e0b" },
  { key: "urgente", label: "Urgente", color: "#ef4444" },
];

const inputCls = "w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50";

export default function TasksView({ clients, projects, users, authUserId, canEdit, onConfetti, onToast }: {
  clients: Client[]; projects: Project[]; users: User[];
  authUserId: string; canEdit: boolean;
  onConfetti?: () => void;
  onToast?: (m: string, k?: "success" | "error" | "info") => void;
}) {
  const t = useTasks(authUserId);
  const today = todayPR();
  const [filter, setFilter] = useState<"mine" | "all" | "unassigned" | "done">("mine");
  const [clientFilter, setClientFilter] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<HubTask | null>(null);

  const visible = useMemo(() => {
    let list = t.tasks;
    if (clientFilter) list = list.filter((x) => x.clientId === clientFilter);
    if (filter === "mine") list = list.filter((x) => x.assigneeId === authUserId && x.status !== "completada");
    else if (filter === "unassigned") list = list.filter((x) => !x.assigneeId && x.status !== "completada");
    else if (filter === "done") list = list.filter((x) => x.status === "completada");
    else list = list.filter((x) => x.status !== "completada");
    return list;
  }, [t.tasks, filter, clientFilter, authUserId]);

  const overdue = visible.filter((x) => x.dueDate && x.dueDate < today);
  const rest = visible.filter((x) => !x.dueDate || x.dueDate >= today);

  const counts = {
    mine: t.tasks.filter((x) => x.assigneeId === authUserId && x.status !== "completada").length,
    unassigned: t.tasks.filter((x) => !x.assigneeId && x.status !== "completada").length,
  };

  const complete = async (id: string) => {
    const done = await t.toggleComplete(id);
    if (done) { onConfetti?.(); onToast?.("✓ Tarea completada 🎉", "success"); }
  };

  if (t.loading) {
    return <div className="p-4 md:p-8 space-y-3">{[0,1,2].map((i) => <div key={i} className="h-16 rounded-xl skeleton-base" />)}</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Lo que hay que hacer</p>
          <h1 className="font-display text-3xl md:text-5xl font-700 tracking-tight text-ink uppercase">Tareas</h1>
        </div>
        {canEdit && (
          <button onClick={() => setShowNew(true)} className="text-xs font-mono px-4 py-2.5 rounded-lg bg-primary text-bg font-600 hover:opacity-90 whitespace-nowrap w-fit">
            + Nueva tarea
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-surface border border-line rounded-xl p-1">
          {([
            ["mine", `Mías ${counts.mine > 0 ? `(${counts.mine})` : ""}`],
            ["all", "Todas"],
            ["unassigned", `Sin asignar ${counts.unassigned > 0 ? `(${counts.unassigned})` : ""}`],
            ["done", "Completadas"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wide transition-all whitespace-nowrap ${
                filter === k ? "bg-primary text-bg font-600" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none cursor-pointer font-mono"
        >
          <option value="" className="bg-surface">Todas las cuentas</option>
          {clients.map((c) => <option key={c.id} value={c.id} className="bg-surface">{c.company}</option>)}
        </select>
      </div>

      {/* Lista */}
      {visible.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl py-12 text-center">
          <p className="text-3xl mb-2">{filter === "done" ? "📋" : "🎉"}</p>
          <p className="text-sm font-600 text-ink">
            {filter === "mine" ? "Nada pendiente" : filter === "unassigned" ? "Todo asignado" : filter === "done" ? "Aún no hay completadas" : "Sin tareas"}
          </p>
          <p className="text-xs text-muted mt-1">
            {filter === "mine" ? "Estás al día." : "Crea una con el botón de arriba."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div>
              <p className="font-mono text-[10px] text-danger uppercase tracking-widest mb-2">
                Atrasadas ({overdue.length})
              </p>
              <div className="space-y-2">
                {overdue.map((task) => (
                  <TaskRow key={task.id} task={task} clients={clients} users={users} today={today}
                    onComplete={() => complete(task.id)} onOpen={() => setSelected(task)} />
                ))}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              {overdue.length > 0 && (
                <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Próximas</p>
              )}
              <div className="space-y-2">
                {rest.map((task) => (
                  <TaskRow key={task.id} task={task} clients={clients} users={users} today={today}
                    onComplete={() => complete(task.id)} onOpen={() => setSelected(task)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showNew && (
        <TaskModal
          clients={clients} projects={projects} users={users} authUserId={authUserId}
          onSave={(data) => {
            t.addTask(data).then(() => onToast?.("✓ Tarea creada.", "success")).catch(() => onToast?.("✕ No se pudo crear.", "error"));
            setShowNew(false);
          }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {selected && (
        <TaskModal
          task={t.tasks.find((x) => x.id === selected.id) ?? selected}
          clients={clients} projects={projects} users={users} authUserId={authUserId}
          onSave={(data) => {
            t.updateTask(selected.id, data).then(() => onToast?.("✓ Guardado.", "success")).catch(() => onToast?.("✕ No se pudo guardar.", "error"));
            setSelected(null);
          }}
          onDelete={canEdit ? () => {
            t.deleteTask(selected.id).then(() => onToast?.("✓ Tarea eliminada.", "success"));
            setSelected(null);
          } : undefined}
          onCancel={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ─── Fila de tarea ───────────────────────────────────────────────────────── */
function TaskRow({ task, clients, users, today, onComplete, onOpen }: {
  task: HubTask; clients: Client[]; users: User[]; today: string;
  onComplete: () => void; onOpen: () => void;
}) {
  const client = clients.find((c) => c.id === task.clientId);
  const assignee = users.find((u) => u.id === task.assigneeId);
  const st = STATUSES.find((s) => s.key === task.status)!;
  const pr = PRIORITIES.find((p) => p.key === task.priority)!;
  const done = task.status === "completada";
  const late = task.dueDate && task.dueDate < today && !done;

  return (
    <div
      onClick={onOpen}
      className={`bg-surface border border-line rounded-xl p-3 cursor-pointer hover-lift animate-card-in flex items-start gap-3 ${done ? "opacity-60" : ""}`}
      style={{ borderLeft: `3px solid ${late ? "#ef4444" : client?.color ?? st.color}` }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
          done ? "bg-accent border-accent" : "border-line hover:border-primary"
        }`}
        title={done ? "Marcar como pendiente" : "Marcar completada"}
      >
        {done && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#0a0a0d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          {client && <span className="text-[10px] font-600" style={{ color: client.color }}>{client.company}</span>}
          {task.source === "email" && <span className="text-[9px] font-mono text-muted" title={`Creada por email de ${task.sourceEmail}`}>📧</span>}
          {task.priority !== "media" && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${pr.color}18`, color: pr.color }}>
              {pr.label}
            </span>
          )}
        </div>
        <p className={`text-sm font-700 text-ink leading-snug ${done ? "line-through" : ""}`}>{task.title}</p>
        {task.description && <p className="text-xs text-muted leading-relaxed mt-0.5 line-clamp-2">{task.description}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[9px] font-mono flex items-center gap-1" style={{ color: st.color }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: st.color }} />
            {st.label}
          </span>
          {task.dueDate && (
            <span className={`text-[9px] font-mono ${late ? "text-danger" : "text-muted"}`}>
              {new Intl.DateTimeFormat("es-PR", { day: "numeric", month: "short", timeZone: "America/Puerto_Rico" }).format(new Date(task.dueDate + "T12:00:00"))}
              {task.dueTime && ` · ${task.dueTime}`}
              {late && " · atrasada"}
            </span>
          )}
          {task.attachments.length > 0 && (
            <span className="text-[9px] font-mono text-muted">📎 {task.attachments.length}</span>
          )}
        </div>
      </div>

      {assignee ? (
        <Avatar initials={assignee.initials} color={assignee.color} size="xs" src={assignee.avatarUrl} className="mt-0.5" />
      ) : (
        <span className="text-[9px] font-mono text-muted/50 mt-1 whitespace-nowrap">sin asignar</span>
      )}
    </div>
  );
}

/* ─── Modal de tarea ──────────────────────────────────────────────────────── */
function TaskModal({ task, clients, projects, users, authUserId, onSave, onDelete, onCancel }: {
  task?: HubTask;
  clients: Client[]; projects: Project[]; users: User[]; authUserId: string;
  onSave: (t: Partial<HubTask>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Partial<HubTask>>(task ?? {
    title: "", description: "", status: "pendiente", priority: "media",
    tags: [], attachments: [],
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const upd = (k: keyof HubTask, v: unknown) => setDraft((p) => ({ ...p, [k]: v }));

  const clientProjects = projects.filter((p) => !draft.clientId || p.clientId === draft.clientId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6" onClick={onCancel}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-2xl overflow-hidden animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display text-2xl font-700 uppercase text-ink">
            {task ? "Tarea" : "Nueva tarea"}
          </h2>
          <button onClick={onCancel} className="text-muted hover:text-ink text-lg">✕</button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {task?.source === "email" && (
            <p className="text-[11px] text-muted bg-surface2 border border-line rounded-lg px-3 py-2">
              📧 Creada desde un correo de <span className="text-ink font-mono">{task.sourceEmail}</span>
            </p>
          )}

          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Título *</label>
            <input autoFocus={!task} value={draft.title ?? ""} onChange={(e) => upd("title", e.target.value)} placeholder="¿Qué hay que hacer?" className={inputCls} />
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Detalles</label>
            <textarea value={draft.description ?? ""} onChange={(e) => upd("description", e.target.value)} rows={3} placeholder="Contexto, enlaces, lo que haga falta…" className={inputCls + " resize-none"} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Cuenta</label>
              <select value={draft.clientId ?? ""} onChange={(e) => { upd("clientId", e.target.value); upd("projectId", ""); }} className={inputCls + " cursor-pointer"}>
                <option value="" className="bg-surface">Sin cuenta</option>
                {clients.map((c) => <option key={c.id} value={c.id} className="bg-surface">{c.company}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Proyecto</label>
              <select value={draft.projectId ?? ""} onChange={(e) => upd("projectId", e.target.value)} className={inputCls + " cursor-pointer"}>
                <option value="" className="bg-surface">Sin proyecto</option>
                {clientProjects.map((p) => <option key={p.id} value={p.id} className="bg-surface">{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Asignar a</label>
              <select value={draft.assigneeId ?? ""} onChange={(e) => upd("assigneeId", e.target.value)} className={inputCls + " cursor-pointer"}>
                <option value="" className="bg-surface">Sin asignar</option>
                {users.filter((u) => u.role !== "client" && u.role !== "cliente").map((u) => (
                  <option key={u.id} value={u.id} className="bg-surface">{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Prioridad</label>
              <div className="flex gap-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => upd("priority", p.key)}
                    className={`flex-1 text-[10px] font-mono py-2 rounded-lg border transition-all ${
                      draft.priority === p.key ? "border-current" : "border-line text-muted hover:text-ink"
                    }`}
                    style={draft.priority === p.key ? { color: p.color, background: `${p.color}12` } : undefined}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Fecha límite</label>
              <div className="flex gap-2">
                <input type="date" value={draft.dueDate ?? ""} onChange={(e) => upd("dueDate", e.target.value)} className={inputCls} />
                <input type="time" value={draft.dueTime ?? ""} onChange={(e) => upd("dueTime", e.target.value)} className={inputCls + " w-28"} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Estado</label>
              <select value={draft.status ?? "pendiente"} onChange={(e) => upd("status", e.target.value)} className={inputCls + " cursor-pointer"}>
                {STATUSES.map((s) => <option key={s.key} value={s.key} className="bg-surface">{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Archivos</label>
            <FileUpload
              files={draft.attachments ?? []}
              onAdd={(f) => upd("attachments", [...(draft.attachments ?? []), f])}
              onRemove={(id) => upd("attachments", (draft.attachments ?? []).filter((x) => x.id !== id))}
              compact
            />
          </div>

          {task && (
            <div className="pt-4 border-t border-line">
              <DiscussionBoard entityType="deliverable" entityId={task.id} users={users} currentUserId={authUserId} compact />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line flex items-center justify-between">
          {onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-danger">¿Eliminar?</span>
                <button onClick={onDelete} className="text-xs font-mono px-3 py-1.5 rounded-lg bg-danger text-white font-600">Sí</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs font-mono px-3 py-1.5 rounded-lg border border-line text-muted">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-xs font-mono text-danger hover:opacity-80">Eliminar</button>
            )
          ) : <span />}
          <div className="flex gap-3">
            <button onClick={onCancel} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink">Cancelar</button>
            <button
              onClick={() => draft.title?.trim() && onSave(draft)}
              disabled={!draft.title?.trim()}
              className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90 disabled:opacity-40"
            >
              {task ? "Guardar" : "Crear tarea"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
