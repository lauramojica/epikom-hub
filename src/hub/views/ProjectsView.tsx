import { useState } from "react";
import type { Project, Client, User, DeliverableStatus, ProjectPhase, AttachedFile } from "../types";
import FileUpload from "../components/FileUpload";
import EmojiReactions from "../components/EmojiReactions";

interface Props {
  projects: Project[];
  clients: Client[];
  users: User[];
  onUpdateDeliverable: (projectId: string, delivId: string, status: DeliverableStatus, reason?: string) => void;
  onAddDeliverableFile: (projectId: string, delivId: string, file: AttachedFile) => void;
  onRemoveDeliverableFile: (projectId: string, delivId: string, fileId: string) => void;
  onMoveProjectPhase?: (projectId: string, phase: ProjectPhase) => void;
  onAddProject?: (project: Omit<Project, "id" | "phases" | "deliverables">) => void;
}

const PROJECT_COLORS = ["#31b498","#a78bfa","#f59e0b","#ef4444","#22c55e","#e040fb","#dbfa45","#3b82f6"];

function NewProjectModal({ clients, users, onConfirm, onCancel }: {
  clients: Client[];
  users: User[];
  onConfirm: (p: Omit<Project, "id" | "phases" | "deliverables">) => void;
  onCancel: () => void;
}) {
  const today = "2026-08-29";
  const [form, setForm] = useState({
    name: "",
    clientId: clients[0]?.id ?? "",
    description: "",
    startDate: today,
    endDate: "2026-12-31",
    budget: "",
    color: PROJECT_COLORS[0],
    status: "active" as "active" | "paused" | "completed",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0 && form.clientId;

  const handleSubmit = () => {
    if (!valid) return;
    onConfirm({
      name: form.name.trim(),
      clientId: form.clientId,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: Number(form.budget) || 0,
      color: form.color,
      status: form.status,
      currentPhase: "discovery",
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface border border-line rounded-2xl w-full max-w-lg shadow-2xl animate-pop-in overflow-hidden">
        <div className="px-6 py-5 border-b border-line flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest">Nuevo</p>
            <h2 className="font-display text-2xl font-700 uppercase text-ink">Crear Proyecto</h2>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg border border-line text-muted hover:text-ink flex items-center justify-center text-lg">×</button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1.5">Nombre del proyecto *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Campaña Q4 Verano" className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/50 transition-colors" />
          </div>
          {/* Client */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1.5">Cliente *</label>
            <select value={form.clientId} onChange={(e) => set("clientId", e.target.value)} className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/50 transition-colors appearance-none">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1.5">Inicio</label>
              <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1.5">Fin estimado</label>
              <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/50" />
            </div>
          </div>
          {/* Budget */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1.5">Presupuesto ($)</label>
            <input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="0" className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/50" />
          </div>
          {/* Description */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1.5">Descripción</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="¿De qué va este proyecto?" className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/50 resize-none leading-relaxed" />
          </div>
          {/* Color */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1.5">Color del proyecto</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button key={c} onClick={() => set("color", c)} className="w-7 h-7 rounded-full transition-all" style={{ background: c, outline: form.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px", opacity: form.color === c ? 1 : 0.4 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-line flex justify-end gap-2 bg-surface2">
          <button onClick={onCancel} className="text-xs font-mono px-4 py-2 rounded-xl border border-line text-muted hover:text-ink transition-all">Cancelar</button>
          <button onClick={handleSubmit} disabled={!valid} className={`text-xs font-mono px-6 py-2 rounded-xl font-600 transition-all ${valid ? "bg-primary text-bg hover:opacity-90" : "bg-surface border border-line text-muted/40 cursor-not-allowed"}`}>
            Crear proyecto ✓
          </button>
        </div>
      </div>
    </div>
  );
}

const PHASES: { key: ProjectPhase; label: string; short: string }[] = [
  { key: "discovery", label: "Discovery", short: "DIS" },
  { key: "strategy", label: "Estrategia", short: "STR" },
  { key: "production", label: "Producción", short: "PRD" },
  { key: "review", label: "Revisión", short: "REV" },
  { key: "launch", label: "Lanzamiento", short: "LNZ" },
  { key: "reporting", label: "Reporte", short: "RPT" },
];

const statusColors: Record<string, string> = {
  active: "#31b498", paused: "#f59e0b", completed: "#dbfa45",
};
const delivColors: Record<string, string> = {
  pending: "#6b6b8a", "in-review": "#f59e0b", approved: "#22c55e", rejected: "#ef4444",
};

// SVG bezier phase journey
function PhaseJourney({ phases, currentPhase, color }: { phases: Project["phases"]; currentPhase: ProjectPhase; color: string }) {
  const phaseKeys = PHASES.map((p) => p.key);
  const currentIdx = phaseKeys.indexOf(currentPhase);
  const W = 480, H = 80;
  const xs = PHASES.map((_, i) => 20 + (i * (W - 40)) / (PHASES.length - 1));
  const ys = [60, 20, 60, 20, 60, 20]; // alternating

  const path = xs.map((x, i) => {
    if (i === 0) return `M${x},${ys[i]}`;
    const cx = (xs[i - 1] + x) / 2;
    return `C${cx},${ys[i - 1]} ${cx},${ys[i]} ${x},${ys[i]}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
      <path d={path} fill="none" stroke="#26262e" strokeWidth="2" />
      <path
        d={xs.slice(0, currentIdx + 1).map((x, i) => {
          if (i === 0) return `M${x},${ys[i]}`;
          const cx = (xs[i - 1] + x) / 2;
          return `C${cx},${ys[i - 1]} ${cx},${ys[i]} ${x},${ys[i]}`;
        }).join(" ")}
        fill="none" stroke={color} strokeWidth="2.5" />
      {PHASES.map((ph, i) => {
        const completed = phaseKeys.indexOf(ph.key) <= currentIdx;
        const isCurrent = ph.key === currentPhase;
        return (
          <g key={ph.key}>
            <circle cx={xs[i]} cy={ys[i]} r={isCurrent ? 8 : 5} fill={completed ? color : "#121216"} stroke={completed ? color : "#26262e"} strokeWidth="1.5" />
            {isCurrent && <circle cx={xs[i]} cy={ys[i]} r={13} fill="none" stroke={color} strokeWidth="1" opacity="0.4" />}
            <text x={xs[i]} y={ys[i] + (ys[i] < 40 ? -14 : 16)} textAnchor="middle" fontSize="7" fill={completed ? "#f2f3f6" : "#8b93a1"} fontFamily="JetBrains Mono, monospace">
              {ph.short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DeliverableRow({ d, projectId, onUpdate, onAddFile, onRemoveFile }: {
  d: Project["deliverables"][0]; projectId: string;
  onUpdate: Props["onUpdateDeliverable"];
  onAddFile: (f: AttachedFile) => void;
  onRemoveFile: (id: string) => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [showFiles, setShowFiles] = useState(false);

  return (<>
    <div className="flex items-center gap-3 px-5 py-3 border-b border-line last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-500 text-ink">{d.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] font-mono text-muted">Vence: {d.dueDate.slice(5)}</span>
          {d.timeSpent > 0 && <span className="text-[10px] font-mono text-muted">{d.timeSpent}h</span>}
          {d.rejectionReason && <span className="text-[10px] text-danger">{d.rejectionReason}</span>}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <EmojiReactions compact />
      </div>
      <span className="text-[10px] font-mono px-2 py-0.5 rounded border flex-shrink-0" style={{ borderColor: `${delivColors[d.status]}40`, color: delivColors[d.status] }}>
        {d.status}
      </span>
      {d.status === "in-review" && !showReject && (
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => onUpdate(projectId, d.id, "approved")} className="text-[10px] font-mono px-2.5 py-1 rounded bg-success/10 text-success border border-success/30 hover:bg-success/20">✓ Aprobar</button>
          <button onClick={() => setShowReject(true)} className="text-[10px] font-mono px-2.5 py-1 rounded bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20">✕ Rechazar</button>
        </div>
      )}
      {showReject && (
        <div className="flex gap-1.5 flex-shrink-0">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Razón..." className="text-xs bg-surface2 border border-line rounded px-2 py-1 text-ink outline-none w-32 focus:border-danger/50" />
          <button onClick={() => { onUpdate(projectId, d.id, "rejected", reason); setShowReject(false); }} className="text-[10px] font-mono px-2 py-1 rounded bg-danger/10 text-danger border border-danger/30">OK</button>
          <button onClick={() => setShowReject(false)} className="text-[10px] font-mono text-muted">×</button>
        </div>
      )}
      {d.status === "pending" && (
        <button onClick={() => onUpdate(projectId, d.id, "in-review")} className="text-[10px] font-mono px-2.5 py-1 rounded border border-line text-muted hover:text-ink flex-shrink-0">→ Revisión</button>
      )}
      <button onClick={() => setShowFiles((v) => !v)} className="text-[10px] font-mono px-2 py-1 rounded border border-line text-muted hover:text-ink flex-shrink-0 flex items-center gap-1">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 2H7L9 4V9H1V2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M7 2V4H9" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
        {(d.attachedFiles || []).length > 0 && <span>{(d.attachedFiles || []).length}</span>}
      </button>
    </div>
    {showFiles && (
      <div className="px-5 pb-3">
        <FileUpload files={d.attachedFiles || []} onAdd={onAddFile} onRemove={onRemoveFile} compact />
      </div>
    )}
  </>);
}

// ─── Gantt / Timeline view ─────────────────────────────────────────────────────
function GanttView({ projects, clients }: { projects: Project[]; clients: Client[] }) {
  // Find overall date range across all projects
  const allDates = projects.flatMap((p) => [p.startDate, p.endDate]);
  const minDate = allDates.reduce((a, b) => (a < b ? a : b), "2026-01-01");
  const maxDate = allDates.reduce((a, b) => (a > b ? a : b), "2026-12-31");

  const start = new Date(minDate);
  const end = new Date(maxDate);
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000);

  const toPercent = (dateStr: string) => {
    const d = new Date(dateStr);
    return Math.max(0, Math.min(100, ((d.getTime() - start.getTime()) / 86400000 / totalDays) * 100));
  };
  const widthPercent = (s: string, e: string) => {
    const sp = toPercent(s), ep = toPercent(e);
    return Math.max(1, ep - sp);
  };

  // Generate month labels
  const months: { label: string; left: number }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    months.push({ label: `${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][cur.getMonth()]} ${cur.getFullYear()}`, left: toPercent(cur.toISOString().slice(0, 10)) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const today = "2026-08-28";
  const todayLeft = toPercent(today);

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden">
      {/* Month header */}
      <div className="relative h-8 border-b border-line bg-surface2 overflow-hidden">
        {months.map((m) => (
          <div key={m.label} className="absolute top-0 h-full border-l border-line flex items-center px-2" style={{ left: `${m.left}%` }}>
            <span className="text-[9px] font-mono text-muted uppercase whitespace-nowrap">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-line">
        {projects.map((project) => {
          const client = clients.find((c) => c.id === project.clientId);
          const phaseIdx = PHASES.findIndex((p) => p.key === project.currentPhase);
          const progress = Math.round(((phaseIdx + 1) / PHASES.length) * 100);
          return (
            <div key={project.id} className="flex items-center hover:bg-surface2 transition-colors">
              {/* Label */}
              <div className="w-52 flex-shrink-0 px-4 py-3 border-r border-line">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-600 text-ink truncate">{project.name}</p>
                    <p className="text-[9px] font-mono text-muted truncate">{client?.company}</p>
                  </div>
                </div>
              </div>
              {/* Bar */}
              <div className="flex-1 relative h-14 overflow-hidden">
                {/* Today line */}
                <div className="absolute top-0 bottom-0 w-px bg-accent/40 z-10" style={{ left: `${todayLeft}%` }} />
                {/* Deliverable ticks */}
                {project.deliverables.map((d) => (
                  <div key={d.id} className="absolute top-1 w-0.5 h-3 rounded-full opacity-70 z-10" style={{ left: `${toPercent(d.dueDate)}%`, background: d.status === "approved" ? "#22c55e" : d.status === "rejected" ? "#ef4444" : "#f59e0b" }} title={d.title} />
                ))}
                {/* Main bar */}
                <div className="absolute top-4 h-5 rounded-md" style={{ left: `${toPercent(project.startDate)}%`, width: `${widthPercent(project.startDate, project.endDate)}%`, background: `${project.color}30`, border: `1px solid ${project.color}60` }}>
                  <div className="h-full rounded-md transition-all" style={{ width: `${progress}%`, background: project.color, opacity: 0.7 }} />
                </div>
                {/* Phase labels */}
                <div className="absolute bottom-1 text-[8px] font-mono text-muted" style={{ left: `${toPercent(project.startDate)}%` }}>
                  {project.currentPhase}
                </div>
              </div>
              {/* Status */}
              <div className="w-20 flex-shrink-0 px-3 text-right">
                <span className="text-[9px] font-mono" style={{ color: statusColors[project.status] }}>{project.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const KANBAN_EMPTY_QUIPS = [
  "Nada aquí… yet 👀",
  "Free column! Drag algo 🎯",
  "Vacío. Too good to be true? 🤔",
  "Por ahora, nada. Enjoy the peace ✌️",
  "Empty = room to grow 🌱",
  "Aquí no hay nada fr fr 🌚",
];

const PHASE_COLORS = ["#6b6b8a","#a78bfa","#e040fb","#f59e0b","#31b498","#dbfa45"];

// ─── Kanban / Control view ─────────────────────────────────────────────────────
function KanbanView({ projects, clients, onUpdateDeliverable, onAddDeliverableFile, onRemoveDeliverableFile, onMoveProjectPhase }: {
  projects: Project[]; clients: Client[];
  onUpdateDeliverable: Props["onUpdateDeliverable"];
  onAddDeliverableFile: Props["onAddDeliverableFile"];
  onRemoveDeliverableFile: Props["onRemoveDeliverableFile"];
  onMoveProjectPhase?: Props["onMoveProjectPhase"];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overPhase, setOverPhase] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggingId(projectId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("projectId", projectId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setOverPhase(null);
  };

  const handleDragOver = (e: React.DragEvent, phaseKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverPhase(phaseKey);
  };

  const handleDrop = (e: React.DragEvent, phaseKey: ProjectPhase) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("projectId");
    if (id && onMoveProjectPhase) {
      onMoveProjectPhase(id, phaseKey);
    }
    setDraggingId(null);
    setOverPhase(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PHASES.map((phase, phaseIndex) => {
        const phaseProjects = projects.filter((p) => p.currentPhase === phase.key);
        const isOver = overPhase === phase.key;
        return (
          <div
            key={phase.key}
            className={`flex-shrink-0 w-64 bg-surface border rounded-xl overflow-hidden transition-all duration-150 ${isOver ? "border-accent/60 bg-accent/5 scale-[1.01]" : "border-line"}`}
            onDragOver={(e) => handleDragOver(e, phase.key)}
            onDragLeave={() => setOverPhase(null)}
            onDrop={(e) => handleDrop(e, phase.key as ProjectPhase)}
          >
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: PHASE_COLORS[phaseIndex] }} />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{phase.label}</span>
              </div>
              <span className="font-mono text-[10px] text-muted">{phaseProjects.length}</span>
            </div>
            <div className="p-3 space-y-3 min-h-[200px]">
              {phaseProjects.map((project) => {
                const client = clients.find((c) => c.id === project.clientId);
                const pIdx = PHASES.findIndex((p) => p.key === project.currentPhase);
                const progress = Math.round(((pIdx + 1) / PHASES.length) * 100);
                const pending = project.deliverables.filter((d) => d.status !== "approved").length;
                const isOpen = expanded === project.id;
                const isDragging = draggingId === project.id;
                return (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-surface2 border border-line rounded-xl overflow-hidden transition-all duration-150 cursor-grab active:cursor-grabbing ${isDragging ? "opacity-40 scale-95" : "hover:border-muted/40 hover:shadow-sm"}`}
                  >
                    <div className="p-3" onClick={() => !isDragging && setExpanded(isOpen ? null : project.id)}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
                        <p className="text-xs font-600 text-ink leading-tight flex-1 cursor-pointer">{project.name}</p>
                      </div>
                      <p className="text-[10px] text-muted mb-2">{client?.company}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: project.color }} />
                        </div>
                        <span className="font-mono text-[9px] text-muted">{progress}%</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[9px] font-mono text-muted">{project.endDate.slice(5)}</span>
                        {pending > 0 && <span className="text-[9px] font-mono text-warning">{pending} pend.</span>}
                        <span className="text-[9px] font-mono" style={{ color: statusColors[project.status] }}>{project.status}</span>
                      </div>
                      <div className="mt-2 flex justify-end opacity-60">
                        <EmojiReactions compact initialCounts={project.id === "p1" ? { "🔥": 2 } : {}} />
                      </div>
                    </div>
                    {isOpen && project.deliverables.length > 0 && (
                      <div className="border-t border-line">
                        {project.deliverables.map((d) => (
                          <DeliverableRow key={d.id} d={d} projectId={project.id} onUpdate={onUpdateDeliverable}
                            onAddFile={(f) => onAddDeliverableFile(project.id, d.id, f)}
                            onRemoveFile={(fid) => onRemoveDeliverableFile(project.id, d.id, fid)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {phaseProjects.length === 0 && (
                <div className={`flex flex-col items-center justify-center py-10 px-4 text-center transition-all rounded-lg ${isOver ? "bg-accent/10" : ""}`}>
                  <p className="text-2xl mb-2">{isOver ? "🎯" : "🌚"}</p>
                  <p className="text-[10px] font-mono text-muted/40">
                    {isOver ? "Suelta aquí 👇" : KANBAN_EMPTY_QUIPS[phaseIndex % KANBAN_EMPTY_QUIPS.length]}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ProjectsView({ projects, clients, users, onUpdateDeliverable, onAddDeliverableFile, onRemoveDeliverableFile, onMoveProjectPhase, onAddProject }: Props) {
  const [viewMode, setViewMode] = useState<"list" | "gantt" | "kanban">("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered = filterStatus ? projects.filter((p) => p.status === filterStatus) : projects;

  return (
    <div className="p-8 space-y-6">
      {showNewModal && (
        <NewProjectModal
          clients={clients}
          users={users}
          onConfirm={(p) => { onAddProject?.(p); setShowNewModal(false); }}
          onCancel={() => setShowNewModal(false)}
        />
      )}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Gestión de Proyectos</p>
          <h1 className="font-display text-5xl font-700 tracking-tight text-ink uppercase">Proyectos</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode tabs */}
          <div className="flex gap-1 bg-surface border border-line rounded-xl p-1">
            {([["list","Lista"],["gantt","Cronograma"],["kanban","Control"]] as const).map(([m, l]) => (
              <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wide transition-all ${viewMode === m ? "bg-primary text-bg font-600" : "text-muted hover:text-ink"}`}>{l}</button>
            ))}
          </div>
          {/* Status filter */}
          <div className="flex gap-1">
            {["", "active", "paused", "completed"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all ${filterStatus === s ? "bg-primary/10 text-primary border-primary/30" : "border-line text-muted hover:text-ink"}`}>
                {s === "" ? "Todos" : s === "active" ? "Activo" : s === "paused" ? "Pausado" : "Completado"}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNewModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-bg text-xs font-mono font-600 hover:opacity-90 transition-all">
            <span className="text-base leading-none">+</span> Nuevo proyecto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: projects.length, color: "#f2f3f6" },
          { label: "Activos", value: projects.filter((p) => p.status === "active").length, color: "#31b498" },
          { label: "Pausados", value: projects.filter((p) => p.status === "paused").length, color: "#f59e0b" },
          { label: "Completados", value: projects.filter((p) => p.status === "completed").length, color: "#dbfa45" },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-line rounded-xl p-4">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">{s.label}</p>
            <p className="font-mono text-4xl font-700" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Gantt */}
      {viewMode === "gantt" && <GanttView projects={filtered} clients={clients} />}

      {/* Kanban */}
      {viewMode === "kanban" && <KanbanView projects={filtered} clients={clients} onUpdateDeliverable={onUpdateDeliverable} onAddDeliverableFile={onAddDeliverableFile} onRemoveDeliverableFile={onRemoveDeliverableFile} onMoveProjectPhase={onMoveProjectPhase} />}

      {/* List */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {filtered.map((project) => {
            const client = clients.find((c) => c.id === project.clientId);
            const phaseIdx = PHASES.findIndex((p) => p.key === project.currentPhase);
            const progress = Math.round(((phaseIdx + 1) / PHASES.length) * 100);
            const pendingDelivs = project.deliverables.filter((d) => d.status !== "approved").length;
            const isSelected = selected === project.id;
            return (
              <div key={project.id} onClick={() => setSelected(isSelected ? null : project.id)} className={`bg-surface border rounded-xl overflow-hidden cursor-pointer transition-all ${isSelected ? "border-primary/40" : "border-line hover:border-muted"}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: project.color }} />
                      <div>
                        <h3 className="font-display text-xl font-700 uppercase text-ink">{project.name}</h3>
                        <p className="text-xs text-muted">{client?.company} · {project.startDate.slice(0, 7)} – {project.endDate.slice(0, 7)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingDelivs > 0 && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">{pendingDelivs} pendientes</span>}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ borderColor: `${statusColors[project.status]}40`, color: statusColors[project.status] }}>{project.status}</span>
                    </div>
                  </div>
                  <PhaseJourney phases={project.phases} currentPhase={project.currentPhase} color={project.color} />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-3">
                      {PHASES.map((ph) => {
                        const pd = project.phases.find((p) => p.key === ph.key);
                        const isCurrent = ph.key === project.currentPhase;
                        const isDone = pd?.completedAt != null;
                        return <div key={ph.key} className="text-center"><p className={`text-[9px] font-mono ${isCurrent ? "text-ink" : isDone ? "text-muted" : "text-muted/40"}`}>{ph.short}</p></div>;
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-surface2 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: project.color }} />
                      </div>
                      <span className="font-mono text-[10px] text-muted">{progress}%</span>
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="border-t border-line">
                    <div className="px-5 py-3 bg-surface2 flex items-center justify-between">
                      <h4 className="font-mono text-xs uppercase tracking-widest text-muted">Entregables</h4>
                      <p className="font-mono text-[10px] text-muted">Presupuesto: ${project.budget.toLocaleString()}</p>
                    </div>
                    {project.deliverables.length === 0
                      ? <p className="px-5 py-4 text-sm text-muted">Sin entregables registrados.</p>
                      : project.deliverables.map((d) => (
                          <DeliverableRow key={d.id} d={d} projectId={project.id} onUpdate={onUpdateDeliverable}
                            onAddFile={(f) => onAddDeliverableFile(project.id, d.id, f)}
                            onRemoveFile={(fid) => onRemoveDeliverableFile(project.id, d.id, fid)} />
                        ))
                    }
                    {project.description && (
                      <div className="px-5 py-3 bg-surface2 border-t border-line">
                        <p className="text-xs text-muted">{project.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
