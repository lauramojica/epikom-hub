"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

type Prefs = {
  push: boolean;
  email: boolean;
  morning: boolean;
  evening: boolean;
};

export function ProfileForm({
  initialName,
  initialPhone,
  initialPrefs,
}: {
  initialName: string;
  initialPhone: string;
  initialPrefs: Prefs;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, notification_preferences: prefs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <Card title="Información">
        <Field label="Nombre">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Teléfono (opcional)">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="787-000-0000"
            style={inputStyle}
          />
        </Field>
      </Card>

      <Card title="Notificaciones">
        <Toggle
          label="Push en el navegador / móvil"
          hint="Se activa cuando instales el Hub como app (PWA)."
          checked={prefs.push}
          onChange={(v) => setPrefs({ ...prefs, push: v })}
        />
        <Toggle
          label="Email"
          hint="Recibe recordatorios y resúmenes por email."
          checked={prefs.email}
          onChange={(v) => setPrefs({ ...prefs, email: v })}
        />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <Toggle
            label="Resumen de la mañana (9 AM)"
            hint="Tus tareas del día, L–V."
            checked={prefs.morning}
            onChange={(v) => setPrefs({ ...prefs, morning: v })}
          />
          <Toggle
            label="Cierre del día (5:30 PM)"
            hint="Qué quedó hecho, qué quedó pendiente."
            checked={prefs.evening}
            onChange={(v) => setPrefs({ ...prefs, evening: v })}
          />
        </div>
      </Card>

      {error && (
        <div
          className="rounded-md p-3 text-sm"
          style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-60"
          style={{ background: "var(--brand-turquesa)" }}
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {saved && (
          <span
            className="inline-flex items-center gap-1 text-sm fade-in"
            style={{ color: "var(--brand-turquesa)" }}
          >
            <Check size={14} strokeWidth={2.5} /> Guardado
          </span>
        )}
      </div>
    </form>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-5 space-y-4"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
      }}
    >
      <h2
        className="text-sm font-semibold"
        style={{ letterSpacing: "-0.01em", color: "var(--text)" }}
      >
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div
        className="mb-1.5 text-[11px] font-medium uppercase"
        style={{ letterSpacing: "0.04em", color: "var(--text-3)" }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer py-1">
      <div>
        <div className="text-sm" style={{ color: "var(--text)" }}>
          {label}
        </div>
        {hint && (
          <div className="mt-0.5 text-xs" style={{ color: "var(--text-3)" }}>
            {hint}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition"
        style={{
          background: checked ? "var(--brand-turquesa)" : "var(--bg-3)",
        }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{
            transform: checked ? "translateX(18px)" : "translateX(2px)",
          }}
        />
      </button>
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  padding: "8px 10px",
  fontSize: 14,
  color: "var(--text)",
  fontFamily: "inherit",
};
