import type { ReportColumn, ReportRow, CellValue } from "./types";
import { TITLE_COLUMN } from "./types";

// Las fechas se guardan como hora "de pared", sin zona horaria:
//   "2026-10-02"        (solo fecha)
//   "2026-10-02T14:20"  (fecha y hora)
// Así no hay corrimientos de un día al mostrarlas en Puerto Rico.

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const pad = (n: number) => String(n).padStart(2, "0");

export function nowLocal(withTime: boolean): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

function parts(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : null, mi: m[5] ? +m[5] : null };
}

function fmtTime(h: number, mi: number) {
  const suffix = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(mi)} ${suffix}`;
}

/** "2 oct 2026" o "2 oct 2026, 2:20 p. m." */
export function fmtDate(value: string, withTime = false): string {
  const p = parts(value);
  if (!p) return value;
  const base = `${p.d} ${MONTHS[p.mo - 1].slice(0, 3)} ${p.y}`;
  return withTime && p.h !== null ? `${base}, ${fmtTime(p.h, p.mi ?? 0)}` : base;
}

/** "Viernes 02 de octubre 2026" — el título que se usaba en Notion */
export function longDayTitle(value: string): string {
  const p = parts(value);
  if (!p) return "";
  const dow = new Date(p.y, p.mo - 1, p.d).getDay();
  const day = DAYS[dow];
  return `${day[0].toUpperCase()}${day.slice(1)} ${pad(p.d)} de ${MONTHS[p.mo - 1]} ${p.y}`;
}

export function monthKey(value: string): string {
  return value.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  const name = MONTHS[m - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
}

/** Minutos entre dos valores de fecha/hora, o null */
export function minutesBetween(a: string, b: string): number | null {
  const pa = parts(a), pb = parts(b);
  if (!pa || !pb || pa.h === null || pb.h === null) return null;
  const ta = new Date(pa.y, pa.mo - 1, pa.d, pa.h, pa.mi ?? 0).getTime();
  const tb = new Date(pb.y, pb.mo - 1, pb.d, pb.h, pb.mi ?? 0).getTime();
  return Math.round((tb - ta) / 60000);
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export function hrefFor(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function compareValues(a: CellValue | undefined, b: CellValue | undefined): number {
  const emptyA = a === null || a === undefined || a === "";
  const emptyB = b === null || b === undefined || b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { numeric: true });
}

export function sortRows(rows: ReportRow[], sortBy: string | null, desc: boolean): ReportRow[] {
  const list = [...rows];
  if (!sortBy) return list.sort((a, b) => a.position - b.position);
  list.sort((a, b) => {
    const va = sortBy === TITLE_COLUMN ? a.title : a.values[sortBy];
    const vb = sortBy === TITLE_COLUMN ? b.title : b.values[sortBy];
    const emptyA = va === null || va === undefined || va === "";
    const emptyB = vb === null || vb === undefined || vb === "";
    // Los vacíos siempre al final, sin importar la dirección
    if (emptyA !== emptyB) return emptyA ? 1 : -1;
    const c = compareValues(va, vb);
    return desc ? -c : c;
  });
  return list;
}

export interface RowGroup {
  key: string;
  label: string;
  color?: string;
  rows: ReportRow[];
}

/** Agrupa por mes (columna fecha) o por opción (columna selección) */
export function groupRows(rows: ReportRow[], column: ReportColumn | undefined, desc: boolean): RowGroup[] {
  if (!column) return [{ key: "all", label: "", rows }];

  const map = new Map<string, ReportRow[]>();
  for (const r of rows) {
    const v = r.values[column.id];
    let key = "";
    if (typeof v === "string" && v) key = column.type === "date" ? monthKey(v) : v;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const groups: RowGroup[] = [];
  if (column.type === "date") {
    const keys = [...map.keys()].filter(Boolean).sort();
    if (desc) keys.reverse();
    for (const k of keys) groups.push({ key: k, label: monthLabel(k), rows: map.get(k)! });
  } else {
    for (const opt of column.options ?? []) {
      if (map.has(opt.id)) groups.push({ key: opt.id, label: opt.label, color: opt.color, rows: map.get(opt.id)! });
    }
  }
  if (map.has("")) groups.push({ key: "", label: "Sin " + column.name.toLowerCase(), rows: map.get("")! });
  return groups;
}

/** Valor de una celda como texto, para el PDF y el correo */
export function formatCell(col: ReportColumn, v: CellValue | undefined, people: Record<string, string>): string {
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
