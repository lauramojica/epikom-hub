"use client";

import { useState } from "react";

type Result =
  | { kind: "success"; weekStart: string; tasksCreated: number; overwritten: boolean }
  | { kind: "conflict"; weekId: string; raw: string }
  | { kind: "error"; message: string; detail?: string; issues?: { path: string; message: string }[]; missing?: string[] };

export default function AdminUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "uploading">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function upload(overwrite = false) {
    if (!file) return;
    setStatus("reading");
    setResult(null);

    let payload: unknown;
    try {
      const text = await file.text();
      payload = JSON.parse(text);
    } catch (err) {
      setStatus("idle");
      setResult({
        kind: "error",
        message: "El archivo no es JSON válido",
        detail: err instanceof Error ? err.message : undefined,
      });
      return;
    }

    setStatus("uploading");
    const res = await fetch(`/api/weeks/upload${overwrite ? "?overwrite=true" : ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setStatus("idle");

    if (res.ok) {
      setResult({
        kind: "success",
        weekStart: body.week_start_date,
        tasksCreated: body.tasks_created,
        overwritten: body.overwritten,
      });
      return;
    }

    if (res.status === 409) {
      setResult({ kind: "conflict", weekId: body.week_id, raw: body.error });
      return;
    }

    setResult({
      kind: "error",
      message: body.error ?? "Error desconocido",
      detail: body.detail,
      issues: body.issues,
      missing: body.missing,
    });
  }

  return (
    <main
      className="min-h-screen px-6 py-16"
      style={{ color: "var(--text)" }}
    >
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <div
            className="mb-1 text-xs uppercase"
            style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
          >
            admin · upload
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            Subir semana
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-3)" }}>
            Arrastra o selecciona el JSON generado con Claude. Crea la semana,
            las tareas y sus clientes en una sola operación.
          </p>
        </div>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center cursor-pointer transition"
          style={{
            borderColor: dragOver
              ? "var(--brand-turquesa)"
              : "var(--border)",
            background: dragOver ? "var(--brand-turquesa-soft)" : "transparent",
          }}
        >
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div className="text-sm" style={{ color: "var(--text-2)" }}>
            {file ? (
              <>
                <strong style={{ color: "var(--text)" }}>{file.name}</strong>{" "}
                <span style={{ color: "var(--text-3)" }}>
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </>
            ) : (
              "Suelta el JSON aquí o haz click para elegir"
            )}
          </div>
          <div className="text-xs" style={{ color: "var(--text-3)" }}>
            Debe cumplir el formato de <code>semana-YYYY-MM-DD.json</code>
          </div>
        </label>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            disabled={!file || status !== "idle"}
            onClick={() => upload(false)}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--brand-turquesa)" }}
          >
            {status === "idle" ? "Subir semana" : status === "reading" ? "Leyendo…" : "Subiendo…"}
          </button>
          {file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setResult(null);
              }}
              className="rounded-md px-4 py-2 text-sm"
              style={{ color: "var(--text-2)" }}
            >
              Limpiar
            </button>
          )}
        </div>

        {result && (
          <div className="mt-8">
            {result.kind === "success" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <strong>Semana creada.</strong>
                <div className="mt-1 text-emerald-800">
                  {result.tasksCreated} tareas para la semana del {result.weekStart}
                  {result.overwritten && " (sobrescribiste la anterior)"}.
                </div>
              </div>
            )}

            {result.kind === "conflict" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>La semana ya existe.</strong>
                <div className="mt-1 text-amber-800">
                  Ya hay una semana subida con ese <code>semana_inicio</code>. ¿Reemplazarla? Se
                  borran las tareas viejas y se crean las nuevas.
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => upload(true)}
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Sobrescribir
                  </button>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="rounded-md px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {result.kind === "error" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <strong>{result.message}</strong>
                {result.detail && (
                  <div className="mt-1 text-red-800 font-mono text-xs">{result.detail}</div>
                )}
                {result.missing && result.missing.length > 0 && (
                  <div className="mt-2 text-red-800">
                    Falta crear estos crew en <code>public.users</code>:{" "}
                    <strong>{result.missing.join(", ")}</strong>
                  </div>
                )}
                {result.issues && result.issues.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-xs text-red-800 space-y-0.5">
                    {result.issues.map((i, idx) => (
                      <li key={idx}>
                        <code>{i.path}</code>: {i.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-10 text-xs" style={{ color: "var(--text-3)" }}>
          <a href="/dashboard" className="underline underline-offset-2">
            ← volver al dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
