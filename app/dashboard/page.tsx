import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = profile?.name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "crew";
  const today = new Intl.DateTimeFormat("es-PR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Puerto_Rico",
  }).format(new Date());

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="text-center">
        <div className="text-xs tracking-widest uppercase text-neutral-400 mb-2">
          {today}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {firstName}.
        </h1>
        {profile?.role ? (
          <p className="mt-3 text-sm text-neutral-500 max-w-sm">
            Sesión iniciada como <strong>{profile.role}</strong>. Esto es el esqueleto —
            las tareas llegan en Semana 2.
          </p>
        ) : (
          <p className="mt-3 text-sm text-neutral-500 max-w-sm">
            Tu cuenta existe en Auth, pero todavía no hay perfil en <code>public.users</code>.
            Corre <code>seed-crew.sql</code>.
          </p>
        )}

        <form action="/auth/signout" method="post" className="mt-8">
          <button
            type="submit"
            className="text-xs text-neutral-400 underline underline-offset-2"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
