import { useState, useRef } from "react";
import { motion } from "motion/react";
import type { ContentPost, Client, User, Channel, PostFormat, PostStatus, AttachedFile } from "../types";
import FileUpload from "../components/FileUpload";

interface Props {
  posts: ContentPost[];
  clients: Client[];
  users: User[];
  today: string;
  onMovePost: (id: string, status: PostStatus) => void;
  onAddPost: (post: ContentPost) => void;
  onUpdatePost: (id: string, updates: Partial<ContentPost>) => void;
  onAddPostFile: (postId: string, file: AttachedFile) => void;
  onRemovePostFile: (postId: string, fileId: string) => void;
}

const STATUSES: { key: PostStatus; label: string; color: string }[] = [
  { key: "idea", label: "Idea", color: "#6b6b8a" },
  { key: "creation", label: "Creación", color: "#a78bfa" },
  { key: "design", label: "Diseño", color: "#e040fb" },
  { key: "review", label: "Revisión", color: "#f59e0b" },
  { key: "approved", label: "Aprobado", color: "#22c55e" },
  { key: "scheduled", label: "Programado", color: "#31b498" },
  { key: "published", label: "Publicado", color: "#dbfa45" },
];

const CHANNELS: Channel[] = ["Instagram", "Facebook", "FB + IG", "TikTok", "LinkedIn", "YouTube", "Email"];
const FORMATS: PostFormat[] = ["reel", "carrusel", "story", "imagen", "video", "foto", "texto", "evento", "shopper", "email"];

const channelColors: Record<string, string> = {
  Instagram: "#e1306c", Facebook: "#1877f2", "FB + IG": "#a855f7", TikTok: "#00f2ea",
  LinkedIn: "#0a66c2", YouTube: "#ff0000", Email: "#f59e0b",
};

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function exportCSV(posts: ContentPost[], clients: Client[], users: User[]) {
  const headers = ["ID","Cliente","Título","Canal","Formato","Ángulo","Estado","Fecha Programada","Asignado","Campaña","Hashtags","Alcance"];
  const rows = posts.map((p) => [
    p.id,
    clients.find((c) => c.id === p.clientId)?.company || "",
    `"${p.title}"`,
    p.channel,
    p.format,
    `"${p.angle}"`,
    p.status,
    p.scheduledDate,
    users.find((u) => u.id === p.assigneeId)?.name || "",
    `"${p.campaign}"`,
    p.hashtags.join(" "),
    p.reach || "",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "calendario-contenido.csv"; a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  const headers = ["titulo","cliente","fecha","hora","canal","formato","status","angulo","copy","marca_producto","asignado","campana","hashtags","pauta","presupuesto_pauta","notas"];
  const example = ["Tip: prepara tu casa para huracanes","national","2026-09-02","10:00","fb_ig","carrusel","idea","tip educativo","Temporada de huracanes: 5 cosas que no pueden faltar 🌀","Generadores","alexander@epikom.com","temporada-huracanes","#FerreteriasNational #PreparatePR","si","150","Usar fotos de tienda Bayamón"];
  const csv = [headers, example].map((r) => r.map((v) => (v.includes(",") ? `"${v}"` : v)).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "plantilla-calendario-contenido.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Board View ────────────────────────────────────────────────────────────────
function BoardView({ posts, clients, users, filterClient, onMovePost, onSelectPost }: {
  posts: ContentPost[]; clients: Client[]; users: User[];
  filterClient: string; onMovePost: (id: string, s: PostStatus) => void; onSelectPost: (p: ContentPost) => void;
}) {
  const dragId = useRef<string | null>(null);

  const filtered = filterClient ? posts.filter((p) => p.clientId === filterClient) : posts;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STATUSES.map((col) => {
        const colPosts = filtered.filter((p) => p.status === col.key);
        return (
          <div
            key={col.key}
            className="flex-shrink-0 w-52 bg-surface rounded-xl border border-line overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId.current) onMovePost(dragId.current, col.key);
            }}
          >
            <div className="px-3 py-3 border-b border-line flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted flex-1">{col.label}</span>
              <span className="font-mono text-[10px] text-muted">{colPosts.length}</span>
            </div>
            <div className="p-2 space-y-2 min-h-[120px]">
              {colPosts.map((post, cardIdx) => {
                const client = clients.find((c) => c.id === post.clientId);
                const user = users.find((u) => u.id === post.assigneeId);
                return (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ layout: { type: "spring", stiffness: 420, damping: 36 }, delay: Math.min(cardIdx * 0.04, 0.35) }}
                    draggable
                    onDragStart={(e) => { dragId.current = post.id; (e.currentTarget as HTMLElement).classList.add("dragging-card"); }}
                    onDragEnd={(e) => { dragId.current = null; (e.currentTarget as HTMLElement).classList.remove("dragging-card"); }}
                    onClick={() => onSelectPost(post)}
                    className="bg-surface2 border border-line rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-[var(--col-color)]/50 transition-colors hover-lift"
                    style={{ "--col-color": col.color } as React.CSSProperties}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <p className="text-xs font-500 text-ink leading-tight line-clamp-2">{post.title}</p>
                      <span className="text-[9px] font-mono flex-shrink-0 px-1 py-0.5 rounded" style={{ background: `${channelColors[post.channel]}18`, color: channelColors[post.channel] }}>
                        {post.channel.slice(0, 2)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted truncate mb-2">{client?.company}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-muted border border-line px-1 py-0.5 rounded">{post.format}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono text-muted">{post.scheduledDate.slice(5)}</span>
                        {user && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-700" style={{ background: `${user.color}20`, color: user.color }}>
                            {user.initials[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({ posts, clients, filterClient, onSelectPost }: {
  posts: ContentPost[]; clients: Client[]; filterClient: string; onSelectPost: (p: ContentPost) => void;
}) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(7); // Aug = 7

  const filtered = filterClient ? posts.filter((p) => p.clientId === filterClient) : posts;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;

  const postsByDate: Record<string, ContentPost[]> = {};
  filtered.forEach((p) => {
    if (!postsByDate[p.scheduledDate]) postsByDate[p.scheduledDate] = [];
    postsByDate[p.scheduledDate].push(p);
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line">
        <button onClick={prevMonth} className="text-muted hover:text-ink"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
        <h3 className="font-display text-xl font-700 uppercase tracking-wide text-ink">{MONTHS_ES[month]} {year}</h3>
        <button onClick={nextMonth} className="text-muted hover:text-ink"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
      </div>
      <div className="grid grid-cols-7 border-b border-line">
        {DAYS_ES.map((d) => <div key={d} className="py-2 text-center font-mono text-[10px] text-muted uppercase tracking-widest">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startPad + 1;
          const isValid = dayNum >= 1 && dayNum <= lastDay.getDate();
          const dateStr = isValid ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}` : "";
          const dayPosts = dateStr ? (postsByDate[dateStr] || []) : [];
          const isToday = dateStr === "2026-08-28";
          return (
            <div key={i} className={`min-h-[90px] p-1.5 border-b border-r border-line ${!isValid ? "bg-surface/50" : ""} ${isToday ? "bg-accent/5" : ""}`}>
              {isValid && (
                <>
                  <p className={`font-mono text-xs mb-1 ${isToday ? "text-accent font-700" : "text-muted"}`}>{dayNum}</p>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post) => {
                      const st = STATUSES.find((s) => s.key === post.status);
                      return (
                        <button key={post.id} onClick={() => onSelectPost(post)} className="w-full text-left rounded px-1 py-0.5 text-[9px] font-500 truncate hover:opacity-90" style={{ background: `${channelColors[post.channel]}20`, color: channelColors[post.channel] }}>
                          {post.title}
                        </button>
                      );
                    })}
                    {dayPosts.length > 3 && <p className="text-[9px] text-muted font-mono">+{dayPosts.length - 3} más</p>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Table View ────────────────────────────────────────────────────────────────
function TableView({ posts, clients, users, filterClient, onSelectPost, onMovePost }: {
  posts: ContentPost[]; clients: Client[]; users: User[];
  filterClient: string; onSelectPost: (p: ContentPost) => void; onMovePost: (id: string, s: PostStatus) => void;
}) {
  const filtered = filterClient ? posts.filter((p) => p.clientId === filterClient) : posts;
  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-line">
            {["Título","Cliente","Canal","Formato","Estado","Fecha","Asignado","Campaña"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-muted uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {filtered.map((post) => {
            const client = clients.find((c) => c.id === post.clientId);
            const user = users.find((u) => u.id === post.assigneeId);
            const st = STATUSES.find((s) => s.key === post.status)!;
            return (
              <tr key={post.id} className="hover:bg-surface2 cursor-pointer transition-colors" onClick={() => onSelectPost(post)}>
                <td className="px-4 py-3">
                  <p className="text-sm font-500 text-ink max-w-[200px] truncate">{post.title}</p>
                  <p className="text-xs text-muted truncate">{post.angle}</p>
                </td>
                <td className="px-4 py-3 text-sm text-muted">{client?.company}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: `${channelColors[post.channel]}18`, color: channelColors[post.channel] }}>
                    {post.channel}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-muted">{post.format}</td>
                <td className="px-4 py-3">
                  <select
                    value={post.status}
                    onChange={(e) => { e.stopPropagation(); onMovePost(post.id, e.target.value as PostStatus); }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-mono uppercase px-2 py-1 rounded border bg-transparent cursor-pointer"
                    style={{ borderColor: `${st.color}40`, color: st.color }}
                  >
                    {STATUSES.map((s) => <option key={s.key} value={s.key} className="bg-surface text-ink">{s.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{post.scheduledDate.slice(5)}</td>
                <td className="px-4 py-3">
                  {user && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-700" style={{ background: `${user.color}20`, color: user.color }}>{user.initials[0]}</div>
                      <span className="text-xs text-muted">{user.name.split(" ")[0]}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted truncate max-w-[120px]">{post.campaign}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Post Detail Panel ─────────────────────────────────────────────────────────
function PostPanel({ post, clients, users, onClose, onUpdate, onMove, onExpand, onAddFile, onRemoveFile }: {
  post: ContentPost; clients: Client[]; users: User[];
  onClose: () => void; onUpdate: (id: string, u: Partial<ContentPost>) => void;
  onMove: (id: string, s: PostStatus) => void; onExpand: () => void;
  onAddFile: (f: AttachedFile) => void; onRemoveFile: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ContentPost>({ ...post });

  const client = clients.find((c) => c.id === post.clientId);
  const user = users.find((u) => u.id === post.assigneeId);
  const st = STATUSES.find((s) => s.key === post.status)!;
  const currentIdx = STATUSES.findIndex((s) => s.key === post.status);
  const next = STATUSES[currentIdx + 1];
  const prev = STATUSES[currentIdx - 1];

  const upd = (k: keyof ContentPost, v: unknown) => setDraft((p) => ({ ...p, [k]: v }));
  const save = () => { onUpdate(post.id, draft); setEditing(false); };
  const cancel = () => { setDraft({ ...post }); setEditing(false); };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">{label}</p>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(16,11,8,0.85)" }}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-line">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ borderColor: `${st.color}40`, color: st.color }}>{st.label}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: `${channelColors[post.channel]}18`, color: channelColors[post.channel] }}>
                {post.channel} · {post.format}
              </span>
            </div>
            {editing ? (
              <input value={draft.title} onChange={(e) => upd("title", e.target.value)} className="w-full bg-surface2 border border-primary/40 rounded-lg px-3 py-2 font-display text-2xl font-700 uppercase tracking-wide text-ink outline-none" />
            ) : (
              <h2 className="font-display text-2xl font-700 uppercase tracking-wide text-ink leading-tight">{post.title}</h2>
            )}
            <p className="text-sm text-muted mt-1">{client?.company} · {post.scheduledDate}</p>
          </div>
          <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
            <button onClick={onExpand} title="Ver pantalla completa" className="w-7 h-7 rounded-lg border border-line text-muted hover:text-ink flex items-center justify-center transition-all">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 4V1H4M8 1H11V4M11 8V11H8M4 11H1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-lg border border-line text-muted hover:text-ink flex items-center justify-center transition-all">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {editing ? (
            /* ── Edit mode ── */
            <>
              <Field label="Ángulo / Concepto">
                <input value={draft.angle} onChange={(e) => upd("angle", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40" />
              </Field>
              <Field label="Copy">
                <textarea value={draft.copy} onChange={(e) => upd("copy", e.target.value)} rows={4} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 resize-none" />
              </Field>
              <Field label="Hashtags (separados por espacio)">
                <input value={draft.hashtags.join(" ")} onChange={(e) => upd("hashtags", e.target.value.split(" ").filter(Boolean))} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono outline-none focus:border-primary/40" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Canal">
                  <select value={draft.channel} onChange={(e) => upd("channel", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
                    {CHANNELS.map((c) => <option key={c} value={c} className="bg-surface">{c}</option>)}
                  </select>
                </Field>
                <Field label="Formato">
                  <select value={draft.format} onChange={(e) => upd("format", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
                    {FORMATS.map((f) => <option key={f} value={f} className="bg-surface">{f}</option>)}
                  </select>
                </Field>
                <Field label="Fecha programada">
                  <input type="date" value={draft.scheduledDate} onChange={(e) => upd("scheduledDate", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40" />
                </Field>
                <Field label="Asignado">
                  <select value={draft.assigneeId} onChange={(e) => upd("assigneeId", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
                    {users.map((u) => <option key={u.id} value={u.id} className="bg-surface">{u.name}</option>)}
                  </select>
                </Field>
                <Field label="Campaña">
                  <input value={draft.campaign} onChange={(e) => upd("campaign", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40" />
                </Field>
                <Field label="Boost ($)">
                  <input type="number" value={draft.boostBudget || ""} onChange={(e) => upd("boostBudget", Number(e.target.value) || undefined)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono outline-none focus:border-primary/40" />
                </Field>
              </div>
              <Field label="Notas">
                <textarea value={draft.notes} onChange={(e) => upd("notes", e.target.value)} rows={2} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 resize-none" />
              </Field>
              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button onClick={cancel} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink">Cancelar</button>
                <button onClick={save} className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90">Guardar cambios</button>
              </div>
            </>
          ) : (
            /* ── View mode ── */
            <>
              {post.angle && <Field label="Ángulo / Concepto"><p className="text-sm text-ink">{post.angle}</p></Field>}
              {post.copy && <Field label="Copy"><p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{post.copy}</p></Field>}
              {post.hashtags.length > 0 && (
                <Field label="Hashtags">
                  <div className="flex flex-wrap gap-1.5">
                    {post.hashtags.map((h) => <span key={h} className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">{h}</span>)}
                  </div>
                </Field>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Campaña"><p className="text-sm text-ink">{post.campaign || "—"}</p></Field>
                <Field label="Asignado">
                  {user ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-700" style={{ background: `${user.color}20`, color: user.color }}>{user.initials}</div>
                      <span className="text-sm text-ink">{user.name}</span>
                    </div>
                  ) : <p className="text-sm text-muted">—</p>}
                </Field>
                {post.reach && <Field label="Alcance"><p className="text-sm font-mono text-accent">{post.reach.toLocaleString()}</p></Field>}
                {post.boostBudget && <Field label="Boost"><p className="text-sm font-mono text-ink">${post.boostBudget.toLocaleString()}</p></Field>}
                {post.notes && <Field label="Notas"><p className="text-sm text-muted">{post.notes}</p></Field>}
              </div>

              {/* Files */}
              <div>
                <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Archivos adjuntos</p>
                <FileUpload files={post.attachedFiles || []} onAdd={onAddFile} onRemove={onRemoveFile} compact />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-line">
                {prev && (
                  <button onClick={() => { onMove(post.id, prev.key); onClose(); }} className="text-xs font-mono px-3 py-2 rounded-lg border border-line text-muted hover:text-ink transition-all">
                    ← {prev.label}
                  </button>
                )}
                <button onClick={() => setEditing(true)} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-ink hover:bg-surface2 transition-all flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                  Editar
                </button>
                {next && (
                  <button onClick={() => { onMove(post.id, next.key); onClose(); }} className="ml-auto text-xs font-mono px-4 py-2 rounded-lg font-600 hover:opacity-90 transition-all" style={{ background: next.color, color: "#0a0a0d" }}>
                    {next.label} →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Post Screen (pantalla completa de tarea) ──────────────────────────────────
function PostScreen({ post, clients, users, onClose, onUpdate, onMove, onAddFile, onRemoveFile }: {
  post: ContentPost; clients: Client[]; users: User[];
  onClose: () => void; onUpdate: (id: string, u: Partial<ContentPost>) => void; onMove: (id: string, s: PostStatus) => void;
  onAddFile: (f: AttachedFile) => void; onRemoveFile: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ContentPost>({ ...post });

  const client = clients.find((c) => c.id === post.clientId);
  const assignee = users.find((u) => u.id === post.assigneeId);
  const st = STATUSES.find((s) => s.key === post.status)!;
  const currentIdx = STATUSES.findIndex((s) => s.key === post.status);

  const upd = (k: keyof ContentPost, v: unknown) => setDraft((p) => ({ ...p, [k]: v }));
  const save = () => { onUpdate(post.id, draft); setEditing(false); };

  return (
    <div className="fixed inset-0 z-50 bg-bg overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-line flex items-center gap-4 px-8 py-4">
        <button onClick={onClose} className="flex items-center gap-2 text-muted hover:text-ink transition-all text-sm font-mono">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Volver al calendario
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-ink hover:bg-surface2 transition-all flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              Editar
            </button>
          )}
          {editing && (
            <>
              <button onClick={() => { setDraft({ ...post }); setEditing(false); }} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink">Cancelar</button>
              <button onClick={save} className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90">Guardar</button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Stage pipeline */}
        <div className="flex items-center gap-0 mb-10 overflow-x-auto">
          {STATUSES.map((s, i) => {
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <button
                key={s.key}
                onClick={() => onMove(post.id, s.key)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wide transition-all first:rounded-l-lg last:rounded-r-lg border-y border-r first:border-l ${
                  isCurrent ? "border-transparent text-bg font-600" :
                  isDone ? "border-line text-muted bg-surface2" : "border-line text-muted/40 bg-surface hover:text-muted"
                }`}
                style={isCurrent ? { background: s.color, borderColor: s.color } : {}}
              >
                {isDone && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Main content col */}
          <div className="col-span-2 space-y-8">
            {/* Title */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: `${channelColors[post.channel]}18`, color: channelColors[post.channel] }}>
                  {post.channel}
                </span>
                <span className="text-xs font-mono text-muted border border-line px-2 py-0.5 rounded">{post.format}</span>
              </div>
              {editing ? (
                <input value={draft.title} onChange={(e) => upd("title", e.target.value)} className="w-full bg-surface2 border border-primary/40 rounded-xl px-4 py-3 font-display text-4xl font-700 uppercase tracking-tight text-ink outline-none" />
              ) : (
                <h1 className="font-display text-5xl font-700 uppercase tracking-tight text-ink leading-none">{post.title}</h1>
              )}
            </div>

            {/* Angle */}
            <div>
              <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Ángulo / Concepto creativo</p>
              {editing ? (
                <input value={draft.angle} onChange={(e) => upd("angle", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40" />
              ) : (
                <p className="text-base text-ink">{post.angle || <span className="text-muted">—</span>}</p>
              )}
            </div>

            {/* Copy */}
            <div>
              <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Copy de la publicación</p>
              {editing ? (
                <textarea value={draft.copy} onChange={(e) => upd("copy", e.target.value)} rows={8} className="w-full bg-surface2 border border-line rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-primary/40 resize-none leading-relaxed" />
              ) : (
                <div className="bg-surface2 border border-line rounded-xl px-5 py-4">
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{post.copy || <span className="text-muted">Sin copy redactado.</span>}</p>
                </div>
              )}
            </div>

            {/* Hashtags */}
            <div>
              <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Hashtags</p>
              {editing ? (
                <input value={draft.hashtags.join(" ")} onChange={(e) => upd("hashtags", e.target.value.split(" ").filter(Boolean))} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono outline-none focus:border-primary/40" placeholder="#hashtag1 #hashtag2 ..." />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {post.hashtags.length > 0
                    ? post.hashtags.map((h) => <span key={h} className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">{h}</span>)
                    : <span className="text-sm text-muted">—</span>}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Notas internas</p>
              {editing ? (
                <textarea value={draft.notes} onChange={(e) => upd("notes", e.target.value)} rows={3} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 resize-none" placeholder="Notas de equipo, referencias, pendientes..." />
              ) : (
                <p className="text-sm text-muted leading-relaxed">{post.notes || "—"}</p>
              )}
            </div>

            {/* Files */}
            <div>
              <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Archivos adjuntos</p>
              <FileUpload files={post.attachedFiles || []} onAdd={onAddFile} onRemove={onRemoveFile} />
            </div>
          </div>

          {/* Sidebar col */}
          <div className="space-y-6">
            {/* Meta card */}
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-line">
                <p className="text-[10px] font-mono text-muted uppercase tracking-widest">Detalles</p>
              </div>
              <div className="divide-y divide-line">
                {[
                  {
                    label: "Cliente", content: (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-700" style={{ background: `${client?.color}20`, color: client?.color }}>{client?.initials}</div>
                        <span className="text-sm text-ink">{client?.company}</span>
                      </div>
                    )
                  },
                  {
                    label: "Asignado", content: editing ? (
                      <select value={draft.assigneeId} onChange={(e) => upd("assigneeId", e.target.value)} className="w-full bg-surface2 border border-line rounded px-2 py-1 text-xs text-ink outline-none cursor-pointer">
                        {users.map((u) => <option key={u.id} value={u.id} className="bg-surface">{u.name}</option>)}
                      </select>
                    ) : assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-700" style={{ background: `${assignee.color}20`, color: assignee.color }}>{assignee.initials}</div>
                        <span className="text-sm text-ink">{assignee.name}</span>
                      </div>
                    ) : <span className="text-sm text-muted">—</span>
                  },
                  {
                    label: "Fecha", content: editing ? (
                      <input type="date" value={draft.scheduledDate} onChange={(e) => upd("scheduledDate", e.target.value)} className="w-full bg-surface2 border border-line rounded px-2 py-1 text-xs text-ink outline-none" />
                    ) : <span className="text-sm font-mono text-ink">{post.scheduledDate}</span>
                  },
                  {
                    label: "Canal", content: editing ? (
                      <select value={draft.channel} onChange={(e) => upd("channel", e.target.value)} className="w-full bg-surface2 border border-line rounded px-2 py-1 text-xs text-ink outline-none cursor-pointer">
                        {CHANNELS.map((c) => <option key={c} value={c} className="bg-surface">{c}</option>)}
                      </select>
                    ) : <span className="text-sm text-ink" style={{ color: channelColors[post.channel] }}>{post.channel}</span>
                  },
                  {
                    label: "Formato", content: editing ? (
                      <select value={draft.format} onChange={(e) => upd("format", e.target.value)} className="w-full bg-surface2 border border-line rounded px-2 py-1 text-xs text-ink outline-none cursor-pointer">
                        {FORMATS.map((f) => <option key={f} value={f} className="bg-surface">{f}</option>)}
                      </select>
                    ) : <span className="text-sm font-mono text-ink">{post.format}</span>
                  },
                  {
                    label: "Campaña", content: editing ? (
                      <input value={draft.campaign} onChange={(e) => upd("campaign", e.target.value)} className="w-full bg-surface2 border border-line rounded px-2 py-1 text-xs text-ink outline-none focus:border-primary/40" />
                    ) : <span className="text-sm text-ink">{post.campaign || "—"}</span>
                  },
                ].map(({ label, content }) => (
                  <div key={label} className="px-4 py-3">
                    <p className="text-[9px] font-mono text-muted uppercase tracking-widest mb-1">{label}</p>
                    {content}
                  </div>
                ))}
              </div>
            </div>

            {/* Performance card */}
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-line">
                <p className="text-[10px] font-mono text-muted uppercase tracking-widest">Rendimiento</p>
              </div>
              <div className="divide-y divide-line">
                {[
                  {
                    label: "Alcance", value: editing
                      ? <input type="number" value={draft.reach || ""} onChange={(e) => upd("reach", Number(e.target.value) || undefined)} className="w-full bg-surface2 border border-line rounded px-2 py-1 text-xs text-ink font-mono outline-none" />
                      : <span className="font-mono text-lg font-700 text-accent">{post.reach ? post.reach.toLocaleString() : "—"}</span>
                  },
                  {
                    label: "Boost presupuesto", value: editing
                      ? <input type="number" value={draft.boostBudget || ""} onChange={(e) => upd("boostBudget", Number(e.target.value) || undefined)} className="w-full bg-surface2 border border-line rounded px-2 py-1 text-xs text-ink font-mono outline-none" />
                      : <span className="font-mono text-sm text-ink">{post.boostBudget ? `$${post.boostBudget.toLocaleString()}` : "—"}</span>
                  },
                  {
                    label: "Gasto real", value: editing
                      ? <input type="number" value={draft.actualSpend || ""} onChange={(e) => upd("actualSpend", Number(e.target.value) || undefined)} className="w-full bg-surface2 border border-line rounded px-2 py-1 text-xs text-ink font-mono outline-none" />
                      : <span className="font-mono text-sm text-ink">{post.actualSpend ? `$${post.actualSpend.toLocaleString()}` : "—"}</span>
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3">
                    <p className="text-[9px] font-mono text-muted uppercase tracking-widest mb-1">{label}</p>
                    {value}
                  </div>
                ))}
              </div>
            </div>

            {/* Published date */}
            {post.status === "published" && (
              <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3">
                <p className="text-[9px] font-mono text-muted uppercase tracking-widest mb-1">Publicado</p>
                <p className="font-mono text-sm text-accent">{post.publishedDate || post.scheduledDate}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Post Form ─────────────────────────────────────────────────────────────
function NewPostForm({ clients, users, onAdd, onClose }: {
  clients: Client[]; users: User[]; onAdd: (p: ContentPost) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<ContentPost>>({ status: "idea", channel: "Instagram", format: "reel", hashtags: [] });
  const upd = (k: keyof ContentPost, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!form.clientId || !form.title || !form.scheduledDate) return;
    onAdd({ id: `post${Date.now()}`, title: form.title!, clientId: form.clientId!, channel: form.channel as Channel, format: form.format as PostFormat, angle: form.angle || "", copy: form.copy || "", hashtags: form.hashtags || [], brand: "", product: "", assigneeId: form.assigneeId || "", campaign: form.campaign || "", status: form.status as PostStatus || "idea", scheduledDate: form.scheduledDate!, notes: "", boostBudget: undefined, actualSpend: undefined, reach: undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(16,11,8,0.8)" }}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-line">
          <h2 className="font-display text-2xl font-700 uppercase tracking-wide text-ink">Nuevo Post</h2>
          <button onClick={onClose} className="text-muted hover:text-ink"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: "Título", key: "title", type: "text", placeholder: "Nombre del post" },
            { label: "Ángulo / Concepto", key: "angle", type: "text", placeholder: "La idea central" },
            { label: "Fecha programada", key: "scheduledDate", type: "date", placeholder: "" },
            { label: "Campaña", key: "campaign", type: "text", placeholder: "Nombre de campaña" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">{label}</label>
              <input type={type} placeholder={placeholder} value={(form as Record<string, unknown>)[key] as string || ""} onChange={(e) => upd(key as keyof ContentPost, e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink focus:border-primary/50 outline-none" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Cliente</label>
              <select value={form.clientId || ""} onChange={(e) => upd("clientId", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
                <option value="">Seleccionar...</option>
                {clients.map((c) => <option key={c.id} value={c.id} className="bg-surface">{c.company}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Asignado</label>
              <select value={form.assigneeId || ""} onChange={(e) => upd("assigneeId", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
                <option value="">Seleccionar...</option>
                {users.map((u) => <option key={u.id} value={u.id} className="bg-surface">{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Canal</label>
              <select value={form.channel || "Instagram"} onChange={(e) => upd("channel", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
                {CHANNELS.map((c) => <option key={c} value={c} className="bg-surface">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Formato</label>
              <select value={form.format || "reel"} onChange={(e) => upd("format", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
                {FORMATS.map((f) => <option key={f} value={f} className="bg-surface">{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Copy</label>
            <textarea value={form.copy || ""} onChange={(e) => upd("copy", e.target.value)} rows={3} placeholder="El texto que irá en la publicación..." className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink focus:border-primary/50 outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink">Cancelar</button>
            <button onClick={submit} className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90">Crear Post</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────
interface ParsedRow {
  ok: boolean;
  error?: string;
  data: Partial<ContentPost> & { _raw: string[] };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "", inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function CSVImportModal({ clients, users, onImport, onCancel }: {
  clients: Client[]; users: User[];
  onImport: (posts: Omit<ContentPost, "id">[]) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const headerCols = parseCSVLine(lines[0] ?? "").map((h) => h.toLowerCase().replace(/^\uFEFF/, ""));
      const hasHeader = headerCols.includes("titulo") || headerCols.includes("cliente");
      const idx = (name: string) => headerCols.indexOf(name);
      const dataLines = hasHeader ? lines.slice(1) : lines;
      const CANAL_MAP: Record<string, Channel> = {
        instagram: "Instagram", facebook: "Facebook", fb_ig: "FB + IG", "fb + ig": "FB + IG",
        tiktok: "TikTok", linkedin: "LinkedIn", youtube: "YouTube", email: "Email",
      };
      const STATUS_MAP: Record<string, PostStatus> = {
        idea: "idea", creacion: "creation", creation: "creation", diseno: "design", design: "design",
        revision: "review", review: "review", aprobado: "approved", approved: "approved",
        programado: "scheduled", scheduled: "scheduled", publicado: "published", published: "published",
      };
      const parsed: ParsedRow[] = dataLines.map((line) => {
        const cols = parseCSVLine(line);
        const get = (name: string, fallbackIdx: number) => {
          const i = hasHeader ? idx(name) : fallbackIdx;
          return i >= 0 ? (cols[i] ?? "") : "";
        };
        const titulo = get("titulo", 0);
        const clienteRef = get("cliente", 1);
        if (!titulo) return { ok: false, error: "Sin título", data: { _raw: cols } };
        const ref = clienteRef.toLowerCase();
        const validClient = clients.find(
          (c) => c.id === clienteRef
            || c.slug === ref
            || c.company.toLowerCase() === ref
            || c.name.toLowerCase() === ref
            || c.name.toLowerCase().replace(/\s+/g, "-") === ref
            || c.name.toLowerCase().startsWith(ref)
        );
        if (!validClient) return { ok: false, error: `Cliente "${clienteRef}" no encontrado`, data: { _raw: cols } };
        const canalRaw = get("canal", 4).toLowerCase();
        const formatoRaw = get("formato", 5).toLowerCase();
        const estadoRaw = get("status", 6).toLowerCase();
        const asignadoEmail = get("asignado", 10).toLowerCase();
        const assignee = users.find((u) => u.email.toLowerCase() === asignadoEmail);
        const pautaSi = get("pauta", 13).toLowerCase() === "si";
        const presupuesto = parseFloat(get("presupuesto_pauta", 14));
        return {
          ok: true,
          data: {
            _raw: cols,
            clientId: validClient.id,
            title: titulo,
            channel: CANAL_MAP[canalRaw] ?? ((CHANNELS as string[]).includes(get("canal", 4)) ? (get("canal", 4) as Channel) : "Instagram"),
            format: (FORMATS as string[]).includes(formatoRaw) ? (formatoRaw as PostFormat) : "imagen",
            angle: get("angulo", 7),
            copy: get("copy", 8),
            brand: get("marca_producto", 9),
            hashtags: get("hashtags", 12) ? get("hashtags", 12).split(/\s+/).filter(Boolean) : [],
            campaign: get("campana", 11),
            status: STATUS_MAP[estadoRaw] ?? "idea",
            scheduledDate: get("fecha", 2),
            assigneeId: assignee?.id || "",
            boostBudget: pautaSi && !isNaN(presupuesto) ? presupuesto : undefined,
            notes: get("notas", 15),
            attachedFiles: [],
          },
        };
      });
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleImport = () => {
    const valid = rows.filter((r) => r.ok).map((r) => ({ ...r.data }) as Omit<ContentPost, "id">);
    onImport(valid);
    setImported(true);
  };

  const validCount = rows.filter((r) => r.ok).length;
  const errorCount = rows.filter((r) => !r.ok).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface border border-line rounded-2xl w-full max-w-2xl shadow-2xl animate-pop-in overflow-hidden">
        <div className="px-6 py-5 border-b border-line flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest">Importar</p>
            <h2 className="font-display text-2xl font-700 uppercase text-ink">CSV Import</h2>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg border border-line text-muted hover:text-ink flex items-center justify-center text-lg">×</button>
        </div>

        {imported ? (
          <div className="px-6 py-16 text-center space-y-4">
            <p className="text-5xl">🎉</p>
            <p className="font-display text-3xl font-700 text-ink uppercase">{validCount} posts importados</p>
            <p className="text-sm text-muted">Ya están en el calendario. A darle 💪</p>
            <button onClick={onCancel} className="mt-4 px-6 py-2.5 bg-accent text-bg text-sm font-mono font-600 rounded-xl hover:opacity-90">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4">
              {rows.length === 0 ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${dragging ? "border-accent bg-accent/5" : "border-line hover:border-muted"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <p className="text-4xl mb-3">📂</p>
                  <p className="font-display text-xl font-700 uppercase text-ink mb-1">Suelta tu CSV aquí</p>
                  <p className="text-sm text-muted">o click para seleccionar archivo</p>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-success">✓ {validCount} válidos</span>
                    {errorCount > 0 && <span className="text-xs font-mono text-danger">✕ {errorCount} con errores</span>}
                    <button onClick={() => setRows([])} className="text-[10px] font-mono text-muted hover:text-ink border border-line px-2 py-1 rounded ml-auto">← Cambiar archivo</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-line divide-y divide-line">
                    {rows.map((r, i) => (
                      <div key={i} className={`flex items-start gap-3 px-4 py-2.5 ${r.ok ? "" : "bg-danger/5"}`}>
                        <span className={`text-[10px] font-mono flex-shrink-0 mt-0.5 ${r.ok ? "text-success" : "text-danger"}`}>{r.ok ? "✓" : "✕"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink truncate">{r.data._raw[1] || "(sin título)"}</p>
                          {r.error && <p className="text-[10px] text-danger">{r.error}</p>}
                          {r.ok && <p className="text-[10px] text-muted font-mono">{r.data.channel} · {r.data.format} · {r.data.status}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-line flex justify-end gap-2 bg-surface2">
              <button onClick={onCancel} className="text-xs font-mono px-4 py-2 rounded-xl border border-line text-muted hover:text-ink transition-all">Cancelar</button>
              {validCount > 0 && (
                <button onClick={handleImport} className="text-xs font-mono px-6 py-2 rounded-xl bg-accent text-bg font-600 hover:opacity-90">
                  Importar {validCount} post{validCount !== 1 ? "s" : ""} ✓
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ContentCalendar({ posts, clients, users, today, onMovePost, onAddPost, onUpdatePost, onAddPostFile, onRemovePostFile }: Props) {
  const [viewMode, setViewMode] = useState<"board" | "calendar" | "table">("board");
  const [filterClient, setFilterClient] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [expandedPost, setExpandedPost] = useState<ContentPost | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const filtered = posts.filter((p) =>
    (!filterClient || p.clientId === filterClient) &&
    (!filterChannel || p.channel === filterChannel) &&
    (!filterStatus || p.status === filterStatus)
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Gestión de Contenido</p>
          <h1 className="font-display text-5xl font-700 tracking-tight text-ink uppercase">Calendario</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadTemplate} className="text-xs font-mono px-3 py-2 rounded-lg border border-line text-muted hover:text-ink transition-all">
            ↓ Plantilla
          </button>
          <button onClick={() => setShowImport(true)} className="text-xs font-mono px-3 py-2 rounded-lg border border-line text-muted hover:text-ink transition-all">
            ↑ Importar CSV
          </button>
          <button onClick={() => exportCSV(filtered, clients, users)} className="text-xs font-mono px-3 py-2 rounded-lg border border-line text-muted hover:text-ink transition-all">
            ↓ Exportar CSV
          </button>
          <button onClick={() => setShowNewPost(true)} className="text-xs font-mono px-4 py-2 rounded-lg bg-accent text-bg font-700 hover:opacity-90 transition-all">
            + Nuevo Post
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-surface border border-line rounded-xl p-1">
            {(["board","calendar","table"] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wide transition-all ${viewMode === m ? "bg-primary text-bg font-600" : "text-muted hover:text-ink"}`}>
                {m === "board" ? "Tablero" : m === "calendar" ? "Calendario" : "Tabla"}
              </button>
            ))}
          </div>
          {/* Client filter */}
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="bg-surface2 border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none cursor-pointer font-mono">
            <option value="">Todos los clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id} className="bg-surface">{c.company}</option>)}
          </select>
          {/* Channel filter */}
          <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="bg-surface2 border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none cursor-pointer font-mono">
            <option value="">Todos los canales</option>
            {CHANNELS.map((ch) => <option key={ch} value={ch} className="bg-surface">{ch}</option>)}
          </select>
          {/* Status filter */}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-surface2 border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none cursor-pointer font-mono">
            <option value="">Todos los estados</option>
            {STATUSES.map((s) => <option key={s.key} value={s.key} className="bg-surface">{s.label}</option>)}
          </select>
          {(filterClient || filterChannel || filterStatus) && (
            <button onClick={() => { setFilterClient(""); setFilterChannel(""); setFilterStatus(""); }} className="text-[10px] font-mono text-muted hover:text-ink border border-line px-2.5 py-1.5 rounded-lg transition-all">
              × Limpiar filtros
            </button>
          )}
        </div>
        {/* Status count chips */}
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => {
            const count = filtered.filter((p) => p.status === s.key).length;
            if (count === 0) return null;
            return (
              <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? "" : s.key)} className="text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all" style={{ borderColor: `${s.color}${filterStatus === s.key ? "80" : "30"}`, color: s.color, background: filterStatus === s.key ? `${s.color}15` : "transparent" }}>
                {s.label}: {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Views */}
      {viewMode === "board" && <BoardView posts={filtered} clients={clients} users={users} filterClient="" onMovePost={onMovePost} onSelectPost={setSelectedPost} />}
      {viewMode === "calendar" && <CalendarView posts={filtered} clients={clients} filterClient="" onSelectPost={setSelectedPost} />}
      {viewMode === "table" && <TableView posts={filtered} clients={clients} users={users} filterClient="" onSelectPost={setSelectedPost} onMovePost={onMovePost} />}

      {/* Modals */}
      {selectedPost && (
        <PostPanel
          post={posts.find((p) => p.id === selectedPost.id) || selectedPost}
          clients={clients} users={users}
          onClose={() => setSelectedPost(null)}
          onUpdate={onUpdatePost}
          onMove={(id, s) => { onMovePost(id, s); }}
          onExpand={() => { setExpandedPost(selectedPost); setSelectedPost(null); }}
          onAddFile={(f) => onAddPostFile(selectedPost.id, f)}
          onRemoveFile={(fid) => onRemovePostFile(selectedPost.id, fid)}
        />
      )}
      {expandedPost && (
        <PostScreen
          post={posts.find((p) => p.id === expandedPost.id) || expandedPost}
          clients={clients} users={users}
          onClose={() => setExpandedPost(null)}
          onUpdate={onUpdatePost}
          onMove={(id, s) => { onMovePost(id, s); }}
          onAddFile={(f) => onAddPostFile(expandedPost.id, f)}
          onRemoveFile={(fid) => onRemovePostFile(expandedPost.id, fid)}
        />
      )}
      {showNewPost && <NewPostForm clients={clients} users={users} onAdd={onAddPost} onClose={() => setShowNewPost(false)} />}
      {showImport && (
        <CSVImportModal
          clients={clients} users={users}
          onImport={(newPosts) => {
            newPosts.forEach((p) => onAddPost({ ...p, id: "" } as ContentPost));
            setShowImport(false);
          }}
          onCancel={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
