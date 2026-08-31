import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Invita a una persona nueva al Hub con un rol asignado */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Debe poder gestionar roles o asignar crew
  const { data: me } = await supabase
    .from("users").select("role").eq("id", user.id).single();
  const { data: myRole } = await supabase
    .from("hub_roles").select("permissions").eq("key", me?.role ?? "").single();
  const perms = (myRole?.permissions ?? {}) as Record<string, boolean>;
  if (!perms["roles.manage"] && !perms["crew.assign"]) {
    return NextResponse.json({ error: "No tienes permiso para invitar personas" }, { status: 403 });
  }

  const { email, name, role, clientId } = await request.json() as {
    email: string; name: string; role: string; clientId?: string;
  };

  if (!email?.trim() || !name?.trim() || !role) {
    return NextResponse.json({ error: "Faltan datos (email, nombre y rol)" }, { status: 400 });
  }

  // Solo un superadmin puede crear otros superadmins
  if (role === "superadmin" && !perms["roles.manage"]) {
    return NextResponse.json({ error: "Solo un superadmin puede crear otro superadmin" }, { status: 403 });
  }

  const admin = adminClient();

  // ¿Ya existe?
  const { data: existing } = await admin
    .from("users").select("id, email").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
  }

  const origin = new URL(request.url).origin;

  // Invitación por email de Supabase (crea el usuario y le manda el enlace)
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: { name: name.trim(), role },
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    }
  );

  if (inviteErr) {
    // Si el email falla (SMTP no configurado), creamos la cuenta igual
    // para que la persona pueda entrar con "olvidé mi contraseña".
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      email_confirm: true,
      user_metadata: { name: name.trim(), role },
    });
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }
    await syncProfile(admin, created.user!.id, email, name, role, clientId);
    return NextResponse.json({
      ok: true,
      emailSent: false,
      note: "Cuenta creada, pero el email de invitación no salió. La persona puede entrar usando '¿Olvidaste tu contraseña?'.",
    });
  }

  await syncProfile(admin, invited.user!.id, email, name, role, clientId);
  return NextResponse.json({ ok: true, emailSent: true });
}

/** Asegura la fila en users con el rol correcto (el trigger puede no tener todo) */
async function syncProfile(
  admin: ReturnType<typeof adminClient>,
  userId: string, email: string, name: string, role: string, clientId?: string
) {
  await admin.from("users").upsert({
    id: userId,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
  }, { onConflict: "id" });

  // Si es cliente externo, vincularlo a su cuenta
  if (clientId) {
    await admin.from("client_users").upsert({
      user_id: userId,
      client_id: clientId,
      nombre: name.trim(),
      email: email.trim().toLowerCase(),
    }, { onConflict: "user_id,client_id" });
  }
}

/** Elimina a una persona del Hub */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  const { data: myRole } = await supabase
    .from("hub_roles").select("permissions").eq("key", me?.role ?? "").single();
  if (!(myRole?.permissions as Record<string, boolean>)?.["roles.manage"]) {
    return NextResponse.json({ error: "Solo quien gestiona roles puede eliminar personas" }, { status: 403 });
  }

  const { userId } = await request.json();
  if (userId === user.id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti misma" }, { status: 400 });
  }

  const admin = adminClient();

  // No dejar el sistema sin superadmins
  const { data: target } = await admin.from("users").select("role").eq("id", userId).single();
  if (target?.role === "superadmin") {
    const { count } = await admin.from("users")
      .select("id", { count: "exact", head: true }).eq("role", "superadmin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "No puedes eliminar al último superadmin" }, { status: 400 });
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
