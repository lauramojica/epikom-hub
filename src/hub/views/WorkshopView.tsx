"use client";
import { useState } from "react";
import { useWorkshop, type WorkshopOption, type Service } from "../useWorkshop";
import type { Client } from "../types";

type Tab = "servicios" | "formatos" | "canales" | "fases" | "branding";

const TABS: { key: Tab; label: string }[] = [
  { key: "servicios", label: "Servicios" },
  { key: "formatos", label: "Formatos" },
  { key: "canales", label: "Canales" },
  { key: "fases", label: "Fases" },
  { key: "branding", label: "Branding" },
];

interface Props {
  clients: Client[];
  canEdit: boolean;
  agency?: Record<string, unknown> | null;
  onSaveAgency?: (updates: Record<string, unknown>, files?: Record<string, File>) => Promise<void> | void;
  onToast?: (msg: string, kind?: "success" | "error" | "info") => void;
}

const inputCls = "w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50";

export default function WorkshopView({ clients, canEdit, agency, onSaveAgency, onToast }: Props) {
  const w = useWorkshop();
  const [tab, setTab] = useState<Tab>("servicios");

  if (w.loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="h-32 rounded-xl skeleton-base" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Personaliza tu Hub</p>
        <h1 className="font-display text-3xl md:text-5xl font-700 tracking-tight text-ink uppercase">
          Configuración del Workshop
        </h1>
      </div>

      {!canEdit && (
        <p className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          Solo los admins pueden editar esta sección. Puedes ver la configuración actual.
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-line rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wide transition-all whitespace-nowrap ${
              tab === t.key ? "bg-primary text-bg font-600" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "servicios" && <ServicesTab w={w} clients={clients} canEdit={canEdit} onToast={onToast} />}
      {tab === "formatos" && <OptionsTab w={w} kind="format" title="Formatos" hint="Los formatos de producción disponibles al crear contenido." canEdit={canEdit} onToast={onToast} />}
      {tab === "canales" && <OptionsTab w={w} kind="channel" title="Canales" hint="Las plataformas donde publican." canEdit={canEdit} withColor onToast={onToast} />}
      {tab === "fases" && <OptionsTab w={w} kind="phase" title="Fases del Journey" hint="Las etapas por las que pasa un proyecto." canEdit={canEdit} onToast={onToast} />}
      {tab === "branding" && <BrandingTab agency={agency} canEdit={canEdit} onSave={onSaveAgency} onToast={onToast} />}
    </div>
  );
}

/* ─── Servicios ─────────────────────────────────────────────────────────── */
function ServicesTab({ w, clients, canEdit, onToast }: {
  w: ReturnType<typeof useWorkshop>; clients: Client[]; canEdit: boolean;
  onToast?: (m: string, k?: "success" | "error" | "info") => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted max-w-lg leading-relaxed">
          Los tipos de trabajo que ofrece Epikom. Cada servicio decide qué módulos se activan para el cliente que lo tenga contratado.
        </p>
        {canEdit && (
          <button onClick={() => setShowNew(true)} className="text-xs font-mono px-4 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90 whitespace-nowrap">
            + Servicio
          </button>
        )}
      </div>

      <div className="space-y-2">
        {w.services.map((s) => {
          const clientsWith = clients.filter((c) => (w.clientServices[c.id] ?? []).includes(s.id));
          const isOpen = expanded === s.id;
          return (
            <div key={s.id} className="bg-surface border border-line rounded-xl overflow-hidden">
              <div
                className={`flex items-center gap-3 px-4 py-3 ${canEdit ? "cursor-pointer hover:bg-surface2/40" : ""} transition-colors`}
                onClick={() => canEdit && setExpanded(isOpen ? null : s.id)}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-500 text-ink">{s.name}</p>
                  <p className="text-[11px] text-muted truncate">{s.description}</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  {s.enables_content_calendar && <Badge>Calendario</Badge>}
                  {s.enables_projects && <Badge>Proyectos</Badge>}
                  {s.enables_production && <Badge>Producción</Badge>}
                </div>
                <span className="font-mono text-[10px] text-muted whitespace-nowrap">{clientsWith.length} cliente{clientsWith.length === 1 ? "" : "s"}</span>
                {canEdit && <span className="text-[10px] text-muted">{isOpen ? "▲" : "▼"}</span>}
              </div>

              {isOpen && canEdit && (
                <div className="px-4 pb-4 pt-1 bg-surface2/30 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {([
                      ["enables_content_calendar", "Calendario de contenido"],
                      ["enables_projects", "Proyectos"],
                      ["enables_production", "Producción / Shoots"],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s[key]}
                          onChange={(e) => w.updateService(s.id, { [key]: e.target.checked }).then(() => onToast?.("✓ Servicio actualizado.", "success"))}
                          className="accent-[#31b498]"
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div>
                    <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Clientes con este servicio</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                      {clients.map((c) => {
                        const on = (w.clientServices[c.id] ?? []).includes(s.id);
                        return (
                          <label key={c.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${on ? "border-primary/40 bg-primary/5 text-ink" : "border-line text-muted hover:border-muted"}`}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={(e) => w.toggleClientService(c.id, s.id, e.target.checked)}
                              className="accent-[#31b498]"
                            />
                            <span className="truncate">{c.company}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => { if (confirm(`¿Eliminar el servicio "${s.name}"?`)) w.deleteService(s.id).then(() => onToast?.("✓ Servicio eliminado.", "success")); }}
                    className="text-[11px] font-mono text-danger hover:opacity-80"
                  >
                    Eliminar servicio
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNew && (
        <NewServiceModal
          onAdd={(svc) => { w.addService(svc).then(() => onToast?.("✓ Servicio creado.", "success")); setShowNew(false); }}
          onCancel={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-line text-muted whitespace-nowrap">{children}</span>;
}

function NewServiceModal({ onAdd, onCancel }: { onAdd: (s: Partial<Service>) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#31b498");
  const [cal, setCal] = useState(false);
  const [proj, setProj] = useState(true);
  const [prod, setProd] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display text-2xl font-700 uppercase text-ink">Nuevo servicio</h2>
          <button onClick={onCancel} className="text-muted hover:text-ink text-lg">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Nombre *</label>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Podcast" className={inputCls} />
            </div>
            <div className="w-10 h-10 rounded-lg border border-line relative cursor-pointer flex-shrink-0" style={{ background: color }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Descripción</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué incluye este servicio" className={inputCls} />
          </div>
          <div>
            <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Módulos que activa</p>
            <div className="space-y-2">
              {([[cal, setCal, "Calendario de contenido"], [proj, setProj, "Proyectos"], [prod, setProd, "Producción / Shoots"]] as const).map(([val, set, label], i) => (
                <label key={i} className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                  <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="accent-[#31b498]" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-line flex justify-end gap-3">
          <button onClick={onCancel} className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-muted hover:text-ink">Cancelar</button>
          <button
            onClick={() => name.trim() && onAdd({ name: name.trim(), description, color, enables_content_calendar: cal, enables_projects: proj, enables_production: prod })}
            className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90"
          >
            Crear servicio
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Catálogos genéricos ───────────────────────────────────────────────── */
function OptionsTab({ w, kind, title, hint, canEdit, withColor, onToast }: {
  w: ReturnType<typeof useWorkshop>;
  kind: WorkshopOption["kind"];
  title: string; hint: string; canEdit: boolean; withColor?: boolean;
  onToast?: (m: string, k?: "success" | "error" | "info") => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#31b498");
  const items = w.byKind(kind, true);

  const add = () => {
    if (!newLabel.trim()) return;
    w.addOption(kind, newLabel.trim(), withColor ? newColor : undefined)
      .then(() => { onToast?.(`✓ ${title.slice(0, -1)} añadido.`, "success"); setNewLabel(""); })
      .catch(() => onToast?.("✕ Ya existe una opción con ese nombre.", "error"));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted max-w-lg leading-relaxed">{hint}</p>

      {canEdit && (
        <div className="flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={`Añadir ${title.toLowerCase().replace(/s$/, "")}…`}
            className={inputCls + " flex-1"}
          />
          {withColor && (
            <div className="w-10 h-10 rounded-lg border border-line relative cursor-pointer flex-shrink-0" style={{ background: newColor }}>
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
            </div>
          )}
          <button onClick={add} className="text-xs font-mono px-4 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90 whitespace-nowrap">
            + Añadir
          </button>
        </div>
      )}

      <div className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
        {items.map((o) => (
          <div key={o.id} className={`flex items-center gap-3 px-4 py-2.5 ${!o.active ? "opacity-40" : ""}`}>
            {o.color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: o.color }} />}
            {canEdit ? (
              <input
                value={o.label}
                onChange={(e) => w.updateOption(o.id, { label: e.target.value })}
                onBlur={() => onToast?.("✓ Guardado.", "success")}
                title="Se guarda al salir del campo"
                className="flex-1 bg-transparent text-sm text-ink outline-none focus:bg-surface2 rounded px-1.5 py-0.5 -ml-1.5 transition-colors"
              />
            ) : (
              <span className="flex-1 text-sm text-ink">{o.label}</span>
            )}
            <span className="font-mono text-[10px] text-muted/50 hidden sm:inline">{o.value}</span>
            {o.is_system && <Badge>sistema</Badge>}
            {canEdit && (
              <>
                <button
                  onClick={() => w.updateOption(o.id, { active: !o.active })}
                  className="text-[10px] font-mono text-muted hover:text-ink whitespace-nowrap"
                  title={o.active ? "Desactivar" : "Reactivar"}
                >
                  {o.active ? "Activo" : "Inactivo"}
                </button>
                {!o.is_system && (
                  <button
                    onClick={() => w.deleteOption(o.id).then(() => onToast?.("✓ Eliminado.", "success"))}
                    className="text-danger hover:opacity-70 text-sm"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted">Aún no hay opciones. Añade la primera arriba.</p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted/70 leading-relaxed">
        Los cambios en esta lista se guardan automáticamente. Las opciones marcadas como <span className="font-mono">sistema</span> no se pueden borrar, solo desactivar.
        Al desactivar una opción deja de aparecer en los menús, pero el contenido histórico que ya la usaba se mantiene intacto.
      </p>
    </div>
  );
}

/* ─── Branding ──────────────────────────────────────────────────────────── */
function BrandingTab({ agency, canEdit, onSave, onToast }: {
  agency?: Record<string, unknown> | null;
  canEdit: boolean;
  onSave?: (updates: Record<string, unknown>, files?: Record<string, File>) => Promise<void> | void;
  onToast?: (m: string, k?: "success" | "error" | "info") => void;
}) {
  const a = (agency ?? {}) as Record<string, string | null>;
  const [logo, setLogo] = useState<string | null>(a.logo_url ?? null);
  const [logoLight, setLogoLight] = useState<string | null>(a.logo_url_light ?? null);
  const [icon, setIcon] = useState<string | null>(a.icon_url ?? null);
  const [iconLight, setIconLight] = useState<string | null>(a.icon_url_light ?? null);
  const [portalLogo, setPortalLogo] = useState<string | null>(a.portal_logo_url ?? null);
  const [wordmark, setWordmark] = useState(a.wordmark ?? "Epikom");
  const [wordmarkSub, setWordmarkSub] = useState(a.wordmark_sub ?? "Hub Interno");
  const [primary, setPrimary] = useState(a.brand_primary ?? "#31b498");
  const [accent, setAccent] = useState(a.brand_accent ?? "#dbfa45");
  const [files, setFiles] = useState<Record<string, File>>({});
  const [saving, setSaving] = useState(false);

  const pick = (key: string, setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setter(URL.createObjectURL(f));
    setFiles((prev) => ({ ...prev, [key]: f }));
  };

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({
        logo_url: logo, logo_url_light: logoLight,
        icon_url: icon, icon_url_light: iconLight,
        portal_logo_url: portalLogo,
        wordmark, wordmark_sub: wordmarkSub,
        brand_primary: primary, brand_accent: accent,
      }, files);
      setFiles({});
      onToast?.("✓ Branding guardado.", "success");
    } catch {
      onToast?.("✕ No se pudo guardar.", "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted max-w-lg leading-relaxed">
        La identidad visual del Hub: lo que ve tu equipo al entrar y lo que ven tus clientes en su portal.
      </p>

      <div className="space-y-4">
        <div>
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Logo principal · sidebar y encabezados</p>
          <div className="grid md:grid-cols-2 gap-4">
            <LogoSlot label="Para fondo oscuro" hint="Versión clara del logo" src={logo} onPick={pick("logo", setLogo)} onClear={() => { setLogo(null); setFiles(f => { const n = {...f}; delete n.logo; return n; }); }} canEdit={canEdit} dark />
            <LogoSlot label="Para fondo claro" hint="Versión oscura · opcional" src={logoLight} onPick={pick("logo_light", setLogoLight)} onClear={() => { setLogoLight(null); setFiles(f => { const n = {...f}; delete n.logo_light; return n; }); }} canEdit={canEdit} light />
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Isotipo · login y favicon · cuadrado</p>
          <div className="grid md:grid-cols-2 gap-4">
            <LogoSlot label="Para fondo oscuro" hint="Versión clara" src={icon} onPick={pick("icon", setIcon)} onClear={() => { setIcon(null); setFiles(f => { const n = {...f}; delete n.icon; return n; }); }} canEdit={canEdit} square dark />
            <LogoSlot label="Para fondo claro" hint="Versión oscura · opcional" src={iconLight} onPick={pick("icon_light", setIconLight)} onClear={() => { setIconLight(null); setFiles(f => { const n = {...f}; delete n.icon_light; return n; }); }} canEdit={canEdit} square light />
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">Portal del cliente</p>
          <div className="md:w-1/2">
            <LogoSlot label="Logo del portal" hint="Lo que ven tus clientes" src={portalLogo} onPick={pick("portal_logo", setPortalLogo)} onClear={() => { setPortalLogo(null); setFiles(f => { const n = {...f}; delete n.portal_logo; return n; }); }} canEdit={canEdit} />
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted/70 leading-relaxed">
        Si solo subes la versión para fondo oscuro, se usará en ambos modos. Sube la variante clara cuando tu logo no tenga contraste suficiente sobre blanco.
      </p>

      <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <p className="font-mono text-[10px] text-muted uppercase tracking-widest">Wordmark del login</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Texto principal</label>
            <input value={wordmark} onChange={(e) => setWordmark(e.target.value)} disabled={!canEdit} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Subtítulo</label>
            <input value={wordmarkSub} onChange={(e) => setWordmarkSub(e.target.value)} disabled={!canEdit} className={inputCls} />
          </div>
        </div>

        <p className="font-mono text-[10px] text-muted uppercase tracking-widest pt-2">Colores de marca</p>
        <div className="grid grid-cols-2 gap-4">
          {([["Primario", primary, setPrimary], ["Acento", accent, setAccent]] as const).map(([label, val, set]) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-line relative flex-shrink-0" style={{ background: val }}>
                {canEdit && <input type="color" value={val} onChange={(e) => set(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />}
              </div>
              <div>
                <p className="text-xs text-ink">{label}</p>
                <p className="font-mono text-[10px] text-muted">{val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="text-xs font-mono px-5 py-2.5 rounded-lg bg-primary text-bg font-600 hover:opacity-90 disabled:opacity-40">
            {saving ? "Guardando…" : "Guardar branding"}
          </button>
        </div>
      )}
    </div>
  );
}

function LogoSlot({ label, hint, src, onPick, onClear, canEdit, square, dark, light }: {
  label: string; hint: string; src: string | null;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void; canEdit: boolean; square?: boolean; dark?: boolean; light?: boolean;
}) {
  const previewBg = dark ? "#0a0a0d" : light ? "#f4f5f7" : undefined;
  return (
    <div className="bg-surface border border-line rounded-xl p-4">
      <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">{label}</p>
      <div
        className={`${square ? "w-16 h-16" : "w-full h-16"} rounded-lg border border-line flex items-center justify-center overflow-hidden mb-3 ${previewBg ? "" : "bg-surface2"}`}
        style={previewBg ? { background: previewBg } : undefined}
      >
        {src ? (
          <img src={src} alt={label} className="w-full h-full object-contain" />
        ) : (
          <span className="text-muted/40 text-xs font-mono">sin imagen</span>
        )}
      </div>
      <p className="text-[10px] text-muted mb-2">{hint}</p>
      {canEdit && (
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-mono px-3 py-1.5 rounded-lg border border-line text-ink cursor-pointer hover:border-primary/40 hover:text-primary transition-all">
            Subir
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={onPick} />
          </label>
          {src && <button onClick={onClear} className="text-[10px] font-mono text-muted hover:text-danger">Quitar</button>}
        </div>
      )}
    </div>
  );
}
