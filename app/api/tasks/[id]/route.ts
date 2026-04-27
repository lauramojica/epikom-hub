import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  title?: string;
  description?: string | null;
  due_date?: string;
  due_time?: string | null;
  task_type?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  notion_url?: string | null;
  context?: string | null;
  user_note?: string | null;
  assigned_to?: string;
  assignees?: string[]; // si presente, reemplaza la lista completa
  week_id?: string;
  clients?: string[];
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  // Authz: must be assignee, creator, or admin
  const { data: task } = await admin
    .from("tasks")
    .select("id, assigned_to, created_by")
    .eq("id", params.id)
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: "Tarea no existe" }, { status: 404 });
  }
  const { data: me } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isOwner =
    task.assigned_to === user.id || task.created_by === user.id;
  const isAdmin = me?.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) {
    updates.title = body.title.trim();
  }
  if (body.description !== undefined) {
    updates.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if (typeof body.due_date === "string") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    updates.due_date = body.due_date;
  }
  if (body.due_time !== undefined) {
    if (body.due_time === null || body.due_time === "") {
      updates.due_time = null;
    } else if (/^\d{2}:\d{2}(:\d{2})?$/.test(body.due_time)) {
      updates.due_time = body.due_time.length === 5 ? `${body.due_time}:00` : body.due_time;
    } else {
      return NextResponse.json({ error: "Hora inválida" }, { status: 400 });
    }
  }
  if (body.context !== undefined) {
    updates.context =
      typeof body.context === "string" && body.context.trim()
        ? body.context.trim()
        : null;
  }
  if (body.user_note !== undefined) {
    updates.user_note =
      typeof body.user_note === "string" && body.user_note.trim()
        ? body.user_note.trim()
        : null;
  }
  if (typeof body.task_type === "string" && body.task_type.trim()) {
    updates.task_type = body.task_type.trim();
  }
  if (body.priority && ["HIGH", "MEDIUM", "LOW"].includes(body.priority)) {
    updates.priority = body.priority;
  }
  if (body.notion_url !== undefined) {
    updates.notion_url =
      typeof body.notion_url === "string" && body.notion_url.trim()
        ? body.notion_url.trim()
        : null;
  }
  // Multi-asignados: si llega `assignees`, gana sobre `assigned_to`
  let newAssigneeIds: string[] | null = null;
  if (Array.isArray(body.assignees)) {
    newAssigneeIds = Array.from(
      new Set(
        body.assignees
          .map((a) => (typeof a === "string" ? a.trim() : ""))
          .filter((a) => a.length > 0)
      )
    );
    if (newAssigneeIds.length > 0) {
      // Validar que existen
      const { data: rows } = await admin
        .from("users")
        .select("id")
        .in("id", newAssigneeIds);
      if (!rows || rows.length !== newAssigneeIds.length) {
        return NextResponse.json(
          { error: "Algún asignado no existe" },
          { status: 400 }
        );
      }
      updates.assigned_to = newAssigneeIds[0];
    }
  } else if (typeof body.assigned_to === "string" && body.assigned_to.trim()) {
    updates.assigned_to = body.assigned_to.trim();
  }
  if (typeof body.week_id === "string" && body.week_id.trim()) {
    updates.week_id = body.week_id.trim();
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin
      .from("tasks")
      .update(updates)
      .eq("id", params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Replace clients if provided
  if (Array.isArray(body.clients)) {
    await admin.from("task_clients").delete().eq("task_id", params.id);
    const rows = body.clients
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .map((client_name) => ({ task_id: params.id, client_name }));
    if (rows.length > 0) {
      await admin.from("task_clients").insert(rows);
    }
  }

  // Replace assignees + notify newly added ones
  if (newAssigneeIds && newAssigneeIds.length > 0) {
    const { data: existing } = await admin
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", params.id);
    const existingIds = new Set((existing ?? []).map((r) => r.user_id));
    const newlyAdded = newAssigneeIds.filter((id) => !existingIds.has(id));

    await admin.from("task_assignees").delete().eq("task_id", params.id);
    await admin.from("task_assignees").insert(
      newAssigneeIds.map((user_id, idx) => ({
        task_id: params.id,
        user_id,
        is_primary: idx === 0,
      }))
    );

    const toNotify = newlyAdded.filter((id) => id !== user.id);
    if (toNotify.length > 0) {
      const { data: taskInfo } = await admin
        .from("tasks")
        .select("title")
        .eq("id", params.id)
        .maybeSingle();
      const { data: actor } = await admin
        .from("users")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      const actorName = actor?.name?.split(" ")[0] ?? "Alguien";
      await admin.from("notifications").insert(
        toNotify.map((uid) => ({
          user_id: uid,
          kind: "assign",
          title: `${actorName} te asignó: ${taskInfo?.title ?? "una tarea"}`,
          link: "/semana",
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: task } = await admin
    .from("tasks")
    .select("id, assigned_to, created_by")
    .eq("id", params.id)
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: "Tarea no existe" }, { status: 404 });
  }
  const { data: me } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isOwner =
    task.assigned_to === user.id || task.created_by === user.id;
  const isAdmin = me?.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  await admin.from("task_clients").delete().eq("task_id", params.id);
  const { error } = await admin.from("tasks").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
