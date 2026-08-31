"use client";
import { useState } from "react";

/**
 * Muestra la dirección de email de una cuenta o proyecto,
 * con botón para copiarla.
 */
export default function EmailAddress({ slug, token, label, hint }: {
  slug: string;
  token: string | null | undefined;
  label?: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  const base = process.env.NEXT_PUBLIC_EMAIL_INTAKE_ADDRESS ?? "notifications@epikom.com";
  const [local, domain] = base.split("@");
  const address = token ? `${local}+${slug}-${token}@${domain}` : null;

  if (!address) return null;

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
      <p className="text-[10px] text-muted mt-1.5 leading-relaxed">
        {hint ?? "Lo que escribas a esta dirección se convierte en una tarea aquí."}
      </p>
    </div>
  );
}
