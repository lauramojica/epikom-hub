import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";
import { EnablePushButton } from "@/components/EnablePushButton";

export const dynamic = "force-dynamic";

type NotifPrefs = {
  push?: boolean;
  email?: boolean;
  morning?: boolean;
  evening?: boolean;
};

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, phone, notification_preferences")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/");

  const firstName = profile.name.split(" ")[0];
  const prefs = (profile.notification_preferences ?? {}) as NotifPrefs;

  return (
    <AppShell role={profile.role} firstName={firstName}>
      <main className="px-4 py-6 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <div
              className="mb-2 text-xs uppercase"
              style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
            >
              Perfil
            </div>
            <h1
              className="text-3xl sm:text-4xl font-semibold"
              style={{ letterSpacing: "-0.02em", color: "var(--text)" }}
            >
              Tu cuenta
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-3)" }}>
              {profile.email} · {profile.role}
            </p>
          </div>

          <div
            className="mb-6 rounded-lg p-4"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="mb-1 text-[11px] font-medium uppercase"
              style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
            >
              Notificaciones del navegador
            </div>
            <p className="mb-3 text-xs" style={{ color: "var(--text-3)" }}>
              Te avisa cuando te asignan una tarea o cuando alguien te recuerda
              algo. Funciona aunque tengas el hub cerrado, mientras el navegador
              esté abierto.
            </p>
            <EnablePushButton />
          </div>

          <ProfileForm
            initialName={profile.name}
            initialPhone={profile.phone ?? ""}
            initialPrefs={{
              push: prefs.push ?? true,
              email: prefs.email ?? true,
              morning: prefs.morning ?? true,
              evening: prefs.evening ?? true,
            }}
          />
        </div>
      </main>
    </AppShell>
  );
}
