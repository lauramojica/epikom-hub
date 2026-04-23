"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signInError) {
      setStatus("error");
      setError(signInError.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main
      className="min-h-screen grid place-items-center px-6"
      style={{ color: "var(--text)" }}
    >
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center gap-2 mb-8">
          <span
            className="inline-block w-6 h-6 rounded-md"
            style={{ background: "var(--brand-turquesa)" }}
          />
          <span className="text-lg font-semibold tracking-tight">
            epikom{" "}
            <span
              className="text-xs uppercase"
              style={{ letterSpacing: "0.12em", color: "var(--text-3)" }}
            >
              hub
            </span>
          </span>
        </div>

        {status === "sent" ? (
          <>
            <h1
              className="text-2xl font-semibold tracking-tight mb-2"
              style={{ color: "var(--text)" }}
            >
              Revisa tu correo
            </h1>
            <p className="text-sm mb-2" style={{ color: "var(--text-3)" }}>
              Te enviamos un enlace a{" "}
              <strong style={{ color: "var(--text)" }}>{email}</strong>.
            </p>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              Haz click en el enlace para firmar sesión.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setEmail("");
              }}
              className="mt-6 text-xs underline underline-offset-2"
              style={{ color: "var(--text-3)" }}
            >
              Usar otro correo
            </button>
          </>
        ) : (
          <>
            <h1
              className="text-2xl font-semibold tracking-tight mb-2"
              style={{ color: "var(--text)" }}
            >
              Entra con tu correo
            </h1>
            <p className="text-sm mb-8" style={{ color: "var(--text-3)" }}>
              Te enviamos un enlace mágico para firmar sesión.
            </p>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@epikom.com"
                disabled={status === "sending"}
                className="w-full rounded-md px-3 py-2 text-sm focus:outline-none disabled:opacity-60"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
              <button
                type="submit"
                disabled={status === "sending" || !email}
                className="w-full rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--brand-turquesa)" }}
              >
                {status === "sending" ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>

            {error && (
              <p className="mt-4 text-xs" style={{ color: "var(--warn)" }}>
                {error}
              </p>
            )}

            <p
              className="mt-8 text-xs"
              style={{ color: "var(--text-3)" }}
            >
              Solo crew de Epikom Interactive.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
