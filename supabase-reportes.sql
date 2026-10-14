-- ============================================================================
-- REPORTES (reemplazo de Notion)
-- Espacios → tablas con columnas configurables → filas con página propia.
-- Se puede ejecutar más de una vez sin error.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------

-- Espacios / ramos de proyectos ("Tareas Websites", "Manejo de Redes Sociales")
CREATE TABLE IF NOT EXISTS report_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📁',
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Con quién se comparte cada espacio
CREATE TABLE IF NOT EXISTS report_space_members (
  space_id UUID NOT NULL REFERENCES report_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);

-- Tablas dentro de un espacio ("Mantenimiento", "Clientes y Redes Sociales")
-- columns: [{ id, name, type, options?, withTime? }]
--   type: text | url | date | number | select | checkbox | person
-- group_by: id de columna (o null). Si es fecha agrupa por mes; si es select, por opción.
-- template: contenido (JSON de Tiptap) con el que nace cada fila nueva
CREATE TABLE IF NOT EXISTS report_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES report_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  title_label TEXT NOT NULL DEFAULT 'Nombre',
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  group_by TEXT,
  sort_by TEXT,
  sort_desc BOOLEAN NOT NULL DEFAULT true,
  template JSONB,
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Filas. values: { columnId: valor }. content: documento de Tiptap.
CREATE TABLE IF NOT EXISTS report_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES report_tables(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  "values" JSONB NOT NULL DEFAULT '{}'::jsonb,
  content JSONB,
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID DEFAULT auth.uid(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_tables_space_idx ON report_tables(space_id);
CREATE INDEX IF NOT EXISTS report_rows_table_idx ON report_rows(table_id);
CREATE INDEX IF NOT EXISTS report_members_user_idx ON report_space_members(user_id);

CREATE OR REPLACE FUNCTION report_rows_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS report_rows_touch ON report_rows;
CREATE TRIGGER report_rows_touch BEFORE UPDATE ON report_rows
  FOR EACH ROW EXECUTE FUNCTION report_rows_touch();

-- ---------------------------------------------------------------------------
-- 2. Permisos
-- Admin y superadmin ven todo. El resto: lo que creó o lo que le compartieron.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION report_is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION report_can_read(p_space UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT report_is_admin()
    OR EXISTS (SELECT 1 FROM report_spaces s WHERE s.id = p_space AND s.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM report_space_members m WHERE m.space_id = p_space AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION report_can_edit(p_space UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT report_is_admin()
    OR EXISTS (SELECT 1 FROM report_spaces s WHERE s.id = p_space AND s.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM report_space_members m
               WHERE m.space_id = p_space AND m.user_id = auth.uid() AND m.role = 'editor');
$$;

-- Solo el dueño del espacio (o un admin) lo comparte, lo renombra o lo borra
CREATE OR REPLACE FUNCTION report_can_manage(p_space UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT report_is_admin()
    OR EXISTS (SELECT 1 FROM report_spaces s WHERE s.id = p_space AND s.created_by = auth.uid());
$$;

CREATE OR REPLACE FUNCTION report_table_space(p_table UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT space_id FROM report_tables WHERE id = p_table;
$$;

REVOKE EXECUTE ON FUNCTION report_is_admin(), report_can_read(UUID), report_can_edit(UUID),
  report_can_manage(UUID), report_table_space(UUID) FROM anon;

ALTER TABLE report_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_rows ENABLE ROW LEVEL SECURITY;

-- Espacios
-- created_by = auth.uid() va directo sobre la fila: al crear un espacio, la
-- consulta dentro de report_can_read() todavía no ve la fila nueva.
DROP POLICY IF EXISTS report_spaces_select ON report_spaces;
CREATE POLICY report_spaces_select ON report_spaces FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR report_can_read(id));
DROP POLICY IF EXISTS report_spaces_insert ON report_spaces;
CREATE POLICY report_spaces_insert ON report_spaces FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS report_spaces_update ON report_spaces;
CREATE POLICY report_spaces_update ON report_spaces FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR report_can_manage(id))
  WITH CHECK (created_by = auth.uid() OR report_can_manage(id));
DROP POLICY IF EXISTS report_spaces_delete ON report_spaces;
CREATE POLICY report_spaces_delete ON report_spaces FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR report_can_manage(id));

-- Miembros
DROP POLICY IF EXISTS report_members_select ON report_space_members;
CREATE POLICY report_members_select ON report_space_members FOR SELECT TO authenticated
  USING (report_can_read(space_id));
DROP POLICY IF EXISTS report_members_write ON report_space_members;
CREATE POLICY report_members_write ON report_space_members FOR ALL TO authenticated
  USING (report_can_manage(space_id)) WITH CHECK (report_can_manage(space_id));

-- Tablas
DROP POLICY IF EXISTS report_tables_select ON report_tables;
CREATE POLICY report_tables_select ON report_tables FOR SELECT TO authenticated
  USING (report_can_read(space_id));
DROP POLICY IF EXISTS report_tables_write ON report_tables;
CREATE POLICY report_tables_write ON report_tables FOR ALL TO authenticated
  USING (report_can_edit(space_id)) WITH CHECK (report_can_edit(space_id));

-- Filas
DROP POLICY IF EXISTS report_rows_select ON report_rows;
CREATE POLICY report_rows_select ON report_rows FOR SELECT TO authenticated
  USING (report_can_read(report_table_space(table_id)));
DROP POLICY IF EXISTS report_rows_write ON report_rows;
CREATE POLICY report_rows_write ON report_rows FOR ALL TO authenticated
  USING (report_can_edit(report_table_space(table_id)))
  WITH CHECK (report_can_edit(report_table_space(table_id)));

-- ---------------------------------------------------------------------------
-- 3. Editar una sola celda sin pisar las demás (dos personas a la vez)
-- SECURITY INVOKER: respeta las políticas de arriba.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION report_set_cell(p_row UUID, p_column TEXT, p_value JSONB)
RETURNS VOID
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE report_rows
  SET "values" = CASE
    WHEN p_value IS NULL OR p_value = 'null'::jsonb THEN "values" - p_column
    ELSE jsonb_set("values", ARRAY[p_column], p_value, true)
  END
  WHERE id = p_row;
$$;

REVOKE EXECUTE ON FUNCTION report_set_cell(UUID, TEXT, JSONB) FROM anon;

-- Acceso de la app (usuarios con sesión). El RLS de arriba decide qué filas.
GRANT SELECT, INSERT, UPDATE, DELETE ON report_spaces, report_space_members, report_tables, report_rows TO authenticated;
REVOKE ALL ON report_spaces, report_space_members, report_tables, report_rows FROM anon;
GRANT EXECUTE ON FUNCTION report_set_cell(UUID, TEXT, JSONB), report_is_admin(), report_can_read(UUID),
  report_can_edit(UUID), report_can_manage(UUID), report_table_space(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Imágenes pegadas en los reportes (bucket PRIVADO)
-- Ruta: <space_id>/<uuid>.<ext>. Se sirven por /api/reportes/media/...
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('report-media', 'report-media', false, 15728640,
        ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Espacio dueño de un archivo, o NULL. Nunca lanza error: las políticas de
-- storage.objects se evalúan también sobre archivos de otros buckets.
CREATE OR REPLACE FUNCTION report_path_space(p_name TEXT)
RETURNS UUID
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN split_part(p_name, '/', 1)::uuid
  END;
$$;

GRANT EXECUTE ON FUNCTION report_path_space(TEXT) TO authenticated;

DROP POLICY IF EXISTS report_media_select ON storage.objects;
CREATE POLICY report_media_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-media' AND COALESCE(report_can_read(report_path_space(name)), false));

DROP POLICY IF EXISTS report_media_insert ON storage.objects;
CREATE POLICY report_media_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-media' AND COALESCE(report_can_edit(report_path_space(name)), false));

DROP POLICY IF EXISTS report_media_delete ON storage.objects;
CREATE POLICY report_media_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-media' AND COALESCE(report_can_edit(report_path_space(name)), false));

-- ---------------------------------------------------------------------------
-- 5. Tiempo real para ver los cambios de los demás
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE report_rows;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

SELECT 'Reportes configurados ✓' AS status;
