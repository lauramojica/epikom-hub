import type { User, Client, UserRole } from "../types";

interface Props {
  users: User[];
  clients: Client[];
}

const roleConfig: Record<UserRole, { label: string; desc: string; color: string; level: number }> = {
  superadmin: { label: "Super Admin", desc: "Acceso total. Gestiona equipo, clientes y configuración.", color: "#dbfa45", level: 4 },
  admin: { label: "Admin", desc: "Gestiona proyectos, calendario y ve todos los clientes.", color: "#31b498", level: 3 },
  crew: { label: "Crew", desc: "Crea y edita contenido de sus clientes asignados.", color: "#a78bfa", level: 2 },
  client: { label: "Cliente", desc: "Solo visualiza su portal y aprueba entregables.", color: "#f59e0b", level: 1 },
};

const statusColors: Record<string, string> = {
  active: "#22c55e", away: "#f59e0b", offline: "#6b6b8a",
};

const PERMISSIONS = [
  { feature: "Ver todos los clientes", superadmin: true, admin: true, crew: false, client: false },
  { feature: "Crear posts", superadmin: true, admin: true, crew: true, client: false },
  { feature: "Mover posts entre etapas", superadmin: true, admin: true, crew: true, client: false },
  { feature: "Aprobar entregables", superadmin: true, admin: true, crew: false, client: true },
  { feature: "Gestionar proyectos", superadmin: true, admin: true, crew: false, client: false },
  { feature: "Ver analítica", superadmin: true, admin: true, crew: false, client: false },
  { feature: "Gestionar roles y usuarios", superadmin: true, admin: false, crew: false, client: false },
  { feature: "Configuración de agencia", superadmin: true, admin: false, crew: false, client: false },
  { feature: "Acceso portal cliente", superadmin: true, admin: true, crew: false, client: true },
];

export default function RolesView({ users, clients }: Props) {
  const byRole: Record<UserRole, User[]> = { superadmin: [], admin: [], crew: [], client: [] };
  users.forEach((u) => byRole[u.role].push(u));

  return (
    <div className="p-8 space-y-8">
      <div>
        <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Gestión de accesos</p>
        <h1 className="font-display text-5xl font-700 tracking-tight text-ink uppercase">Roles y Permisos</h1>
      </div>

      {/* Role hierarchy */}
      <div className="grid grid-cols-4 gap-4">
        {(["superadmin","admin","crew","client"] as UserRole[]).map((role) => {
          const rc = roleConfig[role];
          const members = byRole[role];
          return (
            <div key={role} className="bg-surface border border-line rounded-xl overflow-hidden">
              <div className="p-4 border-b border-line" style={{ background: `${rc.color}08` }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: rc.color }} />
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: rc.color }}>Nivel {rc.level}</span>
                </div>
                <h3 className="font-display text-xl font-700 uppercase text-ink">{rc.label}</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">{rc.desc}</p>
              </div>
              <div className="p-3 space-y-2">
                {members.length === 0 ? (
                  <p className="text-xs text-muted/40 text-center py-2 font-mono">—</p>
                ) : (
                  members.map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface2 transition-colors">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 flex-shrink-0" style={{ background: `${u.color}20`, color: u.color }}>
                        {u.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-500 text-ink truncate">{u.name}</p>
                        <p className="text-[9px] font-mono text-muted truncate">{u.email}</p>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColors[u.status] }} title={u.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions matrix */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-mono text-[10px] text-muted uppercase tracking-widest">Matriz de permisos</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left px-5 py-3 text-[10px] font-mono text-muted uppercase tracking-widest">Funcionalidad</th>
              {(["superadmin","admin","crew","client"] as UserRole[]).map((r) => (
                <th key={r} className="text-center px-4 py-3 text-[10px] font-mono uppercase tracking-widest" style={{ color: roleConfig[r].color }}>
                  {roleConfig[r].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PERMISSIONS.map((perm) => (
              <tr key={perm.feature} className="hover:bg-surface2 transition-colors">
                <td className="px-5 py-3 text-sm text-ink">{perm.feature}</td>
                {(["superadmin","admin","crew","client"] as const).map((r) => (
                  <td key={r} className="px-4 py-3 text-center">
                    {(perm as Record<string, unknown>)[r] ? (
                      <span className="text-success text-base">✓</span>
                    ) : (
                      <span className="text-muted/30 text-base">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Client access overview */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-mono text-[10px] text-muted uppercase tracking-widest">Acceso portal por cliente</h2>
          <span className="font-mono text-[10px] text-muted">{clients.filter((c) => c.portalAccess).length} de {clients.length} con acceso</span>
        </div>
        <div className="divide-y divide-line">
          {clients.map((c) => {
            const assignedCrew = users.filter((u) => u.assignedClientIds.includes(c.id));
            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-700 flex-shrink-0" style={{ background: `${c.color}20`, color: c.color }}>
                  {c.initials}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-500 text-ink">{c.company}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {assignedCrew.map((u) => (
                      <span key={u.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${u.color}15`, color: u.color }}>{u.name.split(" ")[0]}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.notifyEmail && <span className="text-[9px] font-mono text-muted border border-line px-2 py-0.5 rounded">Email ✓</span>}
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded border ${c.portalAccess ? "text-primary border-primary/30 bg-primary/5" : "text-muted border-line"}`}>
                    Portal {c.portalAccess ? "✓" : "✕"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
