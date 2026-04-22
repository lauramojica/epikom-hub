import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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

  let body: { completed?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const completed = body.completed ?? true;

  // RLS `tasks_update_own` scopes this to the owner.
  const { error } = await supabase
    .from("tasks")
    .update({
      status: completed ? "completada" : "pendiente",
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
