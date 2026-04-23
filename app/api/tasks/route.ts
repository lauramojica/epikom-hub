import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  title?: string;
  description?: string | null;
  assigned_to?: string;
  due_date?: string; // YYYY-MM-DD
  task_type?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  notion_url?: string | null;
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
  const assigned_to = (body.assigned_to ?? "").trim();
  const due_date = (body.due_date ?? "").trim();
  const task_type = (body.task_type ?? "").trim() || "General";
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

  // Validate week + assignee exist
  const [{ data: week }, { data: assignee }] = await Promise.all([
    admin.from("weeks").select("id").eq("id", week_id).maybeSingle(),
    admin.from("users").select("id").eq("id", assigned_to).maybeSingle(),
  ]);
  if (!week) return NextResponse.json({ error: "Semana no existe" }, { status: 400 });
  if (!assignee) return NextResponse.json({ error: "Usuario asignado no existe" }, { status: 400 });

  const { data: inserted, error } = await admin
    .from("tasks")
    .insert({
      title,
      description: body.description?.trim() || null,
      assigned_to,
      due_date,
      task_type,
      priority,
      status: "pendiente",
      notion_url: body.notion_url?.trim() || null,
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

  return NextResponse.json({ ok: true, id: inserted.id });
}
