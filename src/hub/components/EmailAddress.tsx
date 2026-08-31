"use client";
import { useState } from "react";

/**
 * Muestra la dirección de email de una cuenta o proyecto,
 * con botón para copiarla.
 */
export default function EmailAddress({ slug, token, label, hint, kind, entityId, onRegenerated }: {
  slug: string;
  token: string | null | undefined;
  label?: string;
  hint?: string;
  kind?: "client" | "project";
  entityId?: string;
  onRegenerated?: (token: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [current, setCurrent] = useState(token);
  const [working, setWorking] = useState(false);

  const base = process.env.NEXT_PUBLIC_EMAIL_INTAKE_ADDRESS ?? "notifications@epikom.com";
  const [local, domain] = base.split("@");
  const address = current ? `${local}+${slug}-${current}@${domain}` : null;

  const regenerate = async (isNew: boolean) => {
    if (!kind || !entityId) return;
    if (!isNew && !confirm("¿Generar una dirección nueva? La anterior dejará de funcionar.")) return;
    setWorking(true);
    try {
      const res = await fetch("/api/email/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id: entityId }),
      });
      const j = await res.json();
      if (j.token) { setCurrent(j.token); onRegenerated?.(j.token); }
    } finally { setWorking(false); }
  };

  // Sin dirección todavía: ofrecer generarla
  if (!address) {
    if (!kind || !entityId) return null;
    return (
      <div className="bg-surface2 border border-line rounded-lg px-3 py-2.5">
        <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1.5">
          {label ?? "Email de esta cuenta"}
        </p>
        <p className="text-[11px] text-muted mb-2.5 leading-relaxed">
          Genera una dirección para crear tareas mandando correos aquí.
        </p>
        <button
          onClick={() => regenerate(true)}
          disabled={working}
          className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-primary text-bg font-600 hover:opacity-90 disabled:opacity-50"
        >
          {working ? "Generando…" : "Generar dirección"}
        </button>
      </div>
    );
  }

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface2 border border-line rounded-lg px-3 py-2.5">
      <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1.5">
        {label ?? "Email de esta cuenta"}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-[11px] font-mono text-ink break-all leading-snug">{address}</code>
        <button
          onClick={copy}
          className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
            copied ? "border-primary/50 text-primary bg-primary/10" : "border-line text-muted hover:text-primary hover:border-primary/40"
          }`}
        >
          {copied ? "✓ copiada" : "copiar"}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <p className="text-[10px] text-muted leading-relaxed flex-1">
          {hint ?? "Lo que escribas a esta dirección se convierte en una tarea aquí."}
        </p>
        {kind && entityId && (
          <button
            onClick={() => regenerate(false)}
            disabled={working}
            title="Generar una dirección nueva"
            className="text-[10px] font-mono text-muted hover:text-primary transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {working ? "…" : "regenerar"}
          </button>
        )}
      </div>
    </div>
  );
}
