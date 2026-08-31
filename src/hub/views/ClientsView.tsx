import { useState, useEffect, useRef } from "react";
import type { Client, Project, ContentPost, BrandColor, BrandFont } from "../types";
import { useUpload } from "../UploadContext";
import EmailAddress from "../components/EmailAddress";

interface Props {
  clients: Client[];
  projects: Project[];
  posts: ContentPost[];
  onUpdateClient?: (id: string, updates: Partial<Client>) => void;
  onAddClient?: (c: Partial<Client>) => void;
  onDeleteClient?: (id: string) => void;
  interactions?: Record<string, import("../types").ClientInteraction[]>;
  services?: { id: string; name: string; color: string; enables_content_calendar: boolean }[];
  clientServices?: Record<string, string[]>;
  onToggleService?: (clientId: string, serviceId: string, on: boolean) => void;
  canEdit?: boolean;
}

const interactionIcons: Record<string, string> = {
  call: "📞", email: "✉️", meeting: "🤝", task: "✅",
};

function ColorSwatch({ color, onUpdate, onRemove }: { color: BrandColor; onUpdate: (c: BrandColor) => void; onRemove: () => void }) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [label, setLabel] = useState(color.label);
  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative">
        <div className="w-16 h-16 rounded-xl border-2 border-line shadow-sm overflow-hidden cursor-pointer" style={{ background: color.hex }}>
          <input type="color" value={color.hex} onChange={(e) => onUpdate({ ...color, hex: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" title="Cambiar color" />
        </div>
        <button onClick={onRemove} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-danger rounded-full text-ink text-[9px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">×</button>
      </div>
      <p className="font-mono text-[10px] text-muted">{color.hex.toUpperCase()}</p>
      {editingLabel ? (
        <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => { onUpdate({ ...color, label }); setEditingLabel(false); }} onKeyDown={(e) => e.key === "Enter" && (onUpdate({ ...color, label }), setEditingLabel(false))} className="w-20 text-center text-[10px] bg-surface2 border border-primary/40 rounded px-1 py-0.5 text-ink outline-none" />
      ) : (
        <button onClick={() => setEditingLabel(true)} className="text-[10px] text-muted hover:text-ink max-w-[72px] truncate text-center">{color.label}</button>
      )}
    </div>
  );
}

function BrandTab({ client, onUpdate, logoRef, canEdit = true, upload }: {
  client: Client; onUpdate: (u: Partial<Client>) => void;
  logoRef: React.RefObject<HTMLInputElement | null>;
  canEdit?: boolean;
  upload?: ((f: File, folder?: string) => Promise<{ url: string }>) | null;
}) {
  const [rules, setRules] = useState(client.brandRules);
  useEffect(() => { setRules(client.brandRules); }, [client.id]);
  const dirty = JSON.stringify(rules) !== JSON.stringify(client.brandRules);

  const updColors = (colors: BrandColor[]) => setRules((r) => ({ ...r, colors }));
  const updFonts = (fonts: BrandFont[]) => setRules((r) => ({ ...r, fonts }));
  const addColor = () => updColors([...rules.colors, { label: "Nuevo color", hex: "#888888" }]);
  const removeColor = (i: number) => updColors(rules.colors.filter((_, j) => j !== i));
  const updateColor = (i: number, c: BrandColor) => updColors(rules.colors.map((x, j) => j === i ? c : x));
  const addFont = () => updFonts([...(rules.fonts || []), { name: "Nombre tipografía", weight: "Regular 400", usage: "Uso" }]);
  const removeFont = (i: number) => updFonts((rules.fonts || []).filter((_, j) => j !== i));
  const updateFont = (i: number, f: BrandFont) => updFonts((rules.fonts || []).map((x, j) => j === i ? f : x));

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let url = URL.createObjectURL(file);
    if (upload) {
      try { url = (await upload(file, "marcas")).url; } catch { /* usa el preview local */ }
    }
    setRules((r) => ({ ...r, logoUrl: url }));
  };

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest">Logo de marca</h3>
          <button onClick={() => logoRef.current?.click()} className="text-[10px] font-mono text-primary hover:underline">
            {rules.logoUrl ? "Cambiar logo" : "Subir logo"}
          </button>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
        </div>
        {rules.logoUrl ? (
          <div className="relative w-full h-32 bg-surface2 border border-line rounded-xl overflow-hidden flex items-center justify-center group">
            <img src={rules.logoUrl} alt="Logo" className="max-h-28 max-w-full object-contain" />
            <button onClick={() => setRules((r) => ({ ...r, logoUrl: undefined }))} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 bg-danger rounded-full text-ink text-xs flex items-center justify-center transition-all">×</button>
          </div>
        ) : (
          <button onClick={() => logoRef.current?.click()} className="w-full h-24 bg-surface2 border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center gap-1 hover:border-muted transition-all">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 14L7 10L10 13L13 8L17 14H4Z" stroke="#8b93a1" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="7.5" cy="6.5" r="1.5" stroke="#8b93a1" strokeWidth="1.5"/><rect x="2" y="2" width="16" height="16" rx="2" stroke="#8b93a1" strokeWidth="1.5"/></svg>
            <span className="text-xs text-muted">Arrastra o clic para subir</span>
          </button>
        )}
      </div>

      {/* Colors */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest">Paleta de colores</h3>
          <button onClick={addColor} className="text-[10px] font-mono text-primary hover:underline">+ Agregar color</button>
        </div>
        <div className="flex flex-wrap gap-6">
          {(rules.colors || []).map((c, i) => (
            <ColorSwatch key={i} color={c} onUpdate={(nc) => updateColor(i, nc)} onRemove={() => removeColor(i)} />
          ))}
          {(rules.colors || []).length === 0 && (
            <button onClick={addColor} className="w-16 h-16 rounded-xl border-2 border-dashed border-line flex items-center justify-center text-muted hover:border-muted text-xl">+</button>
          )}
        </div>
        {/* Palette preview bar */}
        {(rules.colors || []).length > 0 && (
          <div className="mt-4 flex rounded-xl overflow-hidden h-4">
            {(rules.colors || []).map((c, i) => <div key={i} className="flex-1" style={{ background: c.hex }} title={c.label} />)}
          </div>
        )}
      </div>

      {/* Fonts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest">Tipografías</h3>
          <button onClick={addFont} className="text-[10px] font-mono text-primary hover:underline">+ Agregar fuente</button>
        </div>
        <div className="space-y-3">
          {(rules.fonts || []).map((f, i) => (
            <div key={i} className="bg-surface2 border border-line rounded-xl p-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[9px] font-mono text-muted uppercase tracking-widest mb-1">Familia</p>
                    <input value={f.name} onChange={(e) => updateFont(i, { ...f, name: e.target.value })} className="w-full bg-surface border border-line rounded-lg px-2 py-1.5 text-sm text-ink outline-none focus:border-primary/40 font-body" style={{ fontFamily: f.name }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-muted uppercase tracking-widest mb-1">Peso</p>
                    <input value={f.weight} onChange={(e) => updateFont(i, { ...f, weight: e.target.value })} className="w-full bg-surface border border-line rounded-lg px-2 py-1.5 text-sm text-ink font-mono outline-none focus:border-primary/40" />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-muted uppercase tracking-widest mb-1">Uso</p>
                    <input value={f.usage} onChange={(e) => updateFont(i, { ...f, usage: e.target.value })} className="w-full bg-surface border border-line rounded-lg px-2 py-1.5 text-sm text-ink outline-none focus:border-primary/40" />
                  </div>
                </div>
                <button onClick={() => removeFont(i)} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all mt-5 flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-line">
                <p className="text-2xl text-ink leading-tight truncate" style={{ fontFamily: f.name }}>Aa Bb Cc — {f.name}</p>
                <p className="text-xs text-muted mt-0.5" style={{ fontFamily: f.name }}>The quick brown fox jumps over the lazy dog</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tone + Guidelines + Banned words */}
      <div>
        <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Tono de comunicación</h3>
        <textarea value={rules.tone} onChange={(e) => setRules((r) => ({ ...r, tone: e.target.value }))} rows={2} className="w-full bg-surface2 border border-line rounded-lg px-4 py-3 text-sm text-ink outline-none focus:border-primary/40 resize-none" />
      </div>
      <div>
        <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Lineamientos</h3>
        <textarea value={rules.guidelines} onChange={(e) => setRules((r) => ({ ...r, guidelines: e.target.value }))} rows={3} className="w-full bg-surface2 border border-line rounded-lg px-4 py-3 text-sm text-ink outline-none focus:border-primary/40 resize-none leading-relaxed" />
      </div>
      <div>
        <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Palabras prohibidas</h3>
        <input value={rules.bannedWords.join(", ")} onChange={(e) => setRules((r) => ({ ...r, bannedWords: e.target.value.split(",").map((w) => w.trim()).filter(Boolean) }))} placeholder="Separar con comas..." className="w-full bg-surface2 border border-line rounded-lg px-4 py-3 text-sm text-ink outline-none focus:border-primary/40 font-mono" />
        <div className="flex flex-wrap gap-2 mt-2">
          {rules.bannedWords.map((w) => <span key={w} className="text-xs font-mono px-3 py-1 rounded-full bg-danger/10 text-danger border border-danger/20">{w}</span>)}
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line sticky bottom-0 bg-surface">
          {dirty && <span className="text-[10px] font-mono text-warning">Cambios sin guardar</span>}
          {dirty && (
            <button onClick={() => setRules(client.brandRules)} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink">
              Descartar
            </button>
          )}
          <button
            onClick={() => onUpdate({ brandRules: rules })}
            disabled={!dirty}
            className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90 disabled:opacity-30 transition-opacity"
          >
            Guardar cambios
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClientsView({ clients, projects, posts, onUpdateClient, onAddClient, onDeleteClient, interactions = {}, services = [], clientServices = {}, onToggleService, canEdit = true }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"profile" | "edit" | "brand" | "crm">("profile");
  const upload = useUpload();
  const logoRef = useRef<HTMLInputElement>(null);

  const filtered = clients.filter((c) =>
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const client = clients.find((c) => c.id === selected);
  const clientProjects = client ? projects.filter((p) => p.clientId === client.id) : [];
  const clientPosts = client ? posts.filter((p) => p.clientId === client.id) : [];
  const publishedPosts = clientPosts.filter((p) => p.status === "published");

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">CRM — Cartera</p>
          <h1 className="font-display text-3xl md:text-5xl font-700 tracking-tight text-ink uppercase">Cuentas</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cuenta..." className="bg-surface border border-line rounded-lg pl-9 pr-4 py-2 text-sm text-ink outline-none focus:border-primary/40 w-52 font-body" />
          </div>
          {onAddClient && (
            <button onClick={() => setShowNewClient(true)} className="text-xs font-mono px-4 py-2.5 rounded-lg bg-primary text-bg font-600 hover:opacity-90 transition-opacity flex-shrink-0">
              + Nueva cuenta
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total clientes", value: clients.length, color: "#f2f3f6" },
          { label: "Con portal", value: clients.filter((c) => c.portalAccess).length, color: "#31b498" },
          { label: "Posts publicados", value: posts.filter((p) => p.status === "published").length, color: "#dbfa45" },
          { label: "Proyectos activos", value: projects.filter((p) => p.status === "active").length, color: "#e040fb" },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-line rounded-xl p-4">
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">{s.label}</p>
            <p className="font-mono text-4xl font-700" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Client list */}
        <div className="w-72 flex-shrink-0 space-y-2">
          {filtered.map((c) => {
            const proj = projects.filter((p) => p.clientId === c.id);
            const pub = posts.filter((p) => p.clientId === c.id && p.status === "published").length;
            const isSelected = selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { setSelected(isSelected ? null : c.id); setTab("profile"); }}
                className={`w-full text-left bg-surface border rounded-xl p-4 transition-all ${isSelected ? "border-primary/40 bg-primary/5" : "border-line hover:border-muted"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-700 flex-shrink-0" style={{ background: `${c.color}20`, color: c.color }}>
                    {c.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-600 text-ink truncate">{c.company}</p>
                    <p className="text-xs text-muted truncate">{c.industry}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] font-mono text-muted">{proj.length} proy.</span>
                  <span className="text-[10px] font-mono text-muted">{pub} pub.</span>
                  {c.portalAccess && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">Portal</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {client ? (
          <div className="flex-1 bg-surface border border-line rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-line" style={{ background: `${client.color}08` }}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-700 flex-shrink-0" style={{ background: `${client.color}25`, color: client.color }}>
                  {client.initials}
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-3xl font-700 uppercase text-ink">{client.company}</h2>
                  <p className="text-sm text-muted mb-2">{client.industry} · {client.language} · {client.timezone}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted">
                    <span>📧 {client.email}</span>
                    <span>📞 {client.phone}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {client.portalAccess && <span className="text-[10px] font-mono px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">Portal ✓</span>}
                  {client.notifyEmail && <span className="text-[10px] font-mono px-2 py-1 rounded bg-muted/10 text-muted border border-line">Email ✓</span>}
                </div>
              </div>

              {/* Mini stats */}
              <div className="flex gap-4 mt-4">
                {[
                  { label: "Proyectos", value: clientProjects.length },
                  { label: "Posts totales", value: clientPosts.length },
                  { label: "Publicados", value: publishedPosts.length },
                  { label: "Contactos", value: client.contacts.length },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-mono text-2xl font-700 text-ink">{s.value}</p>
                    <p className="font-mono text-[9px] text-muted uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-line">
              {(["profile", "edit", "brand", "crm"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-5 py-3 text-xs font-mono uppercase tracking-widest transition-all border-b-2 -mb-px ${tab === t ? "text-primary border-primary" : "text-muted border-transparent hover:text-ink"}`}>
                  {t === "profile" ? "Perfil" : t === "edit" ? "Editar" : t === "brand" ? "Marca" : "CRM"}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(100vh-420px)]">
              {/* Profile tab */}
              {tab === "profile" && (
                <div className="space-y-6">
                  {/* Resumen siempre visible */}
                  <div>
                    <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Información</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["Idioma", client.language],
                        ["Zona horaria", client.timezone?.replace("_", " ") ?? "—"],
                        ["Email", client.email || "—"],
                        ["Teléfono", client.phone || "—"],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-surface2 border border-line rounded-lg px-3 py-2">
                          <p className="font-mono text-[9px] text-muted uppercase tracking-widest">{label}</p>
                          <p className="text-sm text-ink truncate">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Servicios contratados */}
                  <div>
                    <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Servicios</h3>
                    {(clientServices[client.id] ?? []).length === 0 ? (
                      <p className="text-xs text-muted">
                        Sin servicios asignados. Ve a la pestaña <span className="text-ink">Editar</span> para asignarlos.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(clientServices[client.id] ?? []).map((sid) => {
                          const svc = services.find((x) => x.id === sid);
                          if (!svc) return null;
                          return (
                            <span key={sid} className="text-xs font-mono px-2.5 py-1 rounded-lg" style={{ background: `${svc.color}18`, color: svc.color }}>
                              {svc.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Contacts */}
                  {client.contacts.length === 0 && (
                    <div>
                      <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Contactos</h3>
                      <p className="text-xs text-muted">Aún no hay contactos. Añádelos desde <span className="text-ink">Editar</span>.</p>
                    </div>
                  )}
                  {client.contacts.length > 0 && (
                    <div>
                      <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Contactos</h3>
                      <div className="space-y-2">
                        {client.contacts.map((contact, i) => (
                          <div key={i} className="flex items-center gap-3 bg-surface2 border border-line rounded-lg px-4 py-3">
                            <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center text-xs font-700 text-muted flex-shrink-0">
                              {contact.name[0]}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-500 text-ink">{contact.name}</p>
                              <p className="text-xs text-muted">{contact.role}</p>
                            </div>
                            <div className="text-right text-xs text-muted">
                              <p>{contact.email}</p>
                              <p>{contact.phone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  {clientProjects.length === 0 && (
                    <div>
                      <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Proyectos</h3>
                      <p className="text-xs text-muted">Sin proyectos activos para este cliente.</p>
                    </div>
                  )}
                  {clientProjects.length > 0 && (
                    <div>
                      <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Proyectos</h3>
                      <div className="space-y-2">
                        {clientProjects.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 bg-surface2 border border-line rounded-lg px-4 py-3">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                            <p className="text-sm font-500 text-ink flex-1">{p.name}</p>
                            <span className="font-mono text-[10px] text-muted">{p.currentPhase}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ borderColor: p.status === "active" ? "#31b49840" : "#26262e", color: p.status === "active" ? "#31b498" : "#8b93a1" }}>
                              {p.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit tab */}
              {tab === "edit" && (
                <ClientEditTab
                  client={client}
                  canEdit={canEdit}
                  services={services}
                  activeServiceIds={clientServices[client.id] ?? []}
                  onToggleService={(sid, on) => onToggleService?.(client.id, sid, on)}
                  onSave={(updates) => onUpdateClient?.(client.id, updates)}
                  onDelete={onDeleteClient ? () => onDeleteClient(client.id) : undefined}
                />
              )}

              {/* Brand tab */}
              {tab === "brand" && (
                <BrandTab client={client} onUpdate={(updates) => onUpdateClient?.(client.id, updates)} logoRef={logoRef} canEdit={canEdit} upload={upload} />
              )}

              {/* CRM tab */}
              {tab === "crm" && (
                <div>
                  <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Historial de interacciones</h3>
                  {(interactions[client.id] ?? []).length === 0 ? (
                    <p className="text-sm text-muted">Sin interacciones registradas.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...(interactions[client.id] ?? [])].map((interaction) => (
                        <div key={interaction.id} className="flex gap-3">
                          <div className="text-xl flex-shrink-0 mt-0.5">{interactionIcons[interaction.type]}</div>
                          <div className="flex-1 bg-surface2 border border-line rounded-lg px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono text-muted uppercase">{interaction.type} · {interaction.date}</span>
                              <span className="text-[10px] font-mono text-muted">{interaction.by}</span>
                            </div>
                            <p className="text-sm text-ink">{interaction.notes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-surface border border-line rounded-xl flex items-center justify-center">
            <div className="text-center">
              <p className="font-display text-4xl font-700 text-muted/20 uppercase mb-2">Cuentas</p>
              <p className="text-sm text-muted">Selecciona un cliente para ver su perfil</p>
            </div>
          </div>
        )}
      </div>
      {showNewClient && onAddClient && (
        <NewClientModal
          onAdd={(c) => { onAddClient(c); setShowNewClient(false); }}
          onCancel={() => setShowNewClient(false)}
        />
      )}
    </div>
  );
}

// ─── Nuevo Cliente ────────────────────────────────────────────────────────────
function NewClientModal({ onAdd, onCancel }: { onAdd: (c: Partial<Client>) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#31b498");
  const [language, setLanguage] = useState("Español");
  const [timezone, setTimezone] = useState("America/Puerto_Rico");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tone, setTone] = useState("");
  const [bannedWords, setBannedWords] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim()) { setErr("El nombre es obligatorio."); return; }
    onAdd({
      name: name.trim(),
      color,
      language,
      timezone,
      contacts: contactName || contactEmail ? [{ name: contactName, role: "", email: contactEmail, phone: "" }] : [],
      brandRules: {
        bannedWords: bannedWords.split(",").map((w) => w.trim()).filter(Boolean),
        guidelines: "", tone, colors: [], fonts: [],
      },
      notifyEmail: true,
    });
  };

  const inputCls = "w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-lg overflow-hidden animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display text-2xl font-700 uppercase text-ink">Nueva cuenta</h2>
          <button onClick={onCancel} className="text-muted hover:text-ink text-lg">✕</button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Nombre *</label>
              <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} placeholder="Ej: Ferreterías National" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Color</label>
              <div className="w-10 h-10 rounded-lg border border-line overflow-hidden relative cursor-pointer" style={{ background: color }}>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Idioma</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls + " cursor-pointer"}>
                <option className="bg-surface">Español</option>
                <option className="bg-surface">English</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Zona horaria</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls + " cursor-pointer"}>
                {["America/Puerto_Rico", "America/New_York", "America/Chicago", "America/Los_Angeles"].map((tz) => (
                  <option key={tz} value={tz} className="bg-surface">{tz.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Contacto principal</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nombre" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Email del contacto</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contacto@cliente.com" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Tono de marca</label>
            <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Ej: cercano, profesional, juvenil…" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Palabras prohibidas (separadas por coma)</label>
            <input value={bannedWords} onChange={(e) => setBannedWords(e.target.value)} placeholder="Ej: barato, oferta loca" className={inputCls} />
          </div>
          {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        </div>
        <div className="px-6 py-4 border-t border-line flex justify-end gap-3">
          <button onClick={onCancel} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink transition-colors">Cancelar</button>
          <button onClick={submit} className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90">Crear cuenta</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Editar cliente ──────────────────────────────────────────────────────── */
function ClientEditTab({ client, canEdit, services, activeServiceIds, onToggleService, onSave, onDelete }: {
  client: Client;
  canEdit: boolean;
  services: { id: string; name: string; color: string; enables_content_calendar: boolean }[];
  activeServiceIds: string[];
  onToggleService: (serviceId: string, on: boolean) => void;
  onSave: (updates: Partial<Client>) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<Client>({ ...client });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { setDraft({ ...client }); }, [client.id]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(client);
  const upd = (k: keyof Client, v: unknown) => setDraft((p) => ({ ...p, [k]: v }));
  const cls = "w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50";

  const updContact = (i: number, field: string, value: string) => {
    const next = [...draft.contacts];
    next[i] = { ...next[i], [field]: value };
    upd("contacts", next);
  };

  return (
    <div className="space-y-6">
      {/* Datos base */}
      <div>
        <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">Datos de la cuenta</h3>
        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Nombre</label>
              <input value={draft.name} disabled={!canEdit} onChange={(e) => { upd("name", e.target.value); upd("company", e.target.value); }} className={cls} />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Color</label>
              <div className="w-10 h-10 rounded-lg border border-line relative cursor-pointer" style={{ background: draft.color }}>
                {canEdit && <input type="color" value={draft.color} onChange={(e) => upd("color", e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Idioma</label>
              <select value={draft.language} disabled={!canEdit} onChange={(e) => upd("language", e.target.value)} className={cls + " cursor-pointer"}>
                <option className="bg-surface">Español</option>
                <option className="bg-surface">English</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Zona horaria</label>
              <select value={draft.timezone} disabled={!canEdit} onChange={(e) => upd("timezone", e.target.value)} className={cls + " cursor-pointer"}>
                {["America/Puerto_Rico", "America/New_York", "America/Chicago", "America/Los_Angeles"].map((tz) => (
                  <option key={tz} value={tz} className="bg-surface">{tz.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
            <input type="checkbox" checked={draft.notifyEmail} disabled={!canEdit} onChange={(e) => upd("notifyEmail", e.target.checked)} className="accent-[#31b498]" />
            Recibe notificaciones por email
          </label>
        </div>
      </div>

      {/* Email de la cuenta */}
      {client.slug && client.emailToken && (
        <div>
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Crear tareas por email</h3>
          <EmailAddress slug={client.slug} token={client.emailToken} />
        </div>
      )}

      {/* Servicios contratados */}
      <div>
        <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Servicios contratados</h3>
        <p className="text-[11px] text-muted mb-3">Definen qué módulos se activan para este cliente.</p>
        {services.length === 0 ? (
          <p className="text-xs text-muted">Aún no hay servicios. Créalos en Workshop → Servicios.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {services.map((s) => {
              const on = activeServiceIds.includes(s.id);
              return (
                <label key={s.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${on ? "border-primary/40 bg-primary/5 text-ink" : "border-line text-muted hover:border-muted"}`}>
                  <input type="checkbox" checked={on} disabled={!canEdit} onChange={(e) => onToggleService(s.id, e.target.checked)} className="accent-[#31b498]" />
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="truncate flex-1">{s.name}</span>
                  {s.enables_content_calendar && on && <span className="text-[9px] font-mono text-primary">📅</span>}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Contactos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-[10px] text-muted uppercase tracking-widest">Contactos</h3>
          {canEdit && (
            <button
              onClick={() => upd("contacts", [...draft.contacts, { name: "", role: "", email: "", phone: "" }])}
              className="text-[10px] font-mono text-primary hover:opacity-80"
            >
              + Añadir contacto
            </button>
          )}
        </div>
        <div className="space-y-2">
          {draft.contacts.map((c, i) => (
            <div key={i} className="bg-surface2 border border-line rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input value={c.name} disabled={!canEdit} onChange={(e) => updContact(i, "name", e.target.value)} placeholder="Nombre" className={cls} />
                <input value={c.role} disabled={!canEdit} onChange={(e) => updContact(i, "role", e.target.value)} placeholder="Puesto" className={cls} />
                {canEdit && (
                  <button
                    onClick={() => upd("contacts", draft.contacts.filter((_, j) => j !== i))}
                    className="text-danger hover:opacity-70 px-2 flex-shrink-0"
                    title="Quitar contacto"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input value={c.email} disabled={!canEdit} onChange={(e) => updContact(i, "email", e.target.value)} placeholder="email@cliente.com" className={cls} />
                <input value={c.phone} disabled={!canEdit} onChange={(e) => updContact(i, "phone", e.target.value)} placeholder="787-000-0000" className={cls} />
              </div>
            </div>
          ))}
          {draft.contacts.length === 0 && <p className="text-xs text-muted">Sin contactos registrados.</p>}
        </div>
      </div>

      {/* Acciones */}
      {canEdit && (
        <div className="flex items-center justify-between pt-4 border-t border-line">
          {onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-danger">¿Seguro?</span>
                <button onClick={onDelete} className="text-xs font-mono px-3 py-1.5 rounded-lg bg-danger text-white font-600">Sí, eliminar</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs font-mono px-3 py-1.5 rounded-lg border border-line text-muted">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-xs font-mono text-danger hover:opacity-80">
                Eliminar cuenta
              </button>
            )
          ) : <span />}

          <div className="flex items-center gap-3">
            {dirty && <span className="text-[10px] font-mono text-warning">Cambios sin guardar</span>}
            <button
              onClick={() => onSave(draft)}
              disabled={!dirty}
              className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90 disabled:opacity-30 transition-opacity"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
