"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { JSONContent } from "@tiptap/react";
import type { User } from "../types";
import type { ReportTable, ReportRow, CellValue, SelectOption } from "./types";
import { COLUMN_TYPES } from "./types";
import { Cell, InlineText } from "./Cells";
import RichEditor from "./RichEditor";
import { minutesBetween, fmtDuration } from "./utils";

interface Props {
  table: ReportTable;
  row: ReportRow;
  editable: boolean;
  users: User[];
  onClose: () => void;
  onSetTitle: (title: string) => void;
  onSetCell: (columnId: string, value: CellValue) => void;
  onAddOption: (columnId: string, opt: SelectOption) => void;
  onSaveContent: (doc: JSONContent) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  onSaveTemplate: (doc: JSONContent) => void;
  onPrint: () => void;
  onSend: () => void;
  onDelete: () => void;
  onError: (msg: string) => void;
}

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

export default function RowPanel(p: Props) {
  const { table, row, editable } = p;
  const [save, setSave] = useState<SaveState>("idle");
  const pending = useRef<JSONContent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(p.onSaveContent);
  useEffect(() => { saveRef.current = p.onSaveContent; });

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const doc = pending.current;
    if (!doc) return;
    pending.current = null;
    setSave("saving");
    try {
      await saveRef.current(doc);
      setSave("saved");
    } catch {
      setSave("error");
    }
  }, []);

  // Guardado automático: 800 ms después de dejar de escribir
  const onChange = (doc: JSONContent) => {
    pending.current = doc;
    setSave("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  };

  // Al cambiar de fila o cerrar, guardar lo que quede
  useEffect(() => () => { flush(); }, [row.id, flush]);

  // Avisar si intentan cerrar la pestaña con cambios sin guardar
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (pending.current) e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const close = async () => { await flush(); p.onClose(); };

  // Duración entre las dos primeras columnas de fecha con hora (bitácoras)
  const timed = table.columns.filter((c) => c.type === "date" && c.withTime);
  const mins = timed.length >= 2 ? minutesBetween(String(row.values[timed[0].id] ?? ""), String(row.values[timed[1].id] ?? "")) : null;

  const saveLabel: Record<SaveState, string> = {
    idle: "", pending: "Sin guardar…", saving: "Guardando…", saved: "✓ Guardado", error: "✕ No se pudo guardar",
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-bg/60 backdrop-blur-[2px]" onClick={close} />
      <div className="relative w-full max-w-3xl h-full bg-surface border-l border-line shadow-2xl flex flex-col animate-slide-in-right">
        {/* Barra superior */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line">
          <div className="flex items-center gap-2 text-xs font-mono text-muted min-w-0">
            <span>{table.icon}</span><span className="truncate">{table.name}</span>
            <span className={`ml-2 ${save === "error" ? "text-danger" : save === "saved" ? "text-primary" : ""}`}>{saveLabel[save]}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={async () => { await flush(); p.onSend(); }} title="Enviar este reporte por correo"
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-line text-muted hover:text-ink">✉ Enviar</button>
            <button onClick={async () => { await flush(); p.onPrint(); }} className="text-xs font-mono px-3 py-1.5 rounded-lg border border-line text-muted hover:text-ink">⎙ PDF</button>
            {editable && (
              <button
                onClick={() => {
                  if (window.confirm("¿Usar el contenido de esta página como plantilla? Cada fila nueva de esta tabla empezará con este texto.")) {
                    p.onSaveTemplate(pending.current ?? row.content ?? { type: "doc", content: [] });
                  }
                }}
                title="Las filas nuevas empezarán con este contenido"
                className="text-xs font-mono px-3 py-1.5 rounded-lg border border-line text-muted hover:text-ink">
                ☆ Plantilla
              </button>
            )}
            {editable && (
              <button onClick={() => window.confirm(`¿Eliminar “${row.title || "Sin título"}”?`) && p.onDelete()}
                className="text-xs font-mono px-3 py-1.5 rounded-lg border border-line text-muted hover:text-danger">Eliminar</button>
            )}
            <button onClick={close} title="Cerrar" className="w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-surface2">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8">
          <InlineText value={row.title} editable={editable} placeholder="Sin título" onCommit={p.onSetTitle}
            className="font-display text-3xl md:text-4xl font-700 text-ink leading-tight" />

          {/* Propiedades */}
          <div className="mt-6 space-y-1">
            {table.columns.map((c) => (
              <div key={c.id} className="grid grid-cols-[160px_1fr] items-center gap-3 py-1.5">
                <span className="flex items-center gap-2 text-sm text-muted">
                  <span className="font-mono text-[10px] w-4 text-center">{COLUMN_TYPES.find((t) => t.type === c.type)?.icon}</span>
                  {c.name}
                </span>
                <div className="min-w-0">
                  <Cell column={c} value={row.values[c.id]} editable={editable} users={p.users}
                    onChange={(v) => p.onSetCell(c.id, v)} onAddOption={(opt) => p.onAddOption(c.id, opt)} />
                </div>
              </div>
            ))}
            {mins !== null && mins >= 0 && (
              <div className="grid grid-cols-[160px_1fr] items-center gap-3 py-1.5">
                <span className="flex items-center gap-2 text-sm text-muted"><span className="font-mono text-[10px] w-4 text-center">⏱</span>Duración</span>
                <span className="text-sm text-ink font-mono">{fmtDuration(mins)}</span>
              </div>
            )}
          </div>

          <div className="mt-8 pt-2 border-t border-line">
            <RichEditor
              key={row.id}
              initialContent={row.content}
              editable={editable}
              onChange={onChange}
              onUploadImage={p.onUploadImage}
              onError={p.onError}
              placeholder={editable ? "Escribe aquí. Pega capturas con Ctrl+V…" : ""}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
