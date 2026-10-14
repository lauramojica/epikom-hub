"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { User } from "../types";
import type { ReportColumn, CellValue, SelectOption } from "./types";
import { OPTION_COLORS } from "./types";
import { fmtDate, displayUrl, hrefFor, nowLocal, newId } from "./utils";

// ---------------------------------------------------------------------------
// Popover simple: se cierra al hacer clic fuera o con Escape
// ---------------------------------------------------------------------------
// Se dibuja en <body> con posición fija, anclado al elemento que lo contiene,
// para que no lo recorte el scroll horizontal de la tabla.
export function Popover({ onClose, children, align = "left" }: { onClose: () => void; children: React.ReactNode; align?: "left" | "right" }) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);

  useLayoutEffect(() => {
    const anchor = markerRef.current?.parentElement;
    if (!anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const top = r.bottom + 4;
      setPos(align === "right" ? { top, right: window.innerWidth - r.right } : { top, left: r.left });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); };
  }, [align]);

  useEffect(() => {
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [onClose]);

  return (
    <>
      <span ref={markerRef} hidden />
      {pos && createPortal(
        <div ref={ref}
          style={{ position: "fixed", top: pos.top, left: pos.left, right: pos.right, maxHeight: `calc(100vh - ${pos.top + 12}px)` }}
          className="z-[90] min-w-56 overflow-y-auto bg-surface border border-line rounded-xl shadow-2xl p-2 animate-pop-in">
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Texto con guardado al salir del campo (no en cada tecla)
// ---------------------------------------------------------------------------
export function InlineText({ value, onCommit, placeholder, editable, className = "", type = "text" }: {
  value: string; onCommit: (v: string) => void; placeholder?: string; editable: boolean; className?: string; type?: "text" | "number";
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  const [focused, setFocused] = useState(false);
  // Si llega un cambio de otra persona y no estoy escribiendo, mostrarlo
  if (value !== synced && !focused) {
    setSynced(value);
    setDraft(value);
  }

  if (!editable) return <span className={className}>{value || <span className="text-muted/40">{placeholder}</span>}</span>;
  return (
    <input
      type={type} value={draft} placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setFocused(false); if (draft !== value) onCommit(draft); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setDraft(value); (e.target as HTMLInputElement).blur(); } }}
      className={`w-full bg-transparent outline-none placeholder:text-muted/40 ${className}`}
    />
  );
}

export function OptionChip({ option }: { option: SelectOption }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-500 whitespace-nowrap"
      style={{ background: `${option.color}22`, color: option.color }}>
      {option.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Celda: muestra el valor y permite editarlo según el tipo de columna
// ---------------------------------------------------------------------------
interface CellProps {
  column: ReportColumn;
  value: CellValue | undefined;
  editable: boolean;
  users: User[];
  onChange: (v: CellValue) => void;
  onAddOption: (opt: SelectOption) => void;
}

export function Cell({ column, value, editable, users, onChange, onAddOption }: CellProps) {
  const [open, setOpen] = useState(false);
  const str = typeof value === "string" ? value : value == null ? "" : String(value);

  switch (column.type) {
    case "text":
      return <InlineText value={str} editable={editable} onCommit={(v) => onChange(v || null)} className="text-sm" />;

    case "number":
      return <InlineText type="number" value={str} editable={editable} className="text-sm font-mono text-right"
        onCommit={(v) => onChange(v === "" ? null : Number(v))} />;

    case "checkbox":
      return (
        <input type="checkbox" checked={value === true} disabled={!editable}
          onChange={(e) => onChange(e.target.checked || null)} className="w-4 h-4 accent-[var(--app-primary)] cursor-pointer" />
      );

    case "url":
      return (
        <div className="flex items-center gap-2 group/url min-w-0">
          {str && !open ? (
            <a href={hrefFor(str)} target="_blank" rel="noopener noreferrer"
              className="text-sm text-ink underline decoration-line underline-offset-2 hover:decoration-primary truncate">
              {displayUrl(str)}
            </a>
          ) : (
            <InlineText value={str} editable={editable} placeholder={editable ? "Pegar enlace" : ""}
              onCommit={(v) => { onChange(v.trim() || null); setOpen(false); }} className="text-sm" />
          )}
          {str && editable && !open && (
            <button onClick={() => setOpen(true)} title="Editar enlace"
              className="opacity-0 group-hover/url:opacity-100 text-[10px] text-muted hover:text-ink">✎</button>
          )}
        </div>
      );

    case "date":
      return <DateCell column={column} value={str} editable={editable} onChange={onChange} />;

    case "select": {
      const current = column.options?.find((o) => o.id === value);
      return (
        <div className="relative">
          <button disabled={!editable} onClick={() => setOpen(true)} className="text-left min-h-6">
            {current ? <OptionChip option={current} /> : <span className="text-sm text-muted/40">{editable ? "—" : ""}</span>}
          </button>
          {open && (
            <Popover onClose={() => setOpen(false)}>
              <SelectPicker options={column.options ?? []} value={str}
                onPick={(id) => { onChange(id); setOpen(false); }}
                onCreate={(label) => {
                  const opt = { id: newId(), label, color: OPTION_COLORS[(column.options?.length ?? 0) % OPTION_COLORS.length] };
                  onAddOption(opt);
                  onChange(opt.id);
                  setOpen(false);
                }} />
            </Popover>
          )}
        </div>
      );
    }

    case "person": {
      const person = users.find((u) => u.id === value);
      return (
        <div className="relative">
          <button disabled={!editable} onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm text-left">
            {person ? (
              <>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-700" style={{ background: `${person.color}30`, color: person.color }}>{person.initials}</span>
                <span className="text-ink truncate">{person.name}</span>
              </>
            ) : <span className="text-muted/40">{editable ? "—" : ""}</span>}
          </button>
          {open && (
            <Popover onClose={() => setOpen(false)}>
              <div className="max-h-64 overflow-y-auto">
                {users.filter((u) => u.role !== "client").map((u) => (
                  <button key={u.id} onClick={() => { onChange(u.id); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left hover:bg-surface2 ${u.id === value ? "text-primary" : "text-ink"}`}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-700" style={{ background: `${u.color}30`, color: u.color }}>{u.initials}</span>
                    {u.name}
                  </button>
                ))}
                {value && (
                  <button onClick={() => { onChange(null); setOpen(false); }} className="w-full px-2 py-1.5 rounded-lg text-xs font-mono text-muted hover:text-ink text-left">Quitar</button>
                )}
              </div>
            </Popover>
          )}
        </div>
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Fecha: lo que se escribe queda en borrador y se guarda al cerrar.
// Mientras la fecha está a medio escribir, el campo del navegador reporta
// valor vacío; si eso se guardara, borraría la fecha y reiniciaría el campo.
// ---------------------------------------------------------------------------
const VALID_DATE = /^(\d{4})-\d{2}-\d{2}(T\d{2}:\d{2})?/;

function validDate(v: string, withTime: boolean): string | null {
  const m = v.match(VALID_DATE);
  if (!m) return null;
  const year = Number(m[1]);
  if (year < 1900 || year > 2200) return null;           // año a medio escribir
  return withTime ? v.slice(0, 16) : v.slice(0, 10);    // sin segundos
}

function DateCell({ column, value, editable, onChange }: {
  column: ReportColumn; value: string; editable: boolean; onChange: (v: CellValue) => void;
}) {
  const withTime = !!column.withTime;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const openEditor = () => { setDraft(value); setOpen(true); };
  const commit = () => {
    const v = validDate(draft, withTime);
    if (v && v !== value) onChange(v);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button disabled={!editable} onClick={openEditor}
        className={`text-sm text-left whitespace-nowrap ${value ? "text-ink" : "text-muted/40"} ${editable ? "hover:text-primary" : ""}`}>
        {value ? fmtDate(value, withTime) : editable ? "—" : ""}
      </button>
      {open && (
        <Popover onClose={commit}>
          <input
            type={withTime ? "datetime-local" : "date"} value={draft} autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
            className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none report-date-input"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => { onChange(nowLocal(withTime)); setOpen(false); }}
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25">
              {withTime ? "Ahora" : "Hoy"}
            </button>
            <button onClick={() => { onChange(null); setOpen(false); }}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-line text-muted hover:text-ink">
              Borrar
            </button>
            <button onClick={commit}
              className="flex-1 text-xs font-mono px-3 py-1.5 rounded-lg bg-accent text-bg font-700 hover:opacity-90">
              Listo
            </button>
          </div>
        </Popover>
      )}
    </div>
  );
}

function SelectPicker({ options, value, onPick, onCreate }: {
  options: SelectOption[]; value: string; onPick: (id: string | null) => void; onCreate: (label: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const exact = options.some((o) => o.label.toLowerCase() === q.trim().toLowerCase());
  return (
    <div>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar o crear opción…"
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          if (filtered[0]) onPick(filtered[0].id);
          else if (q.trim()) onCreate(q.trim());
        }}
        className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none mb-1" />
      <div className="max-h-56 overflow-y-auto">
        {filtered.map((o) => (
          <button key={o.id} onClick={() => onPick(o.id)}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface2 ${o.id === value ? "bg-surface2" : ""}`}>
            <OptionChip option={o} />
            {o.id === value && <span className="text-primary text-xs">✓</span>}
          </button>
        ))}
        {q.trim() && !exact && (
          <button onClick={() => onCreate(q.trim())} className="w-full px-2 py-1.5 rounded-lg text-sm text-left text-muted hover:bg-surface2 hover:text-ink">
            + Crear <span className="text-ink">“{q.trim()}”</span>
          </button>
        )}
        {value && (
          <button onClick={() => onPick(null)} className="w-full px-2 py-1.5 rounded-lg text-xs font-mono text-muted hover:text-ink text-left">Quitar</button>
        )}
      </div>
    </div>
  );
}
