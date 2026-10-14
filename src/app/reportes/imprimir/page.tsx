import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintView from "@/hub/reportes/PrintView";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * /reportes/imprimir?table=<id>&rows=<id>,<id>
 * Lee con la sesión del usuario: el RLS decide qué puede ver.
 */
export default async function PrintPage({ searchParams }: { searchParams: Promise<{ table?: string; rows?: string }> }) {
  const { table: tableId, rows: rowsParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!tableId || !UUID.test(tableId)) return <p className="p-8">Falta la tabla.</p>;
  const ids = (rowsParam ?? "").split(",").filter((id) => UUID.test(id)).slice(0, 200);

  const [{ data: table }, { data: rows }, { data: users }] = await Promise.all([
    supabase.from("report_tables").select("*").eq("id", tableId).maybeSingle(),
    ids.length
      ? supabase.from("report_rows").select("*").eq("table_id", tableId).in("id", ids)
      : supabase.from("report_rows").select("*").eq("table_id", tableId).order("position"),
    supabase.from("users").select("id, name, email"),
  ]);

  if (!table) return <p className="p-8">No encontrado o sin acceso.</p>;

  // Respetar el orden en que se pidieron (el de la tabla en pantalla)
  const ordered = ids.length
    ? ids.map((id) => (rows ?? []).find((r) => r.id === id)).filter(Boolean)
    : rows ?? [];

  const { data: space } = await supabase.from("report_spaces").select("name").eq("id", table.space_id).maybeSingle();

  return (
    <PrintView
      spaceName={space?.name ?? ""}
      table={{ name: table.name, icon: table.icon, titleLabel: table.title_label, columns: table.columns ?? [] }}
      rows={ordered.map((r) => ({ id: r!.id, title: r!.title, values: r!.values ?? {}, content: r!.content }))}
      people={Object.fromEntries((users ?? []).map((u) => [u.id, u.name || u.email]))}
    />
  );
}
