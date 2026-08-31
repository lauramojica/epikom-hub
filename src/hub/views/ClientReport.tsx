"use client";
import { useMemo, useState } from "react";
import type { ContentPost, Project, Client, User } from "../types";
import { todayPR } from "../adapters";
import AnimatedNumber from "../components/AnimatedNumber";

const STATUS_LABELS: Record<string, string> = {
  idea: "Idea", creation: "Creación", design: "Diseño", review: "Revisión",
  approved: "Aprobado", scheduled: "Programado", published: "Publicado",
};
const STATUS_COLORS: Record<string, string> = {
  idea: "#6b6b8a", creation: "#a78bfa", design: "#e040fb", review: "#f59e0b",
  approved: "#22c55e", scheduled: "#31b498", published: "#dbfa45",
};

function monthKey(d: string) { return d.slice(0, 7); }
function monthLabel(k: string) {
  const [y, m] = k.split("-");
  const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${MESES[Number(m) - 1]} ${y.slice(2)}`;
}

export default function ClientReport({ clients, posts, projects, users, canViewBudgets }: {
  clients: Client[]; posts: ContentPost[]; projects: Project[]; users: User[];
  canViewBudgets: boolean;
}) {
  const today = todayPR();
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "");
  const [range, setRange] = useState<"month" | "quarter" | "all">("month");

  const client = clients.find((c) => c.id === clientId);

  const from = useMemo(() => {
    if (range === "all") return "0000-01-01";
    const d = new Date(today + "T12:00:00");
    d.setMonth(d.getMonth() - (range === "month" ? 1 : 3));
    return d.toISOString().slice(0, 10);
  }, [range, today]);

  const clientPosts = useMemo(
    () => posts.filter((p) => p.clientId === clientId && (!p.scheduledDate || p.scheduledDate >= from)),
    [posts, clientId, from]
  );
  const clientProjects = useMemo(
    () => projects.filter((p) => p.clientId === clientId),
    [projects, clientId]
  );

  // Métricas
  const published = clientPosts.filter((p) => p.status === "published");
  const overdue = clientPosts.filter((p) => p.scheduledDate && p.scheduledDate < today && p.status !== "published");
  const pendingApproval = clientPosts.filter((p) => p.status === "review");

  const byStatus = Object.keys(STATUS_LABELS).map((k) => ({
    key: k,
    label: STATUS_LABELS[k],
    color: STATUS_COLORS[k],
    count: clientPosts.filter((p) => p.status === k).length,
  }));

  const byChannel = useMemo(() => {
    const m: Record<string, number> = {};
    clientPosts.forEach((p) => { m[p.channel] = (m[p.channel] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [clientPosts]);

  const byMonth = useMemo(() => {
    const m: Record<string, { total: number; published: number }> = {};
    clientPosts.forEach((p) => {
      if (!p.scheduledDate) return;
      const k = monthKey(p.scheduledDate);
      m[k] ||= { total: 0, published: 0 };
      m[k].total++;
      if (p.status === "published") m[k].published++;
    });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  }, [clientPosts]);

  const byPerson = useMemo(() => {
    const m: Record<string, number> = {};
    clientPosts.forEach((p) => { if (p.assigneeId) m[p.assigneeId] = (m[p.assigneeId] ?? 0) + 1; });
    return Object.entries(m)
      .map(([id, n]) => ({ user: users.find((u) => u.id === id), count: n }))
      .filter((x) => x.user)
      .sort((a, b) => b.count - a.count);
  }, [clientPosts, users]);

  const budget = clientPosts.reduce((s, p) => s + (p.boostBudget ?? 0), 0);
  const spend = clientPosts.reduce((s, p) => s + (p.actualSpend ?? 0), 0);
  const reach = clientPosts.reduce((s, p) => s + (p.reach ?? 0), 0);

  const completionRate = clientPosts.length > 0
    ? Math.round((published.length / clientPosts.length) * 100) : 0;

  const maxMonth = Math.max(1, ...byMonth.map(([, v]) => v.total));

  /** Exporta el reporte como CSV */
  const exportCSV = () => {
    const rows: string[][] = [
      ["Reporte de cliente", client?.company ?? ""],
      ["Periodo", range === "month" ? "Último mes" : range === "quarter" ? "Últimos 3 meses" : "Todo"],
      ["Generado", today],
      [],
      ["Métrica", "Valor"],
      ["Publicaciones totales", String(clientPosts.length)],
      ["Publicadas", String(published.length)],
      ["Atrasadas", String(overdue.length)],
      ["Pendientes de aprobación", String(pendingApproval.length)],
      ["Tasa de completado", `${completionRate}%`],
      ["Proyectos activos", String(clientProjects.filter((p) => p.status === "active").length)],
    ];
    if (canViewBudgets) {
      rows.push(["Presupuesto de pauta", `$${budget.toLocaleString()}`]);
      rows.push(["Gasto real", `$${spend.toLocaleString()}`]);
    }
    rows.push(["Alcance total", String(reach)]);
    rows.push([], ["Por estado", ""]);
    byStatus.forEach((s) => rows.push([s.label, String(s.count)]));
    rows.push([], ["Por canal", ""]);
    byChannel.forEach(([ch, n]) => rows.push([ch, String(n)]));
    rows.push([], ["Detalle de publicaciones", ""]);
    rows.push(["Título", "Fecha", "Canal", "Formato", "Estado", "Asignado"]);
    clientPosts.forEach((p) => rows.push([
      p.title, p.scheduledDate || "", p.channel, p.format,
      STATUS_LABELS[p.status] ?? p.status,
      users.find((u) => u.id === p.assigneeId)?.name ?? "",
    ]));

    const csv = rows.map((r) => r.map((v) => (v.includes(",") ? `"${v}"` : v)).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${client?.company.toLowerCase().replace(/\s+/g, "-")}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (clients.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-muted">Aún no hay cuentas registradas.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Reporte por cuenta</p>
          <h1 className="font-display text-3xl md:text-5xl font-700 tracking-tight text-ink uppercase">
            {client?.company ?? "—"}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink outline-none cursor-pointer font-mono"
          >
            {clients.map((c) => <option key={c.id} value={c.id} className="bg-surface">{c.company}</option>)}
          </select>
          <div className="flex gap-1 bg-surface border border-line rounded-lg p-0.5">
            {([["month", "1 mes"], ["quarter", "3 meses"], ["all", "Todo"]] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-mono uppercase transition-all ${
                  range === k ? "bg-primary text-bg font-600" : "text-muted hover:text-ink"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-primary hover:border-primary/40 transition-all whitespace-nowrap">
            ↓ Exportar
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Publicaciones", value: clientPosts.length, color: "var(--stat-teal)" },
          { label: "Publicadas", value: published.length, color: "var(--stat-lime)" },
          { label: "Atrasadas", value: overdue.length, color: overdue.length > 0 ? "#ef4444" : "var(--app-muted)" },
          { label: "Por aprobar", value: pendingApproval.length, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-line rounded-xl p-5">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">{s.label}</p>
            <p className="font-mono text-4xl font-700" style={{ color: s.color }}>
              <AnimatedNumber value={s.value} />
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Producción mensual */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-4">Producción mensual</p>
          {byMonth.length === 0 ? (
            <p className="text-xs text-muted">Sin datos en este periodo.</p>
          ) : (
            <div className="space-y-2.5">
              {byMonth.map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted w-14 flex-shrink-0">{monthLabel(k)}</span>
                  <div className="flex-1 h-6 bg-surface2 rounded-md overflow-hidden flex">
                    <div
                      className="h-full progress-fill flex items-center px-2"
                      style={{ width: `${(v.published / maxMonth) * 100}%`, background: "var(--stat-lime)" }}
                    >
                      {v.published > 0 && <span className="font-mono text-[9px] text-bg font-700">{v.published}</span>}
                    </div>
                    <div
                      className="h-full progress-fill"
                      style={{ width: `${((v.total - v.published) / maxMonth) * 100}%`, background: "var(--app-line)" }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-muted w-8 text-right">{v.total}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-1">
                <span className="flex items-center gap-1.5 text-[9px] font-mono text-muted">
                  <span className="w-2 h-2 rounded-sm" style={{ background: "var(--stat-lime)" }} /> publicadas
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-mono text-muted">
                  <span className="w-2 h-2 rounded-sm bg-line" /> en proceso
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Estado del pipeline */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-4">Estado del pipeline</p>
          <div className="space-y-2">
            {byStatus.filter((s) => s.count > 0).map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-ink flex-1">{s.label}</span>
                <div className="w-24 h-1.5 bg-surface2 rounded-full overflow-hidden">
                  <div className="h-full progress-fill rounded-full" style={{ width: `${(s.count / Math.max(1, clientPosts.length)) * 100}%`, background: s.color }} />
                </div>
                <span className="font-mono text-xs text-muted w-6 text-right">{s.count}</span>
              </div>
            ))}
            {byStatus.every((s) => s.count === 0) && <p className="text-xs text-muted">Sin publicaciones.</p>}
          </div>

          <div className="mt-4 pt-4 border-t border-line">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Tasa de completado</span>
              <span className="font-mono text-lg font-700" style={{ color: completionRate >= 70 ? "var(--stat-lime)" : "#f59e0b" }}>
                {completionRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Por canal */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-4">Distribución por canal</p>
          {byChannel.length === 0 ? (
            <p className="text-xs text-muted">Sin datos.</p>
          ) : (
            <div className="space-y-2">
              {byChannel.map(([ch, n]) => (
                <div key={ch} className="flex items-center gap-3">
                  <span className="text-xs text-ink flex-1">{ch}</span>
                  <div className="w-32 h-1.5 bg-surface2 rounded-full overflow-hidden">
                    <div className="h-full progress-fill rounded-full bg-primary" style={{ width: `${(n / Math.max(1, clientPosts.length)) * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs text-muted w-6 text-right">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Equipo y pauta */}
        <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Equipo en esta cuenta</p>
            {byPerson.length === 0 ? (
              <p className="text-xs text-muted">Nadie asignado todavía.</p>
            ) : (
              <div className="space-y-2">
                {byPerson.map(({ user, count }) => (
                  <div key={user!.id} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-700 flex-shrink-0" style={{ background: `${user!.color}20`, color: user!.color }}>
                      {user!.initials}
                    </div>
                    <span className="text-xs text-ink flex-1">{user!.name}</span>
                    <span className="font-mono text-xs text-muted">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canViewBudgets && (budget > 0 || spend > 0 || reach > 0) && (
            <div className="pt-4 border-t border-line">
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Pauta y alcance</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-mono text-[9px] text-muted uppercase">Presupuesto</p>
                  <p className="font-mono text-sm font-600 text-ink">${budget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-muted uppercase">Gastado</p>
                  <p className="font-mono text-sm font-600 text-ink">${spend.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-muted uppercase">Alcance</p>
                  <p className="font-mono text-sm font-600 text-accent">{reach.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {clientProjects.length > 0 && (
            <div className="pt-4 border-t border-line">
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Proyectos</p>
              <div className="space-y-1.5">
                {clientProjects.slice(0, 4).map((pr) => (
                  <div key={pr.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pr.color }} />
                    <span className="text-xs text-ink flex-1 truncate">{pr.name}</span>
                    <span className="font-mono text-[9px] text-muted">{pr.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reglas de marca, útil al preparar el reporte */}
      {client?.brandRules?.bannedWords?.length ? (
        <div className="bg-surface border border-line rounded-xl p-5">
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Recordatorio de marca</p>
          <p className="text-xs text-muted mb-2">Palabras que no se usan con este cliente:</p>
          <div className="flex flex-wrap gap-1.5">
            {client.brandRules.bannedWords.map((w) => (
              <span key={w} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">{w}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
