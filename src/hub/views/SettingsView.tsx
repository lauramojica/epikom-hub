import { useState } from "react";

const INTEGRATIONS = [
  { name: "Meta Business Suite", desc: "Publicar en Facebook e Instagram", icon: "📘", connected: true },
  { name: "TikTok for Business", desc: "Programar reels y videos cortos", icon: "🎵", connected: false },
  { name: "Google Analytics", desc: "Rastrear tráfico y conversiones", icon: "📊", connected: false },
  { name: "Slack", desc: "Alertas de deadline al equipo", icon: "💬", connected: true },
  { name: "WhatsApp Business", desc: "Notificar aprobaciones a clientes", icon: "📱", connected: false },
  { name: "Dropbox", desc: "Sincronizar assets y creativos", icon: "📦", connected: false },
];

const FONT_SIZES = [
  { label: "XS", value: 12, desc: "Muy compacto" },
  { label: "S", value: 14, desc: "Compacto" },
  { label: "M", value: 16, desc: "Normal" },
  { label: "L", value: 18, desc: "Cómodo" },
  { label: "XL", value: 20, desc: "Grande" },
];

const NOTIF_EVENTS = [
  { key: "approval_request", label: "Solicitud de aprobación", desc: "Cuando alguien pide aprobar un entregable" },
  { key: "approval_done",    label: "Aprobación completada",   desc: "Cuando aprueban o rechazan tu trabajo" },
  { key: "mention",          label: "Menciones",               desc: "Cuando te mencionan en un comentario" },
  { key: "deadline_near",    label: "Fecha límite cercana",     desc: "2 días antes del vencimiento" },
  { key: "post_published",   label: "Post publicado",           desc: "Cuando un post sale al mundo 🚀" },
  { key: "new_project",      label: "Nuevo proyecto",           desc: "Cuando se asigna un proyecto nuevo" },
];

function NotifPrefsSection() {
  type Channel = "push" | "email" | "sms";
  const [prefs, setPrefs] = useState<Record<string, Record<Channel, boolean>>>(() =>
    Object.fromEntries(NOTIF_EVENTS.map((e) => [e.key, { push: true, email: e.key !== "post_published", sms: false }]))
  );
  const [digest, setDigest] = useState(true);
  const [digestTime, setDigestTime] = useState("08:00");

  const toggle = (event: string, ch: Channel) => setPrefs((p) => ({ ...p, [event]: { ...p[event], [ch]: !p[event][ch] } }));

  return (
    <section className="bg-surface border border-line rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="font-display text-xl font-700 uppercase text-ink">Preferencias de notificaciones</h2>
        <p className="text-xs text-muted mt-0.5">Elige cómo y cuándo te avisamos de cada evento.</p>
      </div>
      <div className="divide-y divide-line">
        {/* Table header */}
        <div className="flex items-center gap-4 px-5 py-2 bg-surface2">
          <div className="flex-1" />
          {(["push","email","sms"] as Channel[]).map((ch) => (
            <span key={ch} className="w-12 text-center font-mono text-[9px] uppercase tracking-widest text-muted">{ch}</span>
          ))}
        </div>
        {NOTIF_EVENTS.map((ev) => (
          <div key={ev.key} className="flex items-center gap-4 px-5 py-3 hover:bg-surface2 transition-colors group">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-500 text-ink">{ev.label}</p>
              <p className="text-xs text-muted">{ev.desc}</p>
            </div>
            {(["push","email","sms"] as Channel[]).map((ch) => {
              const on = prefs[ev.key][ch];
              return (
                <button key={ch} onClick={() => toggle(ev.key, ch)} className={`w-12 flex justify-center transition-all`}>
                  <div className={`w-9 h-5 rounded-full relative transition-all duration-200 ${on ? "bg-primary" : "bg-surface2 border border-line"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-bg shadow transition-all duration-200 ${on ? "left-[18px]" : "left-0.5"}`} />
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {/* Daily digest */}
      <div className="px-5 py-4 border-t border-line flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-500 text-ink">Resumen diario</p>
          <p className="text-xs text-muted">Un email con todo lo de tu día, de una sola vez.</p>
        </div>
        <div className="flex items-center gap-3">
          {digest && (
            <input type="time" value={digestTime} onChange={(e) => setDigestTime(e.target.value)} className="bg-surface2 border border-line rounded-lg px-3 py-1.5 text-xs text-ink outline-none font-mono focus:border-primary/40" />
          )}
          <button onClick={() => setDigest((v) => !v)} className={`w-10 h-5.5 rounded-full relative transition-all duration-200 flex-shrink-0 ${digest ? "bg-primary" : "bg-surface2 border border-line"}`} style={{ height: 22 }}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-bg shadow transition-all duration-200 ${digest ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>
    </section>
  );
}

interface Props {
  isDark?: boolean;
  onToggleTheme?: () => void;
  onConfirm?: (config: { title: string; message: string; danger?: boolean; onConfirm: () => void }) => void;
}

export default function SettingsView({ isDark = true, onToggleTheme }: Props) {
  const [fontSize, setFontSize] = useState(16);

  const applyFontSize = (px: number) => {
    setFontSize(px);
    document.documentElement.style.fontSize = `${px}px`;
  };

  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [agency, setAgency] = useState({
    name: "Epikom Interactive",
    tagline: "Estrategia · Contenido · Resultados",
    email: "laura@epikom.com",
    phone: "+1 787 000 0000",
    website: "epikom.com",
    city: "Bayamón, Puerto Rico",
    defaultTimezone: "America/Puerto_Rico",
    defaultLanguage: "es-PR",
  });

  const [prefs, setPrefs] = useState({
    deadlineAlertDays: 3,
    autoPublishReminder: true,
    requireApproval: true,
    clientPortalEnabled: true,
    defaultPostStatus: "idea",
    weekStart: "mon",
  });

  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  const upd = (k: keyof typeof agency, v: string) => setAgency((p) => ({ ...p, [k]: v }));
  const updPref = (k: keyof typeof prefs, v: unknown) => setPrefs((p) => ({ ...p, [k]: v }));

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      <div>
        <p className="font-mono text-muted text-xs tracking-widest uppercase mb-1">Preferencias del sistema</p>
        <h1 className="font-display text-5xl font-700 tracking-tight text-ink uppercase">Configuración</h1>
      </div>

      {/* Appearance */}
      <section className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-display text-xl font-700 uppercase text-ink">Apariencia</h2>
        </div>
        <div className="p-5 space-y-5">

          {/* Dark mode toggle */}
          <div className="flex items-center justify-between pb-5 border-b border-line">
            <div>
              <p className="text-sm font-500 text-ink">Modo oscuro</p>
              <p className="text-xs text-muted">Dale un vibe diferente a tu hub ✨</p>
            </div>
            <button
              onClick={onToggleTheme}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center ${isDark ? "bg-primary" : "bg-surface2 border border-line"}`}
            >
              <div
                className="w-5 h-5 rounded-full bg-ink transition-all duration-300 flex items-center justify-center text-[10px]"
                style={{ marginLeft: isDark ? "calc(100% - 22px)" : "2px" }}
              >
                {isDark ? "🌙" : "☀️"}
              </div>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-500 text-ink">Tamaño de fuente</p>
                <p className="text-xs text-muted">Afecta el tamaño de todo el texto en la plataforma</p>
              </div>
              <span className="font-mono text-sm text-primary font-600">{fontSize}px</span>
            </div>
            {/* Preset buttons */}
            <div className="flex gap-2 mb-4">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => applyFontSize(s.value)}
                  className={`flex-1 flex flex-col items-center py-3 rounded-xl border transition-all ${fontSize === s.value ? "bg-primary/10 border-primary/40 text-primary" : "border-line text-muted hover:text-ink hover:border-muted"}`}
                >
                  <span className="font-display font-700 leading-none mb-1" style={{ fontSize: s.value }}>{s.label}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wide">{s.desc}</span>
                </button>
              ))}
            </div>
            {/* Slider */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted w-6 text-right">12</span>
              <input
                type="range" min={12} max={20} step={1} value={fontSize}
                onChange={(e) => applyFontSize(Number(e.target.value))}
                className="flex-1 accent-primary h-1.5 rounded-full cursor-pointer"
              />
              <span className="font-mono text-[10px] text-muted w-6">20</span>
            </div>
            {/* Live preview */}
            <div className="mt-4 bg-surface2 border border-line rounded-xl p-4" style={{ fontSize }}>
              <p className="font-display font-700 uppercase text-ink mb-1" style={{ fontSize: fontSize * 1.5 }}>Vista previa</p>
              <p className="text-ink mb-0.5">Este es el tamaño de texto que verás en toda la plataforma.</p>
              <p className="text-muted font-mono" style={{ fontSize: fontSize * 0.75 }}>Texto secundario y etiquetas en monospace</p>
            </div>
          </div>
        </div>
      </section>

      {/* Agency identity */}
      <section className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-display text-xl font-700 uppercase text-ink">Identidad de la agencia</h2>
        </div>
        <div className="p-5 pb-0 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface2 border border-line flex items-center justify-center overflow-hidden flex-shrink-0">
            {agencyLogo ? (
              <img src={agencyLogo} alt="Logo de la agencia" className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-2xl font-700 text-primary">E</span>
            )}
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Logo de la agencia</label>
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono px-4 py-2 rounded-lg border border-line text-ink cursor-pointer hover:border-primary/40 hover:text-primary transition-all">
                Subir logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setAgencyLogo(URL.createObjectURL(f));
                  }}
                />
              </label>
              {agencyLogo && (
                <button onClick={() => setAgencyLogo(null)} className="text-xs font-mono px-3 py-2 rounded-lg text-muted hover:text-danger transition-colors">
                  Quitar
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted mt-1.5">PNG, JPG, SVG o WebP · se usa en el sidebar y el portal del cliente</p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {[
            { label: "Nombre", key: "name" as const },
            { label: "Tagline", key: "tagline" as const },
            { label: "Email", key: "email" as const },
            { label: "Teléfono", key: "phone" as const },
            { label: "Sitio web", key: "website" as const },
            { label: "Ciudad", key: "city" as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">{label}</label>
              <input value={agency[key]} onChange={(e) => upd(key, e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 font-body" />
            </div>
          ))}
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Zona horaria</label>
            <select value={agency.defaultTimezone} onChange={(e) => upd("defaultTimezone", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
              {["America/Puerto_Rico","America/New_York","America/Chicago","America/Bogota","America/Mexico_City","Europe/Madrid"].map((tz) => (
                <option key={tz} value={tz} className="bg-surface">{tz.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Idioma</label>
            <select value={agency.defaultLanguage} onChange={(e) => upd("defaultLanguage", e.target.value)} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
              {["es-PR","en-US","es-MX","es-ES"].map((l) => (
                <option key={l} value={l} className="bg-surface">{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-line flex justify-end">
          <button className="text-xs font-mono px-5 py-2 rounded-lg bg-primary text-bg font-600 hover:opacity-90">Guardar cambios</button>
        </div>
      </section>

      {/* Workflow preferences */}
      <section className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-display text-xl font-700 uppercase text-ink">Flujo de trabajo</h2>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-500 text-ink">Días de alerta antes del deadline</p>
              <p className="text-xs text-muted">Notificar al equipo N días antes del vencimiento</p>
            </div>
            <input type="number" min={1} max={14} value={prefs.deadlineAlertDays} onChange={(e) => updPref("deadlineAlertDays", Number(e.target.value))} className="w-16 bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none text-center font-mono focus:border-primary/40" />
          </div>
          {[
            { key: "autoPublishReminder" as const, label: "Recordatorio automático de publicación", desc: "Preguntar si el contenido está listo antes de publicar" },
            { key: "requireApproval" as const, label: "Requerir aprobación de entregables", desc: "Los entregables deben pasar por revisión antes de marcarlos como aprobados" },
            { key: "clientPortalEnabled" as const, label: "Portal de clientes habilitado", desc: "Permitir que los clientes accedan a su portal" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-500 text-ink">{label}</p>
                <p className="text-xs text-muted">{desc}</p>
              </div>
              <button
                onClick={() => updPref(key, !prefs[key])}
                className={`relative w-11 h-6 rounded-full transition-all ${prefs[key] ? "bg-primary" : "bg-surface2 border border-line"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-ink transition-all ${prefs[key] ? "left-5.5" : "left-0.5"}`} style={{ left: prefs[key] ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>
          ))}
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Estado inicial de posts nuevos</label>
            <select value={prefs.defaultPostStatus} onChange={(e) => updPref("defaultPostStatus", e.target.value)} className="bg-surface2 border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer">
              {["idea","creation"].map((s) => <option key={s} value={s} className="bg-surface">{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted uppercase tracking-widest block mb-1.5">Inicio de semana</label>
            <div className="flex gap-2">
              {[{ key: "mon", label: "Lunes" }, { key: "sun", label: "Domingo" }].map((d) => (
                <button key={d.key} onClick={() => updPref("weekStart", d.key)} className={`text-xs font-mono px-4 py-2 rounded-lg border transition-all ${prefs.weekStart === d.key ? "bg-primary/10 text-primary border-primary/30" : "border-line text-muted hover:text-ink"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-display text-xl font-700 uppercase text-ink">Integraciones</h2>
        </div>
        <div className="divide-y divide-line">
          {integrations.map((intg, i) => (
            <div key={intg.name} className="flex items-center gap-4 px-5 py-4">
              <span className="text-2xl flex-shrink-0">{intg.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-500 text-ink">{intg.name}</p>
                <p className="text-xs text-muted">{intg.desc}</p>
              </div>
              <button
                onClick={() => setIntegrations((prev) => prev.map((it, j) => j === i ? { ...it, connected: !it.connected } : it))}
                className={`text-xs font-mono px-4 py-1.5 rounded-lg border transition-all ${intg.connected ? "text-success border-success/30 bg-success/5 hover:bg-success/10" : "text-muted border-line hover:text-ink"}`}
              >
                {intg.connected ? "Conectado ✓" : "Conectar"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Notification preferences */}
      <NotifPrefsSection />

      {/* Danger zone */}
      <section className="bg-surface border border-danger/20 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-danger/20">
          <h2 className="font-display text-xl font-700 uppercase text-danger">Zona de peligro</h2>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: "Limpiar caché de datos", desc: "Elimina los datos en caché del navegador", action: "Limpiar caché" },
            { label: "Exportar todos los datos", desc: "Descarga un JSON con toda la información de la plataforma", action: "Exportar datos" },
            { label: "Resetear la plataforma", desc: "Elimina todos los datos y reinicia la configuración (irreversible)", action: "Resetear", danger: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-500 text-ink">{item.label}</p>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
              <button className={`text-xs font-mono px-4 py-2 rounded-lg border transition-all ${item.danger ? "text-danger border-danger/30 hover:bg-danger/10" : "text-muted border-line hover:text-ink"}`}>
                {item.action}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
