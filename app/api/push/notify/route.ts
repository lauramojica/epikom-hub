import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

type Body = {
  user_ids?: string[];
  task_id?: string; // si presente, manda push a todos los asignados
  title?: string;
  body?: string;
  url?: string;
  also_in_app?: boolean; // crear notificación in-app además del push
};

/**
 * Envía push manual a uno o varios usuarios. Solo admin puede mandar a otros;
 * un crew member solo puede mandárselo a sí mismo (test).
 */
export async function POST(request: NextRequest) {
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

  const admin = createAdminClient();
  const { data: me } = await admin
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = me?.role === "admin";

  // Resolver destinatarios
  let userIds: string[] = [];
  if (Array.isArray(body.user_ids) && body.user_ids.length > 0) {
    userIds = body.user_ids.filter((u) => typeof u === "string" && u.trim());
  } else if (body.task_id) {
    const { data: rows } = await admin
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", body.task_id);
    userIds = (rows ?? []).map((r) => r.user_id);
  }

  if (userIds.length === 0) {
    return NextResponse.json(
      { error: "Sin destinatarios" },
      { status: 400 }
    );
  }

  // Authz: si no es admin, solo puede mandarse a sí mismo
  if (!isAdmin) {
    if (userIds.length !== 1 || userIds[0] !== user.id) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
  }

  const title = (body.title ?? "").trim() || "Epikom Hub";
  const text = (body.body ?? "").trim();
  const url = (body.url ?? "/dashboard").trim();

  const result = await pushToUsers(userIds, { title, body: text, url });

  // Opcional: también crear notificación in-app
  if (body.also_in_app !== false) {
    const actorName = me?.name?.split(" ")[0] ?? "Hub";
    await admin.from("notifications").insert(
      userIds.map((uid) => ({
        user_id: uid,
        kind: "ping",
        title,
        body: text || `Ping de ${actorName}`,
        link: url,
      }))
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
