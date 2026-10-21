"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { User } from "../types";
import { useToast } from "../components/Toast";
import type { ReportSpace, ReportTable, SpaceMember } from "./types";
import { useReportes, useReportRows, uploadReportImage, type TablePreset } from "./useReportes";
import ReportTableView from "./ReportTableView";
import RowPanel from "./RowPanel";
import { InlineText } from "./Cells";

interface Props {
  me: User | undefined;
  users: User[];
}

const LAST_TABLE_KEY = "epikom-reportes-tabla";
const SPACE_ICONS = ["📁", "🌐", "📣", "🛠️", "💼", "📊", "🎨", "🏗️", "🧾", "⭐"];

export default function ReportesView({ me, users }: Props) {
  const { toast } = useToast();
  const r = useReportes();
  const [chosenTableId, setTableId] = useState<string | null>(null);
  // La última tabla abierta en este navegador
  const [savedTableId] = useState<string | null>(() => {
    try { return localStorage.getItem(LAST_TABLE_KEY); } catch { return null; }
  });
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { kind: "space" } | { kind: "table"; spaceId: string } | { kind: "share"; spaceId: string } | { kind: "send"; rowIds: string[] }>(null);

  const isAdmin = me?.role === "admin" || me?.role === "superadmin";
  const canManage = (s: ReportSpace | undefined) => !!s && (isAdmin || s.createdBy === me?.id);
  const canEdit = (s: ReportSpace | undefined) =>
    canManage(s) || r.members.some((m) => m.spaceId === s?.id && m.userId === me?.id && m.role === "editor");

  const tableId =
    [chosenTableId, savedTableId].find((id) => id && r.tables.some((t) => t.id === id)) ?? r.tables[0]?.id ?? null;

  useEffect(() => {
    if (!tableId) return;
    try { localStorage.setItem(LAST_TABLE_KEY, tableId); } catch { /* sin storage */ }
  }, [tableId]);

  const table = r.tables.find((t) => t.id === tableId) ?? null;
  const space = r.spaces.find((s) => s.id === table?.spaceId);
  const editable = canEdit(space);
  const rowsApi = useReportRows(table?.id ?? null);
  const openRow = rowsApi.rows.find((x) => x.id === openRowId) ?? null;

  const fail = (msg: string) => (e: unknown) => {
    console.error(e);
    const detail = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
    toast(`✕ ${msg}${detail ? `: ${detail}` : ""}`, "error");
  };

  const updateTable = (patch: Partial<ReportTable>) => {
    if (table) r.updateTable(table.id, patch).catch(fail("No se pudo guardar el cambio en la tabla"));
  };

  const print = (rowIds: string[]) => {
    if (!table) return;
    if (rowIds.length === 0) { toast("No hay filas para exportar", "info"); return; }
    const url = `/reportes/imprimir?table=${table.id}&rows=${rowIds.slice(0, 200).join(",")}`;
    window.open(url, "_blank", "noopener");
  };

  if (r.loading) return <div className="p-8 text-sm text-muted">Cargando reportes…</div>;

  if (r.error) {
    return (
      <div className="p-8 max-w-xl">
        <h1 className="font-display text-3xl font-700 uppercase text-ink">Reportes</h1>
        <p className="mt-4 text-sm text-danger">No se pudieron cargar los reportes: {r.error}</p>
        <p className="mt-2 text-sm text-muted">Si es la primera vez, falta ejecutar <code className="font-mono">supabase-reportes.sql</code> en Supabase.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Árbol de espacios y tablas */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col border-r border-line bg-surface/50">
        <div className="flex items-center justify-between px-4 py-4">
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest">Espacios</p>
          <button onClick={() => setModal({ kind: "space" })} title="Nuevo espacio" className="w-6 h-6 rounded-md text-muted hover:text-ink hover:bg-surface2">+</button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-3">
          {r.spaces.map((s) => (
            <SpaceTree key={s.id} space={s} tables={r.tables.filter((t) => t.spaceId === s.id)}
              members={r.members.filter((m) => m.spaceId === s.id)}
              activeTableId={tableId} canEdit={canEdit(s)} canManage={canManage(s)}
              onSelect={(id) => { setTableId(id); setOpenRowId(null); }}
              onNewTable={() => setModal({ kind: "table", spaceId: s.id })}
              onShare={() => setModal({ kind: "share", spaceId: s.id })}
              onRename={(name) => r.updateSpace(s.id, { name }).catch(fail("No se pudo renombrar"))}
              onDelete={() => {
                if (!window.confirm(`¿Eliminar el espacio “${s.name}” con TODAS sus tablas y reportes? No se puede deshacer.`)) return;
                r.deleteSpace(s.id).then(() => { if (space?.id === s.id) setTableId(null); }).catch(fail("No se pudo eliminar"));
              }} />
          ))}
          {r.spaces.length === 0 && <p className="px-2 text-xs text-muted">Aún no hay espacios.</p>}
        </nav>
      </aside>

      {/* Contenido */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-8">
        {/* Selector para móvil */}
        <div className="md:hidden mb-4 flex gap-2">
          <select value={tableId ?? ""} onChange={(e) => setTableId(e.target.value || null)}
            className="flex-1 bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink">
            {r.spaces.map((s) => (
              <optgroup key={s.id} label={`${s.icon} ${s.name}`}>
                {r.tables.filter((t) => t.spaceId === s.id).map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </optgroup>
            ))}
          </select>
          <button onClick={() => setModal({ kind: "space" })} className="px-3 rounded-lg border border-line text-muted">+</button>
        </div>

        {table && space ? (
          <>
            <p className="font-mono text-muted text-xs tracking-widest uppercase mb-2">{space.icon} {space.name}{!editable && " · solo lectura"}</p>
            <ReportTableView
              table={table} rows={rowsApi.rows} loading={rowsApi.loading} editable={editable} users={users}
              onUpdateTable={updateTable}
              onAddRow={(init) => rowsApi.addRow({ ...init, content: table.template }).catch(fail("No se pudo crear la fila"))}
              onSetTitle={(id, t) => rowsApi.setTitle(id, t).catch(fail("No se pudo guardar el título"))}
              onSetCell={(id, col, v) => rowsApi.setCell(id, col, v).catch(fail("No se pudo guardar la celda"))}
              onDeleteRow={(id) => rowsApi.deleteRow(id).catch(fail("No se pudo eliminar"))}
              onOpenRow={setOpenRowId}
              onPrint={print}
              onSend={(rowIds) => rowIds.length ? setModal({ kind: "send", rowIds }) : toast("No hay filas para enviar", "info")}
              onDeleteTable={() => {
                if (!window.confirm(`¿Eliminar la tabla “${table.name}” y todos sus reportes? No se puede deshacer.`)) return;
                r.deleteTable(table.id).then(() => setTableId(null)).catch(fail("No se pudo eliminar la tabla"));
              }}
            />
          </>
        ) : (
          <EmptyState hasSpaces={r.spaces.length > 0}
            onNewSpace={() => setModal({ kind: "space" })}
            onNewTable={() => r.spaces[0] && setModal({ kind: "table", spaceId: r.spaces[0].id })} />
        )}
      </div>

      {table && space && openRow && (
        <RowPanel
          table={table} row={openRow} editable={editable} users={users}
          onClose={() => setOpenRowId(null)}
          onSetTitle={(t) => rowsApi.setTitle(openRow.id, t).catch(fail("No se pudo guardar el título"))}
          onSetCell={(col, v) => rowsApi.setCell(openRow.id, col, v).catch(fail("No se pudo guardar"))}
          onAddOption={(colId, opt) => updateTable({
            columns: table.columns.map((c) => (c.id === colId ? { ...c, options: [...(c.options ?? []), opt] } : c)),
          })}
          onSaveContent={(doc) => rowsApi.setContent(openRow.id, doc)}
          onUploadImage={(file) => uploadReportImage(space.id, file)}
          onSaveTemplate={(doc) => { updateTable({ template: doc }); toast("✓ Plantilla guardada para las filas nuevas", "success"); }}
          onPrint={() => print([openRow.id])}
          onSend={() => setModal({ kind: "send", rowIds: [openRow.id] })}
          onDelete={() => { rowsApi.deleteRow(openRow.id).catch(fail("No se pudo eliminar")); setOpenRowId(null); }}
          onError={(m) => toast(`✕ ${m}`, "error")}
        />
      )}

      {modal?.kind === "space" && (
        <NewSpaceModal onClose={() => setModal(null)} onCreate={async (name, icon, preset) => {
          try {
            const s = await r.createSpace(name, icon);
            if (preset) {
              const t = await r.createTable(s.id, preset.name, preset.icon, preset.preset);
              setTableId(t.id);
            }
            setModal(null);
          } catch (e) { fail("No se pudo crear el espacio")(e); }
        }} />
      )}
      {modal?.kind === "table" && (
        <NewTableModal onClose={() => setModal(null)} onCreate={async (name, icon, preset) => {
          try {
            const t = await r.createTable(modal.spaceId, name, icon, preset);
            setTableId(t.id);
            setModal(null);
          } catch (e) { fail("No se pudo crear la tabla")(e); }
        }} />
      )}
      {modal?.kind === "send" && table && (
        <SendModal
          tableId={table.id}
          rowIds={modal.rowIds}
          title={modal.rowIds.length === 1
            ? rowsApi.rows.find((x) => x.id === modal.rowIds[0])?.title || "Sin título"
            : `${modal.rowIds.length} reportes de ${table.name}`}
          users={users.filter((u) => u.role !== "client" && u.id !== me?.id)}
          onClose={() => setModal(null)}
          onSent={(names, skipped) => {
            setModal(null);
            toast(`✓ Enviado a ${names.join(", ")}${skipped ? ` (${skipped} imagen(es) no cupieron)` : ""}`, "success");
          }}
          onError={(msg) => toast(`✕ ${msg}`, "error")}
        />
      )}
      {modal?.kind === "share" && (
        <ShareModal
          space={r.spaces.find((s) => s.id === modal.spaceId)!}
          members={r.members.filter((m) => m.spaceId === modal.spaceId)}
          users={users.filter((u) => u.id !== r.spaces.find((s) => s.id === modal.spaceId)?.createdBy)}
          onSet={(userId, role) => r.setMember(modal.spaceId, userId, role).catch(fail("No se pudo cambiar el acceso"))}
          onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SpaceTree({ space, tables, members, activeTableId, canEdit, canManage, onSelect, onNewTable, onShare, onRename, onDelete }: {
  space: ReportSpace; tables: ReportTable[]; members: SpaceMember[]; activeTableId: string | null;
  canEdit: boolean; canManage: boolean;
  onSelect: (id: string) => void; onNewTable: () => void; onShare: () => void; onRename: (n: string) => void; onDelete: () => void;
}) {
  return (
    <div className="group/space">
      <div className="flex items-center gap-2 px-2 py-1">
        <span>{space.icon}</span>
        <InlineText value={space.name} editable={canManage} onCommit={(n) => n.trim() && onRename(n.trim())}
          className="text-sm font-600 text-ink truncate" />
        {members.length > 0 && <span title={`Compartido con ${members.length}`} className="text-[10px] font-mono text-muted flex-shrink-0">👥{members.length}</span>}
      </div>
      <div className="ml-3 pl-2 border-l border-line space-y-0.5">
        {tables.map((t) => (
          <button key={t.id} onClick={() => onSelect(t.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${t.id === activeTableId ? "bg-primary/10 text-primary" : "text-muted hover:text-ink hover:bg-surface2"}`}>
            <span>{t.icon}</span><span className="truncate">{t.name}</span>
          </button>
        ))}
        <div className="flex gap-2 px-2 pt-1 opacity-60 group-hover/space:opacity-100 transition-opacity">
          {canEdit && <button onClick={onNewTable} className="text-[10px] font-mono text-muted hover:text-primary">+ tabla</button>}
          {canManage && <button onClick={onShare} className="text-[10px] font-mono text-muted hover:text-primary">compartir</button>}
          {canManage && <button onClick={onDelete} className="text-[10px] font-mono text-muted hover:text-danger">eliminar</button>}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasSpaces, onNewSpace, onNewTable }: { hasSpaces: boolean; onNewSpace: () => void; onNewTable: () => void }) {
  return (
    <div className="max-w-lg mx-auto text-center py-20">
      <p className="text-5xl mb-4">🗂️</p>
      <h1 className="font-display text-3xl font-700 uppercase text-ink">Reportes</h1>
      <p className="mt-3 text-sm text-muted leading-relaxed">
        Organiza bitácoras, seguimientos y reportes en espacios compartidos. Cada fila tiene su propia página
        donde puedes escribir, hacer checklists y pegar capturas, y todo se exporta a PDF.
      </p>
      <button onClick={hasSpaces ? onNewTable : onNewSpace} className="mt-6 text-xs font-mono px-5 py-2.5 rounded-lg bg-accent text-bg font-700 hover:opacity-90">
        {hasSpaces ? "+ Crear una tabla" : "+ Crear el primer espacio"}
      </button>
    </div>
  );
}

const PRESETS: { preset: TablePreset; icon: string; name: string; desc: string }[] = [
  { preset: "bitacora", icon: "🛠️", name: "Bitácora", desc: "Un reporte por fecha con hora de comienzo y salida, agrupado por mes. Ideal para mantenimientos." },
  { preset: "redes", icon: "📣", name: "Seguimiento de redes", desc: "Clientes por red social con enlace, último post, última revisión y programación." },
  { preset: "blank", icon: "📋", name: "En blanco", desc: "Solo el nombre. Agrega las columnas que quieras." },
];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-line rounded-2xl p-6 w-full max-w-md shadow-2xl animate-pop-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-700 uppercase text-ink">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function PresetPicker({ value, onChange }: { value: TablePreset; onChange: (p: TablePreset) => void }) {
  return (
    <div className="space-y-2">
      {PRESETS.map((p) => (
        <button key={p.preset} onClick={() => onChange(p.preset)}
          className={`w-full text-left flex gap-3 p-3 rounded-xl border transition-colors ${value === p.preset ? "border-primary/50 bg-primary/10" : "border-line hover:border-muted"}`}>
          <span className="text-xl">{p.icon}</span>
          <span>
            <span className="block text-sm font-600 text-ink">{p.name}</span>
            <span className="block text-xs text-muted mt-0.5">{p.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function NewSpaceModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, icon: string, firstTable: { name: string; icon: string; preset: TablePreset } | null) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(SPACE_ICONS[0]);
  const [tableName, setTableName] = useState("");
  const [preset, setPreset] = useState<TablePreset>("bitacora");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    const p = PRESETS.find((x) => x.preset === preset)!;
    await onCreate(name.trim(), icon, tableName.trim() ? { name: tableName.trim(), icon: p.icon, preset } : null);
    setBusy(false);
  };
  return (
    <Modal title="Nuevo espacio" onClose={onClose}>
      <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1">Nombre del espacio</label>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Tareas Websites"
        className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none mb-3" />
      <div className="flex flex-wrap gap-1 mb-5">
        {SPACE_ICONS.map((i) => (
          <button key={i} onClick={() => setIcon(i)} className={`w-9 h-9 rounded-lg ${icon === i ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-surface2"}`}>{i}</button>
        ))}
      </div>
      <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1">Primera tabla (opcional)</label>
      <input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="Ej. Mantenimiento"
        className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none mb-3" />
      {tableName.trim() && <PresetPicker value={preset} onChange={setPreset} />}
      <button onClick={submit} disabled={!name.trim() || busy}
        className="w-full mt-5 text-xs font-mono py-2.5 rounded-lg bg-accent text-bg font-700 disabled:opacity-40">
        {busy ? "Creando…" : "Crear espacio"}
      </button>
    </Modal>
  );
}

function NewTableModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, icon: string, preset: TablePreset) => Promise<void> }) {
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<TablePreset>("bitacora");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    await onCreate(name.trim(), PRESETS.find((p) => p.preset === preset)!.icon, preset);
    setBusy(false);
  };
  return (
    <Modal title="Nueva tabla" onClose={onClose}>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Mantenimiento" onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none mb-3" />
      <PresetPicker value={preset} onChange={setPreset} />
      <button onClick={submit} disabled={!name.trim() || busy}
        className="w-full mt-5 text-xs font-mono py-2.5 rounded-lg bg-accent text-bg font-700 disabled:opacity-40">
        {busy ? "Creando…" : "Crear tabla"}
      </button>
    </Modal>
  );
}

function ShareModal({ space, members, users, onSet, onClose }: {
  space: ReportSpace; members: SpaceMember[]; users: User[];
  onSet: (userId: string, role: SpaceMember["role"] | null) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => users
    .filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(members.some((m) => m.userId === b.id)) - Number(members.some((m) => m.userId === a.id))),
  [users, members, q]);
  return (
    <Modal title={`Compartir ${space.icon} ${space.name}`} onClose={onClose}>
      <p className="text-xs text-muted mb-3">Los admins ven todos los espacios. Aquí das acceso a las demás personas.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona…"
        className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none mb-3" />
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {list.map((u) => {
          const m = members.find((x) => x.userId === u.id);
          return (
            <div key={u.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface2">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-700 flex-shrink-0" style={{ background: `${u.color}30`, color: u.color }}>{u.initials}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">{u.name}</p>
                <p className="text-[10px] text-muted truncate">{u.email}</p>
              </div>
              <select value={m?.role ?? ""} onChange={(e) => onSet(u.id, (e.target.value || null) as SpaceMember["role"] | null)}
                className="bg-surface2 border border-line rounded-lg px-2 py-1 text-xs text-ink">
                <option value="">Sin acceso</option>
                <option value="editor">Puede editar</option>
                <option value="viewer">Solo ver</option>
              </select>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

const LAST_RECIPIENTS_KEY = "epikom-reportes-destinatarios";

function SendModal({ tableId, rowIds, title, users, onClose, onSent, onError }: {
  tableId: string; rowIds: string[]; title: string; users: User[];
  onClose: () => void; onSent: (names: string[], skippedImages: number) => void; onError: (msg: string) => void;
}) {
  // Se recuerdan los últimos destinatarios (normalmente siempre es Laura)
  const [selected, setSelected] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_RECIPIENTS_KEY) ?? "[]") as string[];
      return saved.filter((id) => users.some((u) => u.id === id));
    } catch { return []; }
  });
  const [message, setMessage] = useState("");
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);

  const list = users.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const send = async () => {
    if (!selected.length || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/reportes/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, rowIds, recipientIds: selected, message }),
      });
      const json = await res.json().catch(() => ({})) as { error?: string; to?: string[]; skippedImages?: number };
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      try { localStorage.setItem(LAST_RECIPIENTS_KEY, JSON.stringify(selected)); } catch { /* sin storage */ }
      onSent(json.to ?? [], json.skippedImages ?? 0);
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo enviar");
      setSending(false);
    }
  };

  return (
    <Modal title="Enviar por correo" onClose={sending ? () => {} : onClose}>
      <p className="text-sm text-ink mb-1 truncate">✉ {title}</p>
      <p className="text-xs text-muted mb-4">Llega con el contenido completo, las capturas y un botón para abrirlo en el Hub.</p>

      <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1">Para</label>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona…"
        className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none mb-2" />
      <div className="max-h-48 overflow-y-auto space-y-0.5 mb-4">
        {list.map((u) => (
          <label key={u.id} className={`flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer ${selected.includes(u.id) ? "bg-primary/10" : "hover:bg-surface2"}`}>
            <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} className="w-4 h-4 accent-[var(--app-primary)]" />
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-700 flex-shrink-0" style={{ background: `${u.color}30`, color: u.color }}>{u.initials}</span>
            <span className="min-w-0">
              <span className="block text-sm text-ink truncate">{u.name}</span>
              <span className="block text-[10px] text-muted truncate">{u.email}</span>
            </span>
          </label>
        ))}
        {list.length === 0 && <p className="px-2 py-3 text-xs text-muted">Nadie coincide con la búsqueda.</p>}
      </div>

      <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1">Mensaje (opcional)</label>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000}
        placeholder="Ej. Laura, te comparto el mantenimiento de esta semana."
        className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none resize-y" />

      <button onClick={send} disabled={!selected.length || sending}
        className="w-full mt-4 text-xs font-mono py-2.5 rounded-lg bg-accent text-bg font-700 disabled:opacity-40 flex items-center justify-center gap-2">
        {sending && <span className="w-3 h-3 rounded-full border-2 border-bg border-t-transparent animate-spin" />}
        {sending ? "Enviando…" : selected.length ? `Enviar a ${selected.length} persona${selected.length > 1 ? "s" : ""}` : "Elige a quién enviar"}
      </button>
    </Modal>
  );
}
