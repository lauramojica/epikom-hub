import "server-only";
import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { reportExtensions } from "./extensions";
import type { ReportColumn, CellValue } from "./types";
import { formatCell, minutesBetween, fmtDuration } from "./utils";

/**
 * Reporte → HTML para correo. Los clientes de correo ignoran casi todo el CSS
 * de <style>, así que los estilos van en línea en cada etiqueta.
 */

export interface EmailRow {
  id: string;
  title: string;
  values: Record<string, CellValue>;
  content: JSONContent | null;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

const C = {
  ink: "#101114", muted: "#6b7280", line: "#dde0e5", soft: "#f4f5f7", primary: "#1e9a80",
};

const TAG_STYLES: Record<string, string> = {
  p: "margin:0 0 10px;line-height:1.6;font-size:15px;color:" + C.ink,
  h1: "margin:22px 0 10px;font-size:22px;line-height:1.3;color:" + C.ink,
  h2: "margin:20px 0 8px;font-size:19px;line-height:1.3;color:" + C.ink,
  h3: "margin:18px 0 6px;font-size:16px;color:" + C.ink,
  ul: "margin:0 0 10px;padding-left:24px",
  ol: "margin:0 0 10px;padding-left:24px",
  li: "margin:0 0 4px;font-size:15px;line-height:1.5;color:" + C.ink,
  blockquote: `margin:0 0 10px;padding-left:12px;border-left:3px solid ${C.line};color:${C.muted}`,
  pre: `margin:0 0 10px;padding:10px 12px;background:${C.soft};border:1px solid ${C.line};border-radius:6px;font-family:Consolas,Menlo,monospace;font-size:13px;white-space:pre-wrap;word-break:break-all`,
  code: `font-family:Consolas,Menlo,monospace;font-size:13px;background:${C.soft};padding:1px 4px;border-radius:3px`,
  a: `color:${C.primary};text-decoration:underline`,
  hr: `border:none;border-top:1px solid ${C.line};margin:18px 0`,
  table: "border-collapse:collapse;width:100%;margin:0 0 12px;font-size:14px",
  th: `border:1px solid ${C.line};background:${C.soft};padding:6px 8px;text-align:left;vertical-align:top;font-weight:700`,
  td: `border:1px solid ${C.line};padding:6px 8px;text-align:left;vertical-align:top`,
  img: `max-width:100%;height:auto;border:1px solid ${C.line};border-radius:6px;display:block;margin:6px 0`,
};

/** Agrega el estilo en línea a cada etiqueta conocida (conservando el que ya tenga) */
function inlineStyles(html: string): string {
  return html.replace(/<(p|h1|h2|h3|ul|ol|li|blockquote|pre|code|a|hr|table|th|td|img)(\s[^>]*?)?(\/?)>/g,
    (_m, tag: string, attrs = "", selfClose: string) => {
      const base = TAG_STYLES[tag];
      if (/\sstyle="/.test(attrs)) attrs = attrs.replace(/\sstyle="([^"]*)"/, (_s: string, prev: string) => ` style="${base};${prev}"`);
      else attrs += ` style="${base}"`;
      return `<${tag}${attrs}${selfClose}>`;
    });
}

/** Las casillas (<input>) no se ven en el correo: se cambian por ☑ / ☐ */
function emailChecklists(html: string): string {
  return html
    .replace(/<ul data-type="taskList"[^>]*>/g, '<ul data-type="taskList" style="list-style:none;padding-left:4px;margin:0 0 10px">')
    .replace(/<li data-checked="(true|false)"[^>]*>\s*<label>[\s\S]*?<\/label>\s*<div>/g, (_m, checked: string) =>
      checked === "true"
        ? `<li style="list-style:none;margin:0 0 4px"><span style="color:${C.primary}">☑</span> <div style="display:inline;color:${C.muted};text-decoration:line-through">`
        : `<li style="list-style:none;margin:0 0 4px"><span>☐</span> <div style="display:inline">`)
    // Dentro de un ítem del checklist el párrafo va en la misma línea que la casilla
    .replace(/(<div style="display:inline[^"]*">)\s*<p>/g, '$1<p style="display:inline;margin:0">');
}

/** Contenido del reporte como HTML para correo; las imágenes quedan con su src original */
export function contentHtml(content: JSONContent | null): string {
  if (!content) return "";
  let html = generateHTML(content, reportExtensions());
  html = html.replace(/<colgroup>[\s\S]*?<\/colgroup>/g, "");   // anchos en px: en el celular desbordan
  html = emailChecklists(html);
  return inlineStyles(html);
}

/** Bloque de un reporte: título, propiedades y contenido */
export function rowHtml(row: EmailRow, columns: ReportColumn[], people: Record<string, string>): string {
  const props = columns
    .map((c) => [c.name, formatCell(c, row.values[c.id], people)] as const)
    .filter(([, v]) => v);
  const timed = columns.filter((c) => c.type === "date" && c.withTime);
  const mins = timed.length >= 2
    ? minutesBetween(String(row.values[timed[0].id] ?? ""), String(row.values[timed[1].id] ?? ""))
    : null;
  if (mins !== null && mins >= 0) props.push(["Duración", fmtDuration(mins)]);

  const propsHtml = props.length
    ? `<table role="presentation" style="border-collapse:collapse;margin:0 0 16px;font-size:14px">${props.map(([k, v]) =>
        `<tr><td style="padding:2px 16px 2px 0;color:${C.muted};white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td>`
        + `<td style="padding:2px 0;color:${C.ink}">${escapeHtml(v)}</td></tr>`).join("")}</table>`
    : "";

  return `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:${C.ink}">${escapeHtml(row.title || "Sin título")}</h1>`
    + propsHtml
    + (row.content ? `<div style="border-top:1px solid ${C.line};padding-top:14px">${contentHtml(row.content)}</div>` : "");
}

/** Correo completo con la marca Epikom */
export function emailLayout(opts: {
  heading: string; senderName: string; message: string; body: string; hubUrl: string;
}): string {
  const message = opts.message.trim()
    ? `<div style="margin:0 0 22px;padding:14px 16px;background:${C.soft};border-radius:10px;font-size:15px;line-height:1.6;color:${C.ink}">`
      + escapeHtml(opts.message.trim()).replace(/\n/g, "<br>") + "</div>"
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eceef1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceef1;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${C.line}">
<tr><td style="background:#0a0a0d;padding:18px 28px">
  <span style="color:#dbfa45;font-size:18px;font-weight:800;letter-spacing:0.12em">EPIKOM</span>
  <span style="color:#8b93a1;font-size:10px;letter-spacing:0.16em;margin-left:8px">REPORTES</span>
</td></tr>
<tr><td style="padding:26px 28px">
  <p style="margin:0 0 4px;font-size:12px;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em">${escapeHtml(opts.heading)}</p>
  <p style="margin:0 0 20px;font-size:14px;color:${C.muted}">Enviado por <strong style="color:${C.ink}">${escapeHtml(opts.senderName)}</strong></p>
  ${message}
  ${opts.body}
  <div style="margin-top:26px">
    <a href="${escapeHtml(opts.hubUrl)}" style="display:inline-block;background:${C.primary};color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600">Abrir en el Hub →</a>
  </div>
</td></tr>
<tr><td style="padding:14px 28px;border-top:1px solid #eceef1">
  <p style="margin:0;font-size:11px;color:#8b93a1">Epikom Interactive · Hub interno</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

/** Versión en texto plano (para clientes sin HTML y filtros de spam) */
export function plainText(rows: EmailRow[], columns: ReportColumn[], people: Record<string, string>, message: string, hubUrl: string): string {
  const parts: string[] = [];
  if (message.trim()) parts.push(message.trim(), "");
  for (const r of rows) {
    parts.push(r.title || "Sin título", "=".repeat(Math.min(60, (r.title || "Sin título").length)));
    for (const c of columns) {
      const v = formatCell(c, r.values[c.id], people);
      if (v) parts.push(`${c.name}: ${v}`);
    }
    if (r.content) {
      const text = contentHtml(r.content)
        .replace(/<(br|\/p|\/h[1-3]|\/li|\/tr|\/pre)[^>]*>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
        .replace(/\n{3,}/g, "\n\n");
      parts.push("", text.trim());
    }
    parts.push("", "");
  }
  parts.push(`Abrir en el Hub: ${hubUrl}`);
  return parts.join("\n");
}
