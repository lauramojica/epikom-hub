import { useRef, useState } from "react";
import type { Document, Client, Project } from "../types";

interface Props {
  documents: Document[];
  clients: Client[];
  projects: Project[];
  onAdd: (doc: Document) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: Document["category"][] = ["brief", "arte", "contrato", "reporte", "referencia", "otro"];

const catColors: Record<Document["category"], string> = {
  brief: "#31b498", arte: "#e040fb", contrato: "#f59e0b",
  reporte: "#dbfa45", referencia: "#a78bfa", otro: "#6b6b8a",
};

const catLabel: Record<Document["category"], string> = {
  brief: "Brief", arte: "Arte", contrato: "Contrato",
  reporte: "Reporte", referencia: "Referencia", otro: "Otro",
};

const fileIcon = (type: string) => {
  if (type.startsWith("image/")) return "🖼";
  if (type === "application/pdf") return "📄";
  if (type.includes("word")) return "📝";
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return "📊";
  if (type.includes("zip")) return "🗜";
  if (type.startsWith("video/")) return "🎬";
  return "📎";
};

const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export default function DocumentsView({ documents, clients, projects, onAdd, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [filterClient, setFilterClient] = useState("");
  const [filterCat, setFilterCat] = useState<Document["category"] | "">("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [form, setForm] = useState<{ clientId: string; projectId: string; category: Document["category"]; notes: string }>({
    clientId: "", projectId: "", category: "brief", notes: "",
  });

  const handleDrop = (files: FileList | null) => {
    if (!files) return;
    setPendingFiles(Array.from(files));
    setShowForm(true);
  };

  const submit = () => {
    if (!form.clientId || pendingFiles.length === 0) return;
    pendingFiles.forEach((f) => {
      onAdd({
        id: `doc${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name, size: f.size, type: f.type,
        url: URL.createObjectURL(f),
        uploadedAt: new Date().toISOString().slice(0, 10),
        clientId: form.clientId,
        projectId: form.projectId || undefined,
        category: form.category,
        notes: form.notes,
      });
    });
    setPendingFiles([]);
    setForm({ clientId: "", projectId: "", category: "brief", notes: "" });
    setShowForm(false);
  };

  const filtered = documents.filter((d) => {
    if (filterClient && d.clientId !== filterClient) return false;
    if (filterCat && d.category !== filterCat) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groupedByClient: Record<string, Document[]> = {};
  filtered.forEach((d) => {
    if (!groupedByClient[d.clientId]) groupedByClient[d.clientId] = [];
    groupedByClient[d.clientId].push(d);
  });

  const clientProjects = clients.find((c) => c.id === form.clientId)
    ? projects.filter((p) => p.clientId === form.clientId)
    : [];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Biblioteca de archivos</p>
          <h1 className="font-display text-5xl font-700 tracking-tight text-ink uppercase">Documentos</h1>
        </div>
        <button onClick={() => { setPendingFiles([]); setShowForm(true); }} className="text-xs font-mono px-4 py-2 rounded-lg bg-accent text-bg font-700 hover:opacity-90 transition-all">
          + Subir documentos
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total", value: documents.length, color: "#f2f3f6" },
          ...CATEGORIES.slice(0, 4).map((cat) => ({ label: catLabel[cat], value: documents.filter((d) => d.category === cat).length, color: catColors[cat] })),
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-line rounded-xl p-4">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">{s.label}</p>
            <p className="font-mono text-3xl font-700" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 8L10.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar archivo..." className="bg-surface border border-line rounded-lg pl-8 pr-4 py-2 text-sm text-ink outline-none focus:border-primary/40 w-44 font-body" />
        </div>
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer font-mono">
          <option value="">Todos los clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id} className="bg-surface">{c.company}</option>)}
        </select>
        <div className="flex gap-1">
          <button onClick={() => setFilterCat("")} className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-all ${filterCat === "" ? "bg-primary/10 text-primary border-primary/30" : "border-line text-muted hover:text-ink"}`}>Todos</button>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setFilterCat(filterCat === cat ? "" : cat)} className="text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-all" style={filterCat === cat ? { background: `${catColors[cat]}15`, color: catColors[cat], borderColor: `${catColors[cat]}40` } : { borderColor: "#26262e", color: "#8b93a1" }}>
              {catLabel[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone (always visible) */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleDrop(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl py-10 text-center cursor-pointer transition-all ${dragging ? "border-primary bg-primary/5" : "border-line hover:border-muted"}`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleDrop(e.target.files)} />
        <p className="text-3xl mb-2">📁</p>
        <p className="text-sm text-muted font-body">{dragging ? "Suelta los archivos aquí" : "Arrastra archivos aquí o haz clic para seleccionar"}</p>
        <p className="text-[10px] font-mono text-muted/40 mt-1">PDF, imágenes, videos, Word, Excel, ZIP</p>
      </div>

      {/* Document grid by client */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-display text-4xl font-700 text-muted/20 uppercase mb-2">Vacío</p>
          <p className="text-sm text-muted">Sube el primer documento para empezar</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByClient).map(([clientId, docs]) => {
            const client = clients.find((c) => c.id === clientId);
            return (
              <div key={clientId}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-700" style={{ background: `${client?.color}20`, color: client?.color }}>
                    {client?.initials}
                  </div>
                  <h2 className="font-display text-2xl font-700 uppercase text-ink">{client?.company}</h2>
                  <span className="font-mono text-[10px] text-muted border border-line px-2 py-0.5 rounded">{docs.length} archivos</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {docs.map((doc) => {
                    const proj = doc.projectId ? projects.find((p) => p.id === doc.projectId) : null;
                    return (
                      <div key={doc.id} className="bg-surface border border-line rounded-xl p-4 group hover:border-muted transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-3xl">{fileIcon(doc.type)}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <a href={doc.url} download={doc.name} className="w-6 h-6 rounded border border-line flex items-center justify-center text-muted hover:text-ink">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1V7M2.5 5L5 7.5L7.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 9H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                            </a>
                            <button onClick={() => onDelete(doc.id)} className="w-6 h-6 rounded border border-line flex items-center justify-center text-muted hover:text-danger">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-500 text-ink truncate mb-1">{doc.name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${catColors[doc.category]}15`, color: catColors[doc.category] }}>
                            {catLabel[doc.category]}
                          </span>
                          {proj && <span className="text-[9px] font-mono text-muted border border-line px-1.5 py-0.5 rounded truncate max-w-[100px]">{proj.name}</span>}
                        </div>
                        <p className="text-[10px] font-mono text-muted mt-2">{fmtSize(doc.size)} · {doc.uploadedAt}</p>
                        {doc.notes && <p className="text-[10px] text-muted mt-1 truncate">{doc.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(16,11,8,0.85)" }}>
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <h2 className="font-display text-2xl font-700 uppercase text-ink">Subir documentos</h2>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Files preview */}
              {pendingFiles.length > 0 ? (
                <div className="space-y-1.5">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 bg-surface2 border border-line rounded-lg px-3 py-2">
                      <span className="text-base">{fileIcon(f.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-500 text-ink truncate">{f.name}</p>
                        <p className="text-[10px] font-mono text-muted">{fmtSize(f.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-line rounded-xl py-6 text-center cursor-pointer hover:border-muted transition-all">
                  <p className="text-sm text-muted">Seleccionar archivos</p>
                </div>
              )}

              {/* Client */}
              <div>
                <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Cliente *</label>
                <select value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value, projectId: "" }))} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
                  <option value="">Seleccionar...</option>
                  {clients.map((c) => <option key={c.id} value={c.id} className="bg-surface">{c.company}</option>)}
                </select>
              </div>

              {/* Project (optional) */}
              {clientProjects.length > 0 && (
                <div>
                  <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Proyecto (opcional)</label>
                  <select value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
                    <option value="">Sin proyecto</option>
                    {clientProjects.map((p) => <option key={p.id} value={p.id} className="bg-surface">{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button key={cat} onClick={() => setForm((p) => ({ ...p, category: cat }))} className="text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-all" style={form.category === cat ? { background: `${catColors[cat]}20`, color: catColors[cat], borderColor: `${catColors[cat]}40` } : { borderColor: "#26262e", color: "#8b93a1" }}>
                      {catLabel[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Notas (opcional)</label>
                <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Descripción o contexto del archivo..." className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 font-body" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink">Cancelar</button>
                <button onClick={submit} disabled={!form.clientId || pendingFiles.length === 0} className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                  Guardar {pendingFiles.length > 1 ? `${pendingFiles.length} archivos` : "archivo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
