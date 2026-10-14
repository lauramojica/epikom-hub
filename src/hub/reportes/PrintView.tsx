"use client";
import { Fragment, useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import type { ReportColumn, CellValue } from "./types";
import RichEditor from "./RichEditor";
import { fmtDate, displayUrl, minutesBetween, fmtDuration } from "./utils";

interface Props {
  spaceName: string;
  table: { name: string; icon: string; titleLabel: string; columns: ReportColumn[] };
  rows: { id: string; title: string; values: Record<string, CellValue>; content: JSONContent | null }[];
  people: Record<string, string>;
}

function show(col: ReportColumn, v: CellValue | undefined, people: Record<string, string>): string {
  if (v === null || v === undefined || v === "") return "";
  switch (col.type) {
    case "date": return fmtDate(String(v), col.withTime);
    case "url": return displayUrl(String(v));
    case "checkbox": return v ? "Sí" : "No";
    case "select": return col.options?.find((o) => o.id === v)?.label ?? "";
    case "person": return people[String(v)] ?? "";
    default: return String(v);
  }
}

export default function PrintView({ spaceName, table, rows, people }: Props) {
  const [ready, setReady] = useState(false);
  const single = rows.length === 1;
  const timed = table.columns.filter((c) => c.type === "date" && c.withTime);

  // Abrir el diálogo de impresión cuando las imágenes terminaron de cargar
  useEffect(() => {
    const t = setTimeout(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(imgs.map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })));
      setReady(true);
      document.title = single ? rows[0].title || table.name : `${table.name} — ${rows.length} reportes`;
      window.print();
    }, 400);
    return () => clearTimeout(t);
  }, [rows, single, table.name]);

  const totalMin = timed.length >= 2
    ? rows.reduce((sum, r) => sum + Math.max(0, minutesBetween(String(r.values[timed[0].id] ?? ""), String(r.values[timed[1].id] ?? "")) ?? 0), 0)
    : 0;

  return (
    <div className="report-print min-h-screen bg-white text-[#101114]" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-3 bg-[#0a0a0d] text-white">
        <span className="text-sm">{ready ? "Elige “Guardar como PDF” como destino." : "Preparando…"}</span>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="text-xs font-mono px-4 py-2 rounded-lg bg-[#dbfa45] text-[#0a0a0d] font-700">Descargar PDF</button>
          <button onClick={() => window.close()} className="text-xs font-mono px-4 py-2 rounded-lg border border-white/20">Cerrar</button>
        </div>
      </div>

      <div className="max-w-[760px] mx-auto px-8 py-10">
        {!single && (
          <div className="report-print-page pb-6 mb-8 border-b border-[#dde0e5]">
            <Brand />
            <p className="mt-10 text-xs font-mono uppercase tracking-widest text-[#6b7280]">{spaceName}</p>
            <h1 className="text-4xl font-700 mt-1">{table.icon} {table.name}</h1>
            <p className="mt-2 text-sm text-[#6b7280]">
              {rows.length} reportes{totalMin > 0 && <> · {fmtDuration(totalMin)} en total</>}
            </p>
            <table className="w-full mt-8 text-sm border-collapse">
              <thead>
                <tr className="text-left text-[#6b7280] border-b border-[#dde0e5]">
                  <th className="py-2 pr-3 font-500">{table.titleLabel}</th>
                  {table.columns.map((c) => <th key={c.id} className="py-2 pr-3 font-500">{c.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#eceef1] align-top">
                    <td className="py-2 pr-3 font-600">{r.title || "Sin título"}</td>
                    {table.columns.map((c) => <td key={c.id} className="py-2 pr-3">{show(c, r.values[c.id], people)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.filter((r) => single || r.content).map((r) => {
          const mins = timed.length >= 2 ? minutesBetween(String(r.values[timed[0].id] ?? ""), String(r.values[timed[1].id] ?? "")) : null;
          return (
            <section key={r.id} className="report-print-page">
              {single && <Brand />}
              <p className={`${single ? "mt-10" : ""} text-xs font-mono uppercase tracking-widest text-[#6b7280]`}>{spaceName} · {table.name}</p>
              <h1 className="text-3xl font-700 mt-1 leading-tight">{r.title || "Sin título"}</h1>
              <dl className="mt-4 grid grid-cols-[170px_1fr] gap-y-1 text-sm">
                {table.columns.map((c) => {
                  const v = show(c, r.values[c.id], people);
                  return v ? (
                    <Fragment key={c.id}>
                      <dt className="text-[#6b7280]">{c.name}</dt>
                      <dd>{v}</dd>
                    </Fragment>
                  ) : null;
                })}
                {mins !== null && mins >= 0 && (<><dt className="text-[#6b7280]">Duración</dt><dd>{fmtDuration(mins)}</dd></>)}
              </dl>
              {r.content && (
                <div className="mt-6 pt-4 border-t border-[#dde0e5]">
                  <RichEditor initialContent={r.content} editable={false} />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-800 tracking-[0.12em]">EPIKOM</span>
        <span className="text-[10px] font-mono tracking-[0.16em] text-[#6b7280]">INTERACTIVE</span>
      </div>
      <span className="text-[10px] font-mono text-[#6b7280]">
        {new Date().toLocaleDateString("es-PR", { day: "numeric", month: "long", year: "numeric" })}
      </span>
    </div>
  );
}
