export default function Home() {
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

        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-2">
          Entra con tu correo
        </h1>
        <p className="text-sm text-neutral-500 mb-8">
          Te enviamos un enlace mágico para firmar sesión.
        </p>

        <form className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="tu@epikom.com"
            disabled
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled
            className="w-full rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--brand-turquesa)" }}
          >
            Enviar enlace
          </button>
        </form>

        <p className="mt-8 text-xs text-neutral-400">
          Magic-link pendiente · Semana 1 en progreso
        </p>
      </div>
    </main>
  );
}
