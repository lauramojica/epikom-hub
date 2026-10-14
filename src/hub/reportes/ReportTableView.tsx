"use client";
import { useMemo, useState } from "react";
import type { User } from "../types";
import type { ReportTable, ReportRow, ReportColumn, ColumnType, CellValue, SelectOption } from "./types";
import { COLUMN_TYPES, TITLE_COLUMN } from "./types";
import { Cell, InlineText, Popover } from "./Cells";
import { groupRows, sortRows, newId, longDayTitle } from "./utils";
import { initialValues } from "./useReportes";

interface Props {
  table: ReportTable;
  rows: ReportRow[];
  loading: boolean;
  editable: boolean;
  users: User[];
  onUpdateTable: (patch: Partial<ReportTable>) => void;
  onAddRow: (init: { title?: string; values?: Record<string, CellValue> }) => Promise<ReportRow | void>;
  onSetTitle: (rowId: string, title: string) => void;
  onSetCell: (rowId: string, columnId: string, value: CellValue) => void;
  onDeleteRow: (rowId: string) => void;
  onOpenRow: (rowId: string) => void;
  onPrint: (rowIds: string[]) => void;
  onDeleteTable: () => void;
}

const typeIcon = (t: ColumnType) => COLUMN_TYPES.find((c) => c.type === t)?.icon ?? "Aa";

export default function ReportTableView(p: Props) {
  const { table, rows, editable } = p;
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<null | "group" | "sort" | "addcol" | "table">(null);
  const [colMenu, setColMenu] = useState<string | null>(null);

  const groupColumn = table.columns.find((c) => c.id === table.groupBy);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = !q ? rows : rows.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      Object.values(r.values).some((v) => typeof v === "string" && v.toLowerCase().includes(q)));
    return sortRows(filtered, table.sortBy, table.sortDesc);
  }, [rows, search, table.sortBy, table.sortDesc]);
  const groups = useMemo(() => groupRows(visible, groupColumn, table.sortDesc), [visible, groupColumn, table.sortDesc]);

  const updateColumn = (id: string, patch: Partial<ReportColumn>) =>
    p.onUpdateTable({ columns: table.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const addOption = (colId: string, opt: SelectOption) => {
    const col = table.columns.find((c) => c.id === colId);
    updateColumn(colId, { options: [...(col?.options ?? []), opt] });
  };

  const moveColumn = (id: string, dir: -1 | 1) => {
    const cols = [...table.columns];
    const i = cols.findIndex((c) => c.id === id);
    const j = i + dir;
    if (j < 0 || j >= cols.length) return;
    [cols[i], cols[j]] = [cols[j], cols[i]];
    p.onUpdateTable({ columns: cols });
  };

  const deleteColumn = (id: string) => {
    const col = table.columns.find((c) => c.id === id);
    if (!col || !window.confirm(`¿Eliminar la columna “${col.name}”? Los datos de esa columna dejan de verse.`)) return;
    p.onUpdateTable({
      columns: table.columns.filter((c) => c.id !== id),
      groupBy: table.groupBy === id ? null : table.groupBy,
      sortBy: table.sortBy === id ? null : table.sortBy,
    });
  };

  /** Fila nueva: hereda el grupo donde se creó y, si el título es una fecha, lo sugiere */
  const addRowIn = async (groupKey?: string) => {
    const values = initialValues(table.columns);
    if (groupColumn?.type === "select" && groupKey) values[groupColumn.id] = groupKey;
    const firstDate = table.columns.find((c) => c.type === "date" && c.defaultNow);
    const title = firstDate && /fecha/i.test(table.titleLabel) ? longDayTitle(String(values[firstDate.id])) : "";
    const row = await p.onAddRow({ title, values });
    if (row) p.onOpenRow(row.id);
  };

  const gridCols = `minmax(220px,2fr) ${table.columns.map((c) => (c.type === "checkbox" ? "90px" : c.type === "text" ? "minmax(200px,2fr)" : "minmax(150px,1fr)")).join(" ")} 40px`;

  return (
    <div className="space-y-4">
      {/* Encabezado de la tabla */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl">{table.icon}</span>
          <InlineText value={table.name} editable={editable} onCommit={(name) => name.trim() && p.onUpdateTable({ name: name.trim() })}
            className="font-display text-3xl md:text-4xl font-700 uppercase tracking-tight text-ink" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…"
            className="bg-surface border border-line rounded-lg px-3 py-1.5 text-sm text-ink outline-none focus:border-primary/40 w-36" />

          <div className="relative">
            <ToolbarButton active={!!table.groupBy} onClick={() => setMenu("group")}>
              ▤ {groupColumn ? `Por ${groupColumn.name.toLowerCase()}` : "Agrupar"}
            </ToolbarButton>
            {menu === "group" && (
              <Popover onClose={() => setMenu(null)} align="right">
                <MenuItem active={!table.groupBy} onClick={() => { p.onUpdateTable({ groupBy: null }); setMenu(null); }}>Sin agrupar</MenuItem>
                {table.columns.filter((c) => c.type === "date" || c.type === "select").map((c) => (
                  <MenuItem key={c.id} active={table.groupBy === c.id} onClick={() => { p.onUpdateTable({ groupBy: c.id }); setMenu(null); }}>
                    {c.name} {c.type === "date" && <span className="text-muted text-xs">(por mes)</span>}
                  </MenuItem>
                ))}
              </Popover>
            )}
          </div>

          <div className="relative">
            <ToolbarButton active={!!table.sortBy} onClick={() => setMenu("sort")}>
              ⇅ {table.sortBy ? (table.sortBy === TITLE_COLUMN ? table.titleLabel : table.columns.find((c) => c.id === table.sortBy)?.name) : "Ordenar"}
            </ToolbarButton>
            {menu === "sort" && (
              <Popover onClose={() => setMenu(null)} align="right">
                <MenuItem active={!table.sortBy} onClick={() => p.onUpdateTable({ sortBy: null })}>Orden de creación</MenuItem>
                {[{ id: TITLE_COLUMN, name: table.titleLabel }, ...table.columns.filter((c) => c.type !== "checkbox")].map((c) => (
                  <MenuItem key={c.id} active={table.sortBy === c.id} onClick={() => p.onUpdateTable({ sortBy: c.id })}>{c.name}</MenuItem>
                ))}
                <div className="flex gap-1 mt-1 pt-2 border-t border-line">
                  <button onClick={() => p.onUpdateTable({ sortDesc: false })} className={`flex-1 text-xs font-mono py-1.5 rounded-lg ${!table.sortDesc ? "bg-primary/15 text-primary" : "text-muted hover:text-ink"}`}>Ascendente</button>
                  <button onClick={() => p.onUpdateTable({ sortDesc: true })} className={`flex-1 text-xs font-mono py-1.5 rounded-lg ${table.sortDesc ? "bg-primary/15 text-primary" : "text-muted hover:text-ink"}`}>Descendente</button>
                </div>
              </Popover>
            )}
          </div>

          <ToolbarButton onClick={() => p.onPrint(visible.map((r) => r.id))}>⎙ PDF</ToolbarButton>

          {editable && (
            <div className="relative">
              <ToolbarButton onClick={() => setMenu("table")}>⋯</ToolbarButton>
              {menu === "table" && (
                <Popover onClose={() => setMenu(null)} align="right">
                  <p className="px-2 pt-1 pb-2 text-[10px] font-mono uppercase tracking-widest text-muted">Ícono</p>
                  <div className="flex flex-wrap gap-1 px-1 pb-2">
                    {["📋", "🛠️", "🏗️", "📣", "📊", "🗓️", "🌐", "📝", "✅", "💼"].map((i) => (
                      <button key={i} onClick={() => p.onUpdateTable({ icon: i })} className={`w-8 h-8 rounded-lg hover:bg-surface2 ${table.icon === i ? "bg-surface2" : ""}`}>{i}</button>
                    ))}
                  </div>
                  <MenuItem danger onClick={() => { setMenu(null); p.onDeleteTable(); }}>Eliminar tabla</MenuItem>
                </Popover>
              )}
            </div>
          )}

          {editable && (
            <button onClick={() => addRowIn()} className="text-xs font-mono px-4 py-2 rounded-lg bg-accent text-bg font-700 hover:opacity-90">
              + Nuevo
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface border border-line rounded-2xl overflow-x-auto">
        <div style={{ minWidth: "fit-content" }}>
          {/* Encabezados de columna */}
          <div className="grid border-b border-line text-xs text-muted" style={{ gridTemplateColumns: gridCols }}>
            <div className="px-3 py-2.5 flex items-center gap-2 border-r border-line">
              <span className="font-mono text-[10px]">Aa</span>
              <InlineText value={table.titleLabel} editable={editable} onCommit={(v) => v.trim() && p.onUpdateTable({ titleLabel: v.trim() })} className="text-xs text-muted" />
            </div>
            {table.columns.map((c, i) => (
              <div key={c.id} className="relative border-r border-line">
                <button disabled={!editable} onClick={() => setColMenu(c.id)} className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-surface2 disabled:hover:bg-transparent">
                  <span className="font-mono text-[10px]">{typeIcon(c.type)}</span>
                  <span className="truncate">{c.name}</span>
                </button>
                {colMenu === c.id && (
                  <Popover onClose={() => setColMenu(null)} align={i > table.columns.length - 3 ? "right" : "left"}>
                    <ColumnEditor column={c}
                      onChange={(patch) => updateColumn(c.id, patch)}
                      onMove={(d) => moveColumn(c.id, d)}
                      onDelete={() => { setColMenu(null); deleteColumn(c.id); }} />
                  </Popover>
                )}
              </div>
            ))}
            <div className="relative flex items-center justify-center">
              {editable && (
                <button onClick={() => setMenu("addcol")} title="Agregar columna" className="w-full h-full text-base hover:bg-surface2 hover:text-ink">+</button>
              )}
              {menu === "addcol" && (
                <Popover onClose={() => setMenu(null)} align="right">
                  <AddColumn onAdd={(col) => { p.onUpdateTable({ columns: [...table.columns, col] }); setMenu(null); }} />
                </Popover>
              )}
            </div>
          </div>

          {p.loading && <p className="px-4 py-8 text-sm text-muted text-center">Cargando…</p>}
          {!p.loading && rows.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-muted">Esta tabla está vacía.</p>
              {editable && <button onClick={() => addRowIn()} className="mt-3 text-xs font-mono text-primary hover:underline">+ Crear la primera fila</button>}
            </div>
          )}

          {groups.map((g) => (
            <div key={g.key || "_none"}>
              {groupColumn && (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-surface2/60 border-b border-line">
                  <div className="flex items-center gap-2">
                    {g.color && <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />}
                    <span className="font-display text-lg font-700 uppercase tracking-wide text-ink">{g.label}</span>
                    <span className="text-[10px] font-mono text-muted">{g.rows.length}</span>
                  </div>
                  <button onClick={() => p.onPrint(g.rows.map((r) => r.id))} className="text-[10px] font-mono text-muted hover:text-primary">⎙ PDF de este grupo</button>
                </div>
              )}
              {g.rows.map((r) => (
                <div key={r.id} className="grid border-b border-line/60 hover:bg-surface2/40 group" style={{ gridTemplateColumns: gridCols }}>
                  <div className="px-3 py-2 flex items-center gap-2 border-r border-line/60 min-w-0">
                    <button onClick={() => p.onOpenRow(r.id)} title="Abrir página" className="text-muted hover:text-primary flex-shrink-0">
                      {r.content ? "📄" : "▫"}
                    </button>
                    <InlineText value={r.title} editable={editable} placeholder="Sin título" onCommit={(t) => p.onSetTitle(r.id, t)} className="text-sm font-600 text-ink" />
                    <button onClick={() => p.onOpenRow(r.id)} className="opacity-0 group-hover:opacity-100 text-[10px] font-mono px-2 py-0.5 rounded border border-line text-muted hover:text-ink flex-shrink-0">ABRIR</button>
                  </div>
                  {table.columns.map((c) => (
                    <div key={c.id} className="px-3 py-2 flex items-center border-r border-line/60 min-w-0">
                      <Cell column={c} value={r.values[c.id]} editable={editable} users={p.users}
                        onChange={(v) => p.onSetCell(r.id, c.id, v)}
                        onAddOption={(opt) => addOption(c.id, opt)} />
                    </div>
                  ))}
                  <div className="flex items-center justify-center">
                    {editable && (
                      <button onClick={() => window.confirm(`¿Eliminar “${r.title || "Sin título"}”?`) && p.onDeleteRow(r.id)}
                        title="Eliminar" className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger text-sm">✕</button>
                    )}
                  </div>
                </div>
              ))}
              {editable && groupColumn && (
                <button onClick={() => addRowIn(g.key)} className="w-full px-3 py-2 text-left text-xs text-muted hover:text-ink hover:bg-surface2/40 border-b border-line/60">
                  + Nueva fila{g.label ? ` en ${g.label}` : ""}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {rows.length > 0 && (
        <p className="text-[10px] font-mono text-muted text-right">{visible.length} de {rows.length} filas</p>
      )}
    </div>
  );
}

function ToolbarButton({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${active ? "border-primary/40 text-primary bg-primary/10" : "border-line text-muted hover:text-ink"}`}>
      {children}
    </button>
  );
}

function MenuItem({ children, onClick, active, danger }: { children: React.ReactNode; onClick: () => void; active?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-surface2 ${danger ? "text-danger" : active ? "text-primary" : "text-ink"}`}>
      {children}
    </button>
  );
}

function AddColumn({ onAdd }: { onAdd: (c: ReportColumn) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const submit = () => {
    if (!name.trim()) return;
    onAdd({ id: newId(), name: name.trim(), type, ...(type === "select" ? { options: [] } : {}) });
  };
  return (
    <div className="w-60">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Nombre de la columna" className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none mb-2" />
      <div className="grid grid-cols-2 gap-1 mb-2">
        {COLUMN_TYPES.map((t) => (
          <button key={t.type} onClick={() => setType(t.type)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left ${type === t.type ? "bg-primary/15 text-primary" : "text-muted hover:bg-surface2 hover:text-ink"}`}>
            <span className="font-mono w-4 text-center">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={!name.trim()} className="w-full text-xs font-mono py-2 rounded-lg bg-accent text-bg font-700 disabled:opacity-40">Agregar</button>
    </div>
  );
}

function ColumnEditor({ column, onChange, onMove, onDelete }: {
  column: ReportColumn; onChange: (p: Partial<ReportColumn>) => void; onMove: (d: -1 | 1) => void; onDelete: () => void;
}) {
  return (
    <div className="w-64 space-y-2">
      <InlineText value={column.name} editable onCommit={(v) => v.trim() && onChange({ name: v.trim() })}
        className="bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink" />
      <p className="px-1 text-[10px] font-mono uppercase tracking-widest text-muted">
        Tipo: {COLUMN_TYPES.find((t) => t.type === column.type)?.label}
      </p>

      {column.type === "date" && (
        <div className="space-y-1">
          <label className="flex items-center gap-2 px-1 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={!!column.withTime} onChange={(e) => onChange({ withTime: e.target.checked })} />
            Incluir hora
          </label>
          <label className="flex items-center gap-2 px-1 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={!!column.defaultNow} onChange={(e) => onChange({ defaultNow: e.target.checked })} />
            Llenar con la fecha actual al crear
          </label>
        </div>
      )}

      {column.type === "select" && (
        <div className="space-y-1">
          <p className="px-1 text-[10px] font-mono uppercase tracking-widest text-muted">Opciones</p>
          {(column.options ?? []).map((o) => (
            <div key={o.id} className="flex items-center gap-2 px-1">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: o.color }} />
              <InlineText value={o.label} editable className="text-sm text-ink"
                onCommit={(v) => v.trim() && onChange({ options: column.options!.map((x) => (x.id === o.id ? { ...x, label: v.trim() } : x)) })} />
              <button onClick={() => onChange({ options: column.options!.filter((x) => x.id !== o.id) })} className="text-xs text-muted hover:text-danger">✕</button>
            </div>
          ))}
          {!column.options?.length && <p className="px-1 text-xs text-muted">Se crean escribiendo en una celda.</p>}
        </div>
      )}

      <div className="flex gap-1 pt-2 border-t border-line">
        <button onClick={() => onMove(-1)} className="flex-1 text-xs font-mono py-1.5 rounded-lg text-muted hover:bg-surface2 hover:text-ink">← Mover</button>
        <button onClick={() => onMove(1)} className="flex-1 text-xs font-mono py-1.5 rounded-lg text-muted hover:bg-surface2 hover:text-ink">Mover →</button>
      </div>
      <button onClick={onDelete} className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-danger hover:bg-danger/10">Eliminar columna</button>
    </div>
  );
}
