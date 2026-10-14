import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SAFE_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,5}$/i;

/**
 * Sirve las imágenes de los reportes desde el bucket privado.
 * Descarga con la sesión de quien la pide, así que las políticas de
 * storage deciden: si no tiene acceso al espacio, recibe 404.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");
  if (!SAFE_PATH.test(key)) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase.storage.from("report-media").download(key);
  if (error || !data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      // El nombre es un UUID: el contenido nunca cambia
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
