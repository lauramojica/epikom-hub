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
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center gap-2 mb-8">
          <span
            className="inline-block w-6 h-6 rounded-md"
            style={{ background: "var(--brand-turquesa)" }}
          />
          <span className="text-lg font-semibold tracking-tight">
            epikom <span className="text-neutral-500 text-xs tracking-widest uppercase">hub</span>
          </span>
        </div>

        {status === "sent" ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-2">
              Revisa tu correo
            </h1>
            <p className="text-sm text-neutral-500 mb-2">
              Te enviamos un enlace a <strong className="text-neutral-700">{email}</strong>.
            </p>
            <p className="text-sm text-neutral-500">
              Haz click en el enlace para firmar sesión.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setEmail("");
              }}
              className="mt-6 text-xs text-neutral-400 underline underline-offset-2"
            >
              Usar otro correo
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-2">
              Entra con tu correo
            </h1>
            <p className="text-sm text-neutral-500 mb-8">
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
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-neutral-50 disabled:opacity-60"
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
              <p className="mt-4 text-xs text-red-600">
                {error}
              </p>
            )}

            <p className="mt-8 text-xs text-neutral-400">
              Solo crew de Epikom Interactive.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
