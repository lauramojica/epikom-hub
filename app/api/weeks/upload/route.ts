import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { weekUploadSchema } from "@/lib/validations/week-upload";

export async function POST(request: NextRequest) {
  // 1. Auth: must be logged-in admin.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Solo admin puede subir semanas" }, { status: 403 });
  }

  // 2. Parse body + check overwrite flag.
  const url = new URL(request.url);
  const overwrite = url.searchParams.get("overwrite") === "true";

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = weekUploadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Formato del JSON inválido",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 3. Resolve slugs → user UUIDs. Service role so we bypass RLS.
  const admin = createAdminClient();
  const slugs = Array.from(new Set(data.tareas.map((t) => t.asignado_a)));
  const { data: crew, error: crewErr } = await admin
    .from("users")
    .select("id, slug")
    .in("slug", slugs);

  if (crewErr) {
    return NextResponse.json(
      { error: "Error cargando crew", detail: crewErr.message },
      { status: 500 }
    );
  }

  const slugToId = new Map<string, string>(crew?.map((u) => [u.slug, u.id]) ?? []);
  const missing = slugs.filter((s) => !slugToId.has(s));
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "Hay slugs en el JSON sin user correspondiente en public.users",
        missing,
      },
      { status: 400 }
    );
  }

  // 4. Check existing week.
  const { data: existing } = await admin
    .from("weeks")
    .select("id")
    .eq("week_start_date", data.semana_inicio)
    .maybeSingle();

  if (existing && !overwrite) {
    return NextResponse.json(
      {
        error: "La semana ya existe",
        week_id: existing.id,
        hint: "Vuelve a enviar con ?overwrite=true para reemplazar",
      },
      { status: 409 }
    );
  }

  // 5. Overwrite path: delete existing week (cascades to tasks + task_clients).
  if (existing && overwrite) {
    const { error: delErr } = await admin.from("weeks").delete().eq("id", existing.id);
    if (delErr) {
      return NextResponse.json(
        { error: "No se pudo borrar la semana existente", detail: delErr.message },
        { status: 500 }
      );
    }
  }

  // 6. Insert week.
  const { data: week, error: weekErr } = await admin
    .from("weeks")
    .insert({
      week_start_date: data.semana_inicio,
      week_end_date: data.semana_fin,
      priorities: data.prioridades,
      deadlines: data.deadlines,
      rotation_national: data.rotacion_national ?? null,
      notes: data.notas ?? null,
      uploaded_by: user.id,
      raw_file: data,
    })
    .select("id")
    .single();

  if (weekErr || !week) {
    return NextResponse.json(
      { error: "No se pudo crear la semana", detail: weekErr?.message },
      { status: 500 }
    );
  }

  // 7. Insert tasks.
  const taskRows = data.tareas.map((t) => ({
    external_id: t.id_externo ?? null,
    week_id: week.id,
    title: t.titulo,
    description: t.descripcion ?? null,
    assigned_to: slugToId.get(t.asignado_a)!,
    due_date: t.fecha,
    task_type: t.tipo,
    priority: t.prioridad,
    notion_url: t.origen_notion ?? null,
  }));

  const { data: insertedTasks, error: tasksErr } = await admin
    .from("tasks")
    .insert(taskRows)
    .select("id");

  if (tasksErr || !insertedTasks) {
    // Roll back the week so we don't leave it dangling.
    await admin.from("weeks").delete().eq("id", week.id);
    return NextResponse.json(
      { error: "No se pudieron crear las tareas", detail: tasksErr?.message },
      { status: 500 }
    );
  }

  // 8. Insert task_clients (many-to-many).
  const clientRows = data.tareas.flatMap((t, idx) =>
    t.clientes.map((client) => ({
      task_id: insertedTasks[idx].id,
      client_name: client,
    }))
  );

  if (clientRows.length > 0) {
    const { error: clientsErr } = await admin.from("task_clients").insert(clientRows);
    if (clientsErr) {
      await admin.from("weeks").delete().eq("id", week.id);
      return NextResponse.json(
        { error: "No se pudieron asociar los clientes", detail: clientsErr.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    week_id: week.id,
    week_start_date: data.semana_inicio,
    week_end_date: data.semana_fin,
    tasks_created: insertedTasks.length,
    overwritten: Boolean(existing && overwrite),
  });
}
