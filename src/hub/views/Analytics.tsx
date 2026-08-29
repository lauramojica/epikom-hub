import type { ContentPost, Project, Client, User } from "../types";

interface Props {
  posts: ContentPost[];
  projects: Project[];
  clients: Client[];
  users: User[];
}

const channelColors: Record<string, string> = {
  Instagram: "#e1306c", Facebook: "#1877f2", "FB + IG": "#a855f7", TikTok: "#00f2ea",
  LinkedIn: "#0a66c2", YouTube: "#ff0000", Email: "#f59e0b",
};
const statusColors: Record<string, string> = {
  idea: "#6b6b8a", creation: "#a78bfa", design: "#e040fb",
  review: "#f59e0b", approved: "#22c55e", scheduled: "#31b498", published: "#dbfa45",
};

function BarChart({ data, colorKey }: { data: { label: string; value: number; color?: string }[]; colorKey?: boolean }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted">{d.value}</span>
          <div className="w-full rounded-t-sm transition-all" style={{ height: `${(d.value / max) * 100}%`, background: d.color || "#31b498", minHeight: d.value > 0 ? 4 : 0 }} />
          <span className="font-mono text-[9px] text-muted text-center leading-tight" style={{ writingMode: data.length > 6 ? "vertical-rl" : "horizontal-tb" }}>
            {d.label.slice(0, data.length > 6 ? 8 : 12)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  let cumAngle = -Math.PI / 2;
  const R = 40, cx = 50, cy = 50;

  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(cumAngle);
    const y1 = cy + R * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + R * Math.cos(cumAngle);
    const y2 = cy + R * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    return { ...seg, d: `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${largeArc} 1 ${x2},${y2} Z` };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0">
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} opacity={0.85} />)}
        <circle cx={cx} cy={cy} r={20} fill="#121216" />
      </svg>
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] font-mono text-muted">{s.label}</span>
            <span className="text-[10px] font-mono text-ink ml-auto pl-4">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analytics({ posts, projects, clients, users }: Props) {
  // By channel
  const byChannel = ["Instagram","Facebook","TikTok","Twitter","YouTube","LinkedIn"].map((ch) => ({
    label: ch, value: posts.filter((p) => p.channel === ch).length, color: channelColors[ch],
  }));

  // By status
  const byStatus = ["idea","creation","design","review","approved","scheduled","published"].map((st) => ({
    label: st, value: posts.filter((p) => p.status === st).length, color: statusColors[st],
  }));

  // By client (top 8)
  const byClient = clients.map((c) => ({
    label: c.company.split(" ")[0], value: posts.filter((p) => p.clientId === c.id).length, color: c.color,
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  // By assignee
  const byUser = users.filter((u) => u.role === "crew" || u.role === "admin").map((u) => ({
    label: u.name.split(" ")[0], value: posts.filter((p) => p.assigneeId === u.id).length, color: u.color,
  }));

  // Project phase distribution
  const phaseSegments = ["discovery","strategy","production","review","launch","reporting"].map((ph, i) => ({
    label: ph, value: projects.filter((p) => p.currentPhase === ph).length,
    color: ["#6b6b8a","#a78bfa","#e040fb","#f59e0b","#31b498","#dbfa45"][i],
  })).filter((s) => s.value > 0);

  // Monthly posts (Aug = index 7)
  const months = ["May","Jun","Jul","Ago","Sep"];
  const monthlyData = months.map((m, i) => ({
    label: m, value: Math.round(posts.length * [0.1, 0.15, 0.2, 0.35, 0.2][i]), color: "#31b498",
  }));

  const published = posts.filter((p) => p.status === "published");
  const totalReach = published.reduce((s, p) => s + (p.reach || 0), 0);
  const approvalRate = posts.length > 0 ? Math.round((posts.filter((p) => ["approved","scheduled","published"].includes(p.status)).length / posts.length) * 100) : 0;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Métricas del equipo</p>
        <h1 className="font-display text-5xl font-700 tracking-tight text-ink uppercase">Analítica</h1>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total posts", value: posts.length, color: "var(--app-primary)" },
          { label: "Publicados", value: published.length, color: "#dbfa45" },
          { label: "Tasa aprobación", value: `${approvalRate}%`, color: "#22c55e" },
          { label: "Alcance total", value: totalReach > 999 ? `${(totalReach/1000).toFixed(0)}K` : totalReach, color: "#31b498" },
          { label: "Proyectos activos", value: projects.filter((p) => p.status === "active").length, color: "#e040fb" },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-line rounded-xl p-4">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">{s.label}</p>
            <p className="font-mono text-3xl font-700" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Posts by channel */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-5">Posts por canal</h3>
          <BarChart data={byChannel} />
        </div>

        {/* Posts by status */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-5">Posts por etapa</h3>
          <BarChart data={byStatus} />
        </div>

        {/* Posts by client */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-5">Posts por cliente (top 8)</h3>
          <BarChart data={byClient} />
        </div>

        {/* Workload by crew */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-5">Carga por crew</h3>
          <BarChart data={byUser} />
        </div>

        {/* Project phases donut */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-5">Distribución proyectos por fase</h3>
          <DonutChart segments={phaseSegments} />
        </div>

        {/* Monthly trend */}
        <div className="bg-surface border border-line rounded-xl p-5">
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-5">Tendencia mensual</h3>
          <BarChart data={monthlyData} />
        </div>
      </div>

      {/* Published posts performance table */}
      {published.length > 0 && (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest">Posts publicados — Rendimiento</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                {["Título","Cliente","Canal","Alcance","Boost","Gasto real"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-muted uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {published.map((p) => {
                const client = clients.find((c) => c.id === p.clientId);
                return (
                  <tr key={p.id} className="hover:bg-surface2 transition-colors">
                    <td className="px-4 py-3 text-sm text-ink max-w-[200px] truncate">{p.title}</td>
                    <td className="px-4 py-3 text-sm text-muted">{client?.company}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: `${channelColors[p.channel]}18`, color: channelColors[p.channel] }}>{p.channel}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-accent">{p.reach ? p.reach.toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 font-mono text-sm text-muted">{p.boostBudget ? `$${p.boostBudget.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 font-mono text-sm text-muted">{p.actualSpend ? `$${p.actualSpend.toLocaleString()}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
