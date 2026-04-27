import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Devuelve la lista única de task_types usados en el sistema, ordenados por
 * frecuencia (más usados primero). Usado por el TagInput como autocomplete.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .select("task_types, task_type")
    .limit(2000);

  if (error) {
    return NextResponse.json({ types: [] });
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const list: string[] =
      Array.isArray(row.task_types) && row.task_types.length > 0
        ? row.task_types
        : row.task_type
        ? [row.task_type]
        : [];
    for (const t of list) {
      const v = (t ?? "").trim();
      if (!v) continue;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }

  const types = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t);

  return NextResponse.json({ types });
}
