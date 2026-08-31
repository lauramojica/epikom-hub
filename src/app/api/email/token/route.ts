import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/gmail";

export const dynamic = "force-dynamic";

/** Genera (o regenera) la dirección de email de una cuenta o proyecto */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single();
  const { data: role } = await supabase.from("hub_roles").select("permissions").eq("key", me?.role ?? "").single();
  const perms = (role?.permissions ?? {}) as Record<string, boolean>;
  if (!perms["clients.edit"] && !perms["workshop.manage"]) {
    return NextResponse.json({ error: "No tienes permiso para esto" }, { status: 403 });
  }

  const { kind, id } = await request.json() as { kind: "client" | "project"; id: string };
  const table = kind === "project" ? "projects" : "hub_clients";

  const token = Math.random().toString(36).slice(2, 8);
  const db = adminDb();
  const { error } = await db.from(table).update({ email_token: token }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, token });
}
