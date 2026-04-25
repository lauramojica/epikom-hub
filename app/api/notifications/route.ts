import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationRow = {
  id: string;
  kind: "assign" | "mention" | "standup" | "deadline" | "approval" | "note";
  title: string;
  body: string | null;
  link: string | null;
  unread: boolean;
  created_at: string;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id, kind, title, body, link, unread, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ notifications: data ?? [] });
}

// PATCH /api/notifications  body: { action: "read-all" }
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body: { action?: string } = {};
  try {
    body = await request.json();
  } catch {}

  if (body.action !== "read-all") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ unread: false })
    .eq("user_id", user.id)
    .eq("unread", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
