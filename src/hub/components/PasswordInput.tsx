"use client";
import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function PasswordInput({
  value, onChange, onKeyDown, placeholder = "••••••••",
  autoComplete = "current-password", autoFocus, className, disabled,
}: Props) {
  const [visible, setVisible] = useState(false);

  const base = "w-full bg-surface2 border border-line rounded-lg pl-3 pr-10 py-2.5 text-sm text-ink outline-none focus:border-primary/40 font-body placeholder:text-muted/50";

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        className={className ?? base}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        title={visible ? "Ocultar" : "Mostrar"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors p-1"
      >
        {visible ? (
          // Ojo tachado
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6.7 3.2A6.5 6.5 0 018 3c3.3 0 6 3 6.5 5-.2.8-.9 2-2 3M4.4 4.6C2.9 5.7 1.7 7.3 1.5 8c.5 2 3.2 5 6.5 5 1.1 0 2.1-.3 3-.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M6.6 6.6a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ) : (
          // Ojo abierto
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        )}
      </button>
    </div>
  );
}
