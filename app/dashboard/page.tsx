export default function Dashboard() {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="text-center">
        <div className="text-xs tracking-widest uppercase text-neutral-400 mb-2">
          Dashboard
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, crew.
        </h1>
        <p className="mt-3 text-sm text-neutral-500 max-w-sm">
          Pantalla protegida (placeholder). Se conecta a Supabase en Semana 1
          del plan.
        </p>
      </div>
    </main>
  );
}
