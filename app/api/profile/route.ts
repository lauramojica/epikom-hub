import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  name?: string;
  phone?: string;
  notification_preferences?: Record<string, boolean>;
};

export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length > 0) {
    updates.name = body.name.trim();
  }
  if (typeof body.phone === "string") {
    updates.phone = body.phone.trim() || null;
  }
  if (
    body.notification_preferences &&
    typeof body.notification_preferences === "object"
  ) {
    updates.notification_preferences = body.notification_preferences;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  // RLS `users_update_own` scopes this to auth.uid() = id
  const { error } = await supabase.from("users").update(updates).eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
