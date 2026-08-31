"use client";
import { useState } from "react";
import type { User, Client } from "../types";
import { usePermissions, PERMISSION_GROUPS, SCOPES, type HubRole } from "../usePermissions";
import Avatar from "../components/Avatar";

interface Props {
  users: User[];
  clients: Client[];
  authUserId: string;
  onToggleAssignment?: (userId: string, clientId: string, assigned: boolean) => void;
  onChangeRole?: (userId: string, roleKey: string) => void;
  onToast?: (m: string, k?: "success" | "error" | "info") => void;
  onRefresh?: () => void;
}

const inputCls = "w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50";

export default function RolesView({ users, clients, authUserId, onToggleAssignment, onChangeRole, onToast, onRefresh }: Props) {
  const p = usePermissions(authUserId);
  const [tab, setTab] = useState<"equipo" | "roles" | "accesos">("equipo");
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [assignBy, setAssignBy] = useState<"person" | "client">("person");
  const [showNewRole, setShowNewRole] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const canManageRoles = p.can("roles.manage");
  const canAssign = p.can("crew.assign");

  if (p.loading) {
    return <div className="p-4 md:p-8"><div className="h-32 rounded-xl skeleton-base" /></div>;
  }

  const crewMembers = users.filter((u) => {
    const r = p.roles.find((x) => x.key === u.role);
    return r?.scope !== "own_client";
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Quién puede hacer qué</p>
        <h1 className="font-display text-3xl md:text-5xl font-700 tracking-tight text-ink uppercase">Roles y accesos</h1>
      </div>

      <div className="flex gap-1 bg-surface border border-line rounded-xl p-1 w-fit overflow-x-auto">
        {([["equipo", "Equipo"], ["roles", "Roles"], ["accesos", "Accesos"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wide transition-all whitespace-nowrap ${
              tab === k ? "bg-primary text-bg font-600" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── EQUIPO ── */}
      {tab === "equipo" && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs text-muted max-w-lg leading-relaxed">
              Todas las personas con acceso al Hub y el rol que tienen asignado.
            </p>
            {(canManageRoles || canAssign) && (
              <button onClick={() => setShowInvite(true)} className="text-xs font-mono px-4 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90 whitespace-nowrap">
                + Invitar persona
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {p.roles.map((role) => {
              const members = users.filter((u) => u.role === role.key);
              return (
                <div key={role.id} className="bg-surface border border-line rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-line flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: role.color }} />
                    <span className="text-sm font-600 text-ink">{role.label}</span>
                    <span className="font-mono text-[10px] text-muted ml-auto">{members.length}</span>
                  </div>
                  <div className="divide-y divide-line">
                    {members.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-muted">Nadie con este rol.</p>
                    ) : members.map((u) => (
                      <div key={u.id} className="flex items-center gap-2.5 px-4 py-2.5">
                        <Avatar initials={u.initials} color={u.color} size="xs" src={u.avatarUrl} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink truncate">{u.name}</p>
                          <p className="font-mono text-[9px] text-muted truncate">{u.email}</p>
                        </div>
                        {canManageRoles && u.id !== authUserId && (
                          <select
                            value={u.role}
                            onChange={(e) => onChangeRole?.(u.id, e.target.value)}
                            className="text-[9px] font-mono bg-surface2 border border-line rounded px-1.5 py-1 text-muted outline-none cursor-pointer"
                          >
                            {p.roles.map((r) => (
                              <option key={r.key} value={r.key} className="bg-surface">{r.label}</option>
                            ))}
                          </select>
                        )}
                        {u.id === authUserId && (
                          <span className="text-[9px] font-mono text-primary">tú</span>
                        )}
                        {canManageRoles && u.id !== authUserId && (
                          <button
                            onClick={async () => {
                              if (!confirm(`¿Eliminar a ${u.name} del Hub? Perderá el acceso.`)) return;
                              const res = await fetch("/api/team/invite", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId: u.id }),
                              });
                              const j = await res.json();
                              if (res.ok) { onToast?.("✓ Persona eliminada.", "success"); onRefresh?.(); }
                              else onToast?.(j.error ?? "✕ No se pudo eliminar.", "error");
                            }}
                            className="text-muted hover:text-danger text-xs px-1 transition-colors"
                            title="Eliminar del Hub"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ROLES ── */}
      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs text-muted max-w-lg leading-relaxed">
              Cada rol define qué puede hacer una persona y qué clientes ve.
              Los cambios aplican de inmediato a todos los que tengan ese rol.
            </p>
            {canManageRoles && (
              <button onClick={() => setShowNewRole(true)} className="text-xs font-mono px-4 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90 whitespace-nowrap">
                + Rol
              </button>
            )}
          </div>

          {!canManageRoles && (
            <p className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
              Solo quien tenga el permiso de gestionar roles puede editarlos.
            </p>
          )}

          <div className="space-y-2">
            {p.roles.map((role) => {
              const isOpen = expandedRole === role.id;
              const count = users.filter((u) => u.role === role.key).length;
              const activePerms = Object.values(role.permissions ?? {}).filter(Boolean).length;
              const scopeInfo = SCOPES.find((s) => s.key === role.scope);

              return (
                <div key={role.id} className="bg-surface border border-line rounded-xl overflow-hidden">
                  <div
                    className={`flex items-center gap-3 px-4 py-3 ${canManageRoles ? "cursor-pointer hover:bg-surface2/40" : ""} transition-colors`}
                    onClick={() => canManageRoles && setExpandedRole(isOpen ? null : role.id)}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: role.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-600 text-ink">{role.label}</p>
                        {role.is_system && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-line text-muted">base</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted truncate">{role.description || scopeInfo?.hint}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-line text-muted">
                        {scopeInfo?.label}
                      </span>
                      <span className="text-[10px] font-mono text-muted">{activePerms} permisos</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted whitespace-nowrap">
                      {count} {count === 1 ? "persona" : "personas"}
                    </span>
                    {canManageRoles && <span className="text-[10px] text-muted">{isOpen ? "▲" : "▼"}</span>}
                  </div>

                  {isOpen && canManageRoles && (
                    <div className="px-4 pb-4 pt-1 bg-surface2/30 space-y-4">
                      {/* Datos del rol */}
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Nombre</label>
                          <input
                            value={role.label}
                            onChange={(e) => p.updateRole(role.id, { label: e.target.value })}
                            onBlur={() => onToast?.("✓ Guardado.", "success")}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Descripción</label>
                          <input
                            value={role.description}
                            onChange={(e) => p.updateRole(role.id, { description: e.target.value })}
                            onBlur={() => onToast?.("✓ Guardado.", "success")}
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* Alcance */}
                      <div>
                        <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">
                          Qué clientes ve
                        </label>
                        <div className="grid sm:grid-cols-3 gap-2">
                          {SCOPES.map((s) => (
                            <button
                              key={s.key}
                              onClick={() => p.updateRole(role.id, { scope: s.key }).then(() => onToast?.("✓ Alcance actualizado.", "success"))}
                              disabled={role.is_system}
                              className={`px-3 py-2 rounded-lg border text-left transition-all disabled:opacity-50 ${
                                role.scope === s.key ? "border-primary/50 bg-primary/5" : "border-line hover:border-muted"
                              }`}
                            >
                              <p className="text-xs font-500 text-ink">{s.label}</p>
                              <p className="text-[10px] text-muted leading-tight mt-0.5">{s.hint}</p>
                            </button>
                          ))}
                        </div>
                        {role.is_system && (
                          <p className="text-[10px] text-muted mt-1.5">El alcance de los roles base no se puede cambiar.</p>
                        )}
                      </div>

                      {/* Permisos */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-mono text-muted uppercase tracking-widest">Permisos</p>
                        {PERMISSION_GROUPS.map((g) => (
                          <div key={g.group}>
                            <p className="text-[11px] font-500 text-ink mb-1.5">{g.group}</p>
                            <div className="grid sm:grid-cols-2 gap-1.5">
                              {g.items.map((item) => {
                                const on = role.permissions?.[item.key] === true;
                                const locked = role.key === "superadmin";
                                return (
                                  <label
                                    key={item.key}
                                    className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                                      locked ? "border-line opacity-50" : "cursor-pointer"
                                    } ${on && !locked ? "border-primary/40 bg-primary/5" : "border-line hover:border-muted"}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      disabled={locked}
                                      onChange={(e) => p.togglePermission(role.id, item.key, e.target.checked)}
                                      className="accent-[#31b498] mt-0.5"
                                    />
                                    <span className="flex-1 min-w-0">
                                      <span className={on ? "text-ink" : "text-muted"}>{item.label}</span>
                                      {item.hint && (
                                        <span className="block text-[9px] text-warning/80 mt-0.5">{item.hint}</span>
                                      )}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {role.key === "superadmin" && (
                          <p className="text-[10px] text-muted">
                            El superadmin siempre tiene todos los permisos. No se puede limitar.
                          </p>
                        )}
                      </div>

                      {!role.is_system && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar el rol "${role.label}"?`)) {
                              p.deleteRole(role.id)
                                .then(() => onToast?.("✓ Rol eliminado.", "success"))
                                .catch((e) => onToast?.(e.message ?? "✕ No se pudo eliminar.", "error"));
                            }
                          }}
                          className="text-[11px] font-mono text-danger hover:opacity-80"
                        >
                          Eliminar rol
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ACCESOS ── */}
      {tab === "accesos" && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p className="text-xs text-muted max-w-lg leading-relaxed">
              Quién trabaja con cada cuenta. Los roles con alcance
              <span className="text-ink"> Todas las cuentas</span> las ven todas automáticamente.
            </p>
            <div className="flex gap-1 bg-surface border border-line rounded-lg p-0.5">
              {([["person", "Por persona"], ["client", "Por cuenta"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setAssignBy(k)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-mono uppercase transition-all whitespace-nowrap ${
                    assignBy === k ? "bg-primary text-bg font-600" : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Por persona */}
          {assignBy === "person" && (
            <div className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
              {crewMembers.map((u) => {
                const role = p.roles.find((r) => r.key === u.role);
                const seesAll = role?.scope === "all";
                const myClients = clients.filter((c) => u.assignedClientIds.includes(c.id));
                const isOpen = expandedPerson === u.id;
                return (
                  <div key={u.id}>
                    <div
                      className={`flex items-center gap-3 px-5 py-3 ${canAssign && !seesAll ? "cursor-pointer hover:bg-surface2 transition-colors" : ""}`}
                      onClick={() => canAssign && !seesAll && setExpandedPerson(isOpen ? null : u.id)}
                    >
                      <Avatar initials={u.initials} color={u.color} size="sm" src={u.avatarUrl} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-500 text-ink">{u.name}</p>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${role?.color ?? "#8b93a1"}18`, color: role?.color ?? "#8b93a1" }}>
                            {role?.label ?? u.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {seesAll ? (
                            <span className="text-[10px] font-mono text-primary">ve todas las cuentas</span>
                          ) : myClients.length === 0 ? (
                            <span className="text-[10px] font-mono text-muted/50">sin cuentas asignadas</span>
                          ) : myClients.map((c) => (
                            <span key={c.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${c.color}15`, color: c.color }}>
                              {c.company}
                            </span>
                          ))}
                        </div>
                      </div>
                      {!seesAll && (
                        <span className="font-mono text-[10px] text-muted whitespace-nowrap">
                          {myClients.length}/{clients.length}
                        </span>
                      )}
                      {canAssign && !seesAll && <span className="text-[10px] font-mono text-muted">{isOpen ? "▲" : "▼"}</span>}
                    </div>

                    {isOpen && canAssign && !seesAll && (
                      <div className="px-5 pb-4 pt-1 bg-surface2/40">
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-[10px] font-mono text-muted uppercase tracking-widest">
                            Cuentas de {u.name.split(" ")[0]}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const allOn = myClients.length === clients.length;
                              clients.forEach((c) => {
                                const has = u.assignedClientIds.includes(c.id);
                                if (allOn && has) onToggleAssignment?.(u.id, c.id, false);
                                if (!allOn && !has) onToggleAssignment?.(u.id, c.id, true);
                              });
                            }}
                            className="text-[10px] font-mono text-primary hover:opacity-80"
                          >
                            {myClients.length === clients.length ? "quitar todas" : "asignar todas"}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {clients.map((c) => {
                            const on = u.assignedClientIds.includes(c.id);
                            return (
                              <label
                                key={c.id}
                                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  on ? "border-primary/40 bg-primary/5 text-ink" : "border-line text-muted hover:border-muted"
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={(e) => onToggleAssignment?.(u.id, c.id, e.target.checked)}
                                  className="accent-[#31b498]"
                                />
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                                <span className="truncate">{c.company}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Por cuenta */}
          {assignBy === "client" && (
            <div className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
              {clients.map((c) => {
                const assigned = crewMembers.filter((u) => u.assignedClientIds.includes(c.id));
                const isOpen = expandedClient === c.id;
                return (
                  <div key={c.id}>
                    <div
                      className={`flex items-center gap-4 px-5 py-3 ${canAssign ? "cursor-pointer hover:bg-surface2 transition-colors" : ""}`}
                      onClick={() => canAssign && setExpandedClient(isOpen ? null : c.id)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-700 flex-shrink-0" style={{ background: `${c.color}20`, color: c.color }}>
                        {c.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-500 text-ink">{c.company}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {assigned.length === 0 ? (
                            <span className="text-[10px] font-mono text-muted/50">sin crew asignado</span>
                          ) : assigned.map((u) => (
                            <span key={u.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${u.color}15`, color: u.color }}>
                              {u.name.split(" ")[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                      {canAssign && <span className="text-[10px] font-mono text-muted">{isOpen ? "▲" : "▼"}</span>}
                    </div>

                    {isOpen && canAssign && (
                      <div className="px-5 pb-4 pt-1 bg-surface2/40">
                        <div className="grid sm:grid-cols-2 gap-2">
                          {crewMembers.map((u) => {
                            const role = p.roles.find((r) => r.key === u.role);
                            const seesAll = role?.scope === "all";
                            const on = u.assignedClientIds.includes(c.id);
                            return (
                              <label
                                key={u.id}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${
                                  seesAll ? "border-line/50 opacity-50" : on ? "border-primary/40 bg-primary/5 cursor-pointer" : "border-line hover:border-muted cursor-pointer"
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={on || seesAll}
                                  disabled={seesAll}
                                  onChange={(e) => onToggleAssignment?.(u.id, c.id, e.target.checked)}
                                  className="accent-[#31b498]"
                                />
                                <Avatar initials={u.initials} color={u.color} size="xs" src={u.avatarUrl} />
                                <div className="min-w-0">
                                  <p className="text-xs font-500 text-ink truncate">{u.name}</p>
                                  {seesAll && <p className="text-[9px] font-mono text-muted">{role?.label} — ve todo</p>}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showInvite && (
        <InviteModal
          roles={p.roles}
          clients={clients}
          canCreateSuperadmin={canManageRoles}
          onDone={(msg, kind) => { onToast?.(msg, kind); setShowInvite(false); onRefresh?.(); }}
          onCancel={() => setShowInvite(false)}
        />
      )}

      {showNewRole && (
        <NewRoleModal
          onAdd={(r) => {
            p.addRole(r)
              .then(() => onToast?.("✓ Rol creado.", "success"))
              .catch((e) => onToast?.(e.message ?? "✕ No se pudo crear.", "error"));
            setShowNewRole(false);
          }}
          onCancel={() => setShowNewRole(false)}
        />
      )}
    </div>
  );
}

/* ─── Nuevo rol ───────────────────────────────────────────────────────────── */
function NewRoleModal({ onAdd, onCancel }: { onAdd: (r: Partial<HubRole>) => void; onCancel: () => void }) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#31b498");
  const [scope, setScope] = useState<HubRole["scope"]>("assigned");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    "calendar.view": true, "projects.view": true, "clients.view": true, "documents.view": true,
  });

  const toggle = (k: string, v: boolean) => setPermissions((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-lg overflow-hidden animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display text-2xl font-700 uppercase text-ink">Nuevo rol</h2>
          <button onClick={onCancel} className="text-muted hover:text-ink text-lg">✕</button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Nombre del rol *</label>
              <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej: Diseñador Senior" className={inputCls} />
            </div>
            <div className="w-10 h-10 rounded-lg border border-line relative cursor-pointer flex-shrink-0" style={{ background: color }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Descripción</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué hace esta persona" className={inputCls} />
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Qué clientes ve</label>
            <div className="space-y-1.5">
              {SCOPES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setScope(s.key)}
                  className={`w-full px-3 py-2 rounded-lg border text-left transition-all ${
                    scope === s.key ? "border-primary/50 bg-primary/5" : "border-line hover:border-muted"
                  }`}
                >
                  <p className="text-xs font-500 text-ink">{s.label}</p>
                  <p className="text-[10px] text-muted">{s.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-mono text-muted uppercase tracking-widest">Permisos</p>
            {PERMISSION_GROUPS.map((g) => (
              <div key={g.group}>
                <p className="text-[11px] font-500 text-ink mb-1.5">{g.group}</p>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {g.items.map((item) => (
                    <label key={item.key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      permissions[item.key] ? "border-primary/40 bg-primary/5 text-ink" : "border-line text-muted hover:border-muted"
                    }`}>
                      <input type="checkbox" checked={!!permissions[item.key]} onChange={(e) => toggle(item.key, e.target.checked)} className="accent-[#31b498]" />
                      <span className="truncate">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-line flex justify-end gap-3">
          <button onClick={onCancel} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink">Cancelar</button>
          <button
            onClick={() => label.trim() && onAdd({ label: label.trim(), description, color, scope, permissions })}
            className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90"
          >
            Crear rol
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Invitar persona ─────────────────────────────────────────────────────── */
function InviteModal({ roles, clients, canCreateSuperadmin, onDone, onCancel }: {
  roles: HubRole[];
  clients: Client[];
  canCreateSuperadmin: boolean;
  onDone: (msg: string, kind?: "success" | "error" | "info") => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState(roles.find((r) => r.key === "crew")?.key ?? roles[0]?.key ?? "");
  const [clientId, setClientId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRole = roles.find((r) => r.key === roleKey);
  const isExternal = selectedRole?.scope === "own_client";
  const availableRoles = canCreateSuperadmin ? roles : roles.filter((r) => r.key !== "superadmin");

  const submit = async () => {
    if (!name.trim() || !email.trim()) { setError("El nombre y el email son obligatorios."); return; }
    if (isExternal && !clientId) { setError("Un cliente externo debe estar vinculado a una cuenta."); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role: roleKey, clientId: clientId || undefined }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "No se pudo invitar."); setSending(false); return; }
      onDone(
        j.emailSent
          ? `✓ Invitación enviada a ${email.trim()}`
          : `✓ Cuenta creada. ${j.note ?? ""}`,
        "success"
      );
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display text-2xl font-700 uppercase text-ink">Invitar persona</h2>
          <button onClick={onCancel} className="text-muted hover:text-ink text-lg">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Nombre *</label>
            <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="Nombre y apellido" className={inputCls} />
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Email *</label>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="persona@epikom.com" className={inputCls} />
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Rol</label>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {availableRoles.map((r) => (
                <button
                  key={r.key}
                  onClick={() => { setRoleKey(r.key); setError(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                    roleKey === r.key ? "border-primary/50 bg-primary/5" : "border-line hover:border-muted"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-500 text-ink">{r.label}</p>
                    <p className="text-[10px] text-muted truncate">{r.description || SCOPES.find((s) => s.key === r.scope)?.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {isExternal && (
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Cuenta asignada *</label>
              <select value={clientId} onChange={(e) => { setClientId(e.target.value); setError(null); }} className={inputCls + " cursor-pointer"}>
                <option value="" className="bg-surface">Selecciona la cuenta…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-surface">{c.company}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted mt-1.5">Solo verá la información de esta cuenta.</p>
            </div>
          )}

          {error && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}

          <p className="text-[10px] text-muted leading-relaxed">
            Recibirá un email con un enlace para crear su contraseña y entrar al Hub.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-line flex justify-end gap-3">
          <button onClick={onCancel} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink">Cancelar</button>
          <button onClick={submit} disabled={sending} className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90 disabled:opacity-40">
            {sending ? "Enviando…" : "Enviar invitación"}
          </button>
        </div>
      </div>
    </div>
  );
}
