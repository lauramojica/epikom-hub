import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  title?: string;
  description?: string | null;
  assigned_to?: string;
  assignees?: string[]; // multi-asignados; primero = primary; si se pasa, gana sobre assigned_to
  due_date?: string; // YYYY-MM-DD
  due_time?: string | null; // HH:MM or HH:MM:SS
  task_type?: string;
  task_types?: string[]; // multi-tipo / tags free-form
  priority?: "HIGH" | "MEDIUM" | "LOW";
  notion_url?: string | null;
  context?: string | null;
  clients?: string[];
  week_id?: string;
};

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

  const title = (body.title ?? "").trim();
  // Multi-asignados: si llega `assignees`, usar eso. Si no, fallback a assigned_to.
  const assigneeIds = Array.from(
    new Set(
      (Array.isArray(body.assignees) ? body.assignees : [])
        .map((a) => (typeof a === "string" ? a.trim() : ""))
        .filter((a) => a.length > 0)
    )
  );
  const assigned_to = (
    assigneeIds[0] ?? body.assigned_to ?? ""
  ).trim();
  if (assigneeIds.length === 0 && assigned_to) {
    assigneeIds.push(assigned_to);
  }
  const due_date = (body.due_date ?? "").trim();
  // Multi-tipo / tags free-form
  const taskTypes = Array.from(
    new Set(
      (Array.isArray(body.task_types) ? body.task_types : [])
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter((t) => t.length > 0 && t.length <= 40)
    )
  );
  const task_type =
    taskTypes[0] ?? ((body.task_type ?? "").trim() || "General");
  if (taskTypes.length === 0) taskTypes.push(task_type);
  const priority = body.priority ?? "MEDIUM";
  const week_id = (body.week_id ?? "").trim();

  if (!title) return NextResponse.json({ error: "Falta título" }, { status: 400 });
  if (!assigned_to) return NextResponse.json({ error: "Falta asignado" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }
  if (!["HIGH", "MEDIUM", "LOW"].includes(priority)) {
    return NextResponse.json({ error: "Prioridad inválida" }, { status: 400 });
  }
  if (!week_id) return NextResponse.json({ error: "Falta week_id" }, { status: 400 });

  const admin = createAdminClient();

  // Validate week + todos los asignados existen
  const [{ data: week }, { data: assigneeRows }] = await Promise.all([
    admin.from("weeks").select("id").eq("id", week_id).maybeSingle(),
    admin.from("users").select("id, name").in("id", assigneeIds),
  ]);
  if (!week) return NextResponse.json({ error: "Semana no existe" }, { status: 400 });
  if (!assigneeRows || assigneeRows.length !== assigneeIds.length) {
    return NextResponse.json({ error: "Algún asignado no existe" }, { status: 400 });
  }

  let due_time: string | null = null;
  if (body.due_time) {
    const v = body.due_time.trim();
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(v)) {
      return NextResponse.json({ error: "Hora inválida" }, { status: 400 });
    }
    due_time = v.length === 5 ? `${v}:00` : v;
  }

  const { data: inserted, error } = await admin
    .from("tasks")
    .insert({
      title,
      description: body.description?.trim() || null,
      assigned_to,
      due_date,
      due_time,
      task_type,
      task_types: taskTypes,
      priority,
      status: "pendiente",
      notion_url: body.notion_url?.trim() || null,
      context: body.context?.trim() || null,
      week_id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Error al crear" },
      { status: 500 }
    );
  }

  const clients = (body.clients ?? [])
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  if (clients.length > 0) {
    const rows = clients.map((client_name) => ({
      task_id: inserted.id,
      client_name,
    }));
    await admin.from("task_clients").insert(rows);
  }

  // Insertar todos los asignados en task_assignees (primero = primary)
  const assigneeRowsToInsert = assigneeIds.map((user_id, idx) => ({
    task_id: inserted.id,
    user_id,
    is_primary: idx === 0,
  }));
  if (assigneeRowsToInsert.length > 0) {
    await admin.from("task_assignees").insert(assigneeRowsToInsert);
  }

  // Notify cada asignado distinto del creador
  const toNotify = assigneeIds.filter((id) => id !== user.id);
  if (toNotify.length > 0) {
    const { data: creator } = await admin
      .from("users")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();
    const creatorName = creator?.name?.split(" ")[0] ?? "Alguien";

    await admin.from("notifications").insert(
      toNotify.map((uid) => ({
        user_id: uid,
        kind: "assign",
        title: `${creatorName} te asignó: ${title}`,
        body: clients.length > 0 ? clients.join(" · ") : null,
        link: "/semana",
      }))
    );
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
