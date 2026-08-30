import { useState } from "react";
import type { User, UserStatus } from "../types";
import Avatar, { contrastColor } from "./Avatar";
import { useUpload } from "../UploadContext";

interface Props {
  user: User;
  onClose: () => void;
  onUpdate: (updates: Partial<User>) => void;
  onChangePassword?: (newPassword: string) => Promise<void> | void;
}

function generatePassword(len = 16): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  const syms = "!@#$%&*?-_";
  const all = lower + upper + nums + syms;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  // Garantiza al menos uno de cada tipo
  const chars = [pick(lower), pick(upper), pick(nums), pick(syms)];
  const bytes = new Uint32Array(len - 4);
  crypto.getRandomValues(bytes);
  bytes.forEach((b) => chars.push(all[b % all.length]));
  // Shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const statusConfig: Record<UserStatus, { label: string; color: string }> = {
  active: { label: "Activo", color: "#22c55e" },
  away: { label: "Ausente", color: "#f59e0b" },
  offline: { label: "Desconectado", color: "#6b6b8a" },
};

const PRESET_COLORS = [
  "#dbfa45","#31b498","#e040fb","#f59e0b","#22c55e",
  "#ff2d78","#a78bfa","#ef4444","#38bdf8","#fb923c",
  "#0ea5e9","#84cc16",
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin", admin: "Admin", crew: "Crew", client: "Cliente",
};

export default function UserProfilePanel({ user, onClose, onUpdate, onChangePassword }: Props) {
  const [draft, setDraft] = useState<User>({ ...user });
  const [tab, setTab] = useState<"profile" | "prefs" | "security">("profile");
  const upload = useUpload();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [savingPass, setSavingPass] = useState(false);
  const [copied, setCopied] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const upd = (k: keyof User, v: unknown) => setDraft((p) => ({ ...p, [k]: v }));
  const save = () => { onUpdate(draft); onClose(); };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !draft.skills.includes(s)) { upd("skills", [...draft.skills, s]); }
    setSkillInput("");
  };
  const removeSkill = (s: string) => upd("skills", draft.skills.filter((x) => x !== s));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(16,11,8,0.85)" }}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-line" style={{ background: `${draft.color}12` }}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar initials={draft.initials} color={draft.color} size="lg" src={draft.avatarUrl} />
              <label className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-surface border border-line flex items-center justify-center cursor-pointer hover:border-primary transition-all" title="Subir foto">
                {uploadingPhoto ? (
                  <span className="text-[8px]">…</span>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2V8M2 5H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploadingPhoto(true);
                    try {
                      if (upload) {
                        const { url } = await upload(f, "avatars");
                        upd("avatarUrl", url);
                      } else {
                        upd("avatarUrl", URL.createObjectURL(f));
                      }
                    } finally { setUploadingPhoto(false); }
                  }}
                />
              </label>
              {/* Color picker trigger */}
              <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface border border-line flex items-center justify-center cursor-pointer hover:border-muted transition-all" title="Cambiar color">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/><path d="M5 3V5L6.5 6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                <input type="color" value={draft.color} onChange={(e) => upd("color", e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-2xl font-700 uppercase text-ink leading-tight">{draft.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-line text-muted uppercase">{ROLE_LABELS[draft.role]}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusConfig[draft.status].color }} />
                  <span className="text-[10px] font-mono text-muted">{statusConfig[draft.status].label}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-muted hover:text-ink flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Color presets */}
          <div className="flex gap-1.5 mt-4 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button key={c} onClick={() => upd("color", c)} className="w-5 h-5 rounded-full border-2 transition-all flex-shrink-0" style={{ background: c, borderColor: draft.color === c ? "#fff" : "transparent" }} />
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-line">
          {(["profile", "prefs", "security"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest border-b-2 -mb-px transition-all ${tab === t ? "text-primary border-primary" : "text-muted border-transparent hover:text-ink"}`}>
              {t === "profile" ? "Perfil" : t === "prefs" ? "Preferencias" : "Seguridad"}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {tab === "profile" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Nombre completo", key: "name" as const },
                  { label: "Iniciales", key: "initials" as const },
                  { label: "Email", key: "email" as const },
                  { label: "Teléfono", key: "phone" as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">{label}</label>
                    <input value={draft[key] as string} onChange={(e) => upd(key, e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 font-body" />
                  </div>
                ))}
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-2">Estado</label>
                <div className="flex gap-2">
                  {(Object.entries(statusConfig) as [UserStatus, typeof statusConfig[UserStatus]][]).map(([k, v]) => (
                    <button key={k} onClick={() => upd("status", k)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-mono transition-all ${draft.status === k ? "border-transparent text-bg font-600" : "border-line text-muted hover:text-ink"}`} style={draft.status === k ? { background: v.color } : {}}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: draft.status === k ? contrastColor(v.color) : v.color }} />
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-2">Skills</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {draft.skills.map((s) => (
                    <span key={s} className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {s}
                      <button onClick={() => removeSkill(s)} className="text-primary/60 hover:text-primary ml-0.5">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSkill()} placeholder="Agregar skill..." className="flex-1 bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 font-body" />
                  <button onClick={addSkill} className="text-xs font-mono px-3 py-2 rounded-lg border border-line text-muted hover:text-ink">+ Add</button>
                </div>
              </div>
            </>
          )}

          {tab === "prefs" && (
            <>
              <div>
                <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-2">Días de alerta antes del deadline</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={14} value={draft.alertThresholdDays} onChange={(e) => upd("alertThresholdDays", Number(e.target.value))} className="flex-1 accent-primary h-1.5 rounded-full cursor-pointer" />
                  <span className="font-mono text-sm text-primary font-700 w-10 text-right">{draft.alertThresholdDays}d</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-[9px] text-muted">1 día</span>
                  <span className="font-mono text-[9px] text-muted">14 días</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-line">
                <div>
                  <p className="text-sm font-500 text-ink">Notificaciones por email</p>
                  <p className="text-xs text-muted">Recibir resumen diario y alertas por correo</p>
                </div>
                <button onClick={() => upd("emailNotifications", !draft.emailNotifications)} className={`relative w-11 h-6 rounded-full transition-all ${draft.emailNotifications ? "bg-primary" : "bg-surface2 border border-line"}`}>
                  <div className="absolute top-0.5 w-5 h-5 rounded-full bg-ink transition-all" style={{ left: draft.emailNotifications ? "calc(100% - 22px)" : "2px" }} />
                </button>
              </div>

              <div className="py-3 border-t border-line">
                <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-3">Información de cuenta</p>
                <div className="space-y-2 text-sm text-muted">
                  <div className="flex justify-between"><span>Rol</span><span className="text-ink font-mono">{ROLE_LABELS[draft.role]}</span></div>
                  <div className="flex justify-between"><span>Miembro desde</span><span className="text-ink font-mono">{draft.joinDate}</span></div>
                  <div className="flex justify-between"><span>Clientes asignados</span><span className="text-ink font-mono">{draft.assignedClientIds.length}</span></div>
                </div>
              </div>
            </>
          )}

          {tab === "security" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-600 text-ink mb-1">Cambiar contraseña</p>
                <p className="text-xs text-muted leading-relaxed">
                  Genera una contraseña fuerte o escribe la tuya. Mínimo 8 caracteres.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPass}
                  onChange={(e) => { setNewPass(e.target.value); setPassMsg(null); setCopied(false); }}
                  placeholder="Nueva contraseña"
                  className="flex-1 bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 font-mono placeholder:text-muted/50"
                />
                <button
                  onClick={() => { setNewPass(generatePassword()); setPassMsg(null); setCopied(false); }}
                  className="text-xs font-mono px-3 py-2 rounded-lg border border-line text-muted hover:text-primary hover:border-primary/40 transition-all whitespace-nowrap"
                  title="Generar contraseña segura"
                >
                  🎲 Generar
                </button>
              </div>

              {newPass && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(newPass); setCopied(true); }}
                    className="text-[10px] font-mono text-primary hover:opacity-80"
                  >
                    {copied ? "✓ Copiada" : "📋 Copiar contraseña"}
                  </button>
                  <span className="text-[10px] font-mono text-muted">·</span>
                  <span className="text-[10px] font-mono" style={{ color: newPass.length >= 12 ? "#22c55e" : newPass.length >= 8 ? "#f59e0b" : "#ef4444" }}>
                    {newPass.length >= 12 ? "Fuerte" : newPass.length >= 8 ? "Aceptable" : "Muy corta"}
                  </span>
                </div>
              )}

              {passMsg && (
                <p className={`text-xs rounded-lg px-3 py-2 border ${passMsg.startsWith("✓") ? "text-primary bg-primary/10 border-primary/20" : "text-danger bg-danger/10 border-danger/20"}`}>
                  {passMsg}
                </p>
              )}

              <button
                disabled={savingPass || newPass.length < 8 || !onChangePassword}
                onClick={async () => {
                  if (!onChangePassword) return;
                  setSavingPass(true); setPassMsg(null);
                  try {
                    await onChangePassword(newPass);
                    setPassMsg("✓ Contraseña actualizada. Guárdala en un lugar seguro.");
                    setNewPass("");
                  } catch (err) {
                    setPassMsg("✕ No se pudo cambiar la contraseña.");
                  } finally { setSavingPass(false); }
                }}
                className="w-full text-xs font-mono py-2.5 rounded-lg bg-primary text-bg font-600 hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {savingPass ? "Guardando…" : "Actualizar contraseña"}
              </button>

              <div className="pt-2 border-t border-line">
                <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Sesión</p>
                <p className="text-xs text-muted leading-relaxed">
                  Cuenta: <span className="text-ink font-mono">{user.email}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-line bg-surface2">
          <button onClick={onClose} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink">Cancelar</button>
          <button onClick={save} className="text-xs font-mono px-6 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90">Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}
