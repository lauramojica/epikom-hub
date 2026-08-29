-- ===========================================================================
-- Epikom Ops Hub — Calendario de Contenido
-- Migración desde Notion "Redes Sociales"
-- 
-- Ejecutar DESPUÉS de supabase-complete-setup.sql
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- PART 1: Enums
-- ---------------------------------------------------------------------------

-- Estado del contenido (flujo de producción)
DO $$ BEGIN
  CREATE TYPE content_status AS ENUM (
    'idea',        -- Próximo mes, Pendiente
    'creacion',    -- Creación, Borrador, In progress
    'diseno',      -- Diseño Realizado
    'revision',    -- Revisión, Sent for approval
    'aprobado',    -- Aprobado
    'programado',  -- Programado
    'publicado'    -- Publicado
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Canal de publicación
DO $$ BEGIN
  CREATE TYPE content_channel AS ENUM (
    'facebook',
    'instagram',
    'fb_ig',
    'tiktok',
    'linkedin',
    'youtube',
    'email'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Formato de producción
DO $$ BEGIN
  CREATE TYPE content_format AS ENUM (
    'imagen',
    'carrusel',
    'video',
    'reel',
    'story',
    'foto',
    'texto',
    'evento',
    'shopper',
    'email'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Roles de usuario
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'superadmin',     -- Lau: todo + crea admins
    'admin',          -- puede asignar crew a clientes, ve/edita todo
    'crew',           -- solo lo que admin/superadmin le asigne
    'cliente'         -- externo, ve/edita/añade en su cuenta
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- PART 2: Tablas (sin RLS todavía)
-- ---------------------------------------------------------------------------

-- Clientes
CREATE TABLE IF NOT EXISTS hub_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT,
  idioma TEXT NOT NULL DEFAULT 'es',
  timezone TEXT NOT NULL DEFAULT 'America/Puerto_Rico',
  notas_marca TEXT,
  reglas_marca JSONB DEFAULT '{}',
  contactos JSONB DEFAULT '[]',
  notif_email BOOLEAN DEFAULT true,
  notif_sms BOOLEAN DEFAULT false,
  notif_whatsapp BOOLEAN DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hub_clients_slug_idx ON hub_clients(slug);
CREATE INDEX IF NOT EXISTS hub_clients_activo_idx ON hub_clients(activo);

-- Usuarios de cliente (externos)
CREATE TABLE IF NOT EXISTS client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES hub_clients(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  puesto TEXT,
  puede_aprobar BOOLEAN NOT NULL DEFAULT true,
  puede_editar BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  ultimo_acceso_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS client_users_user_idx ON client_users(user_id);
CREATE INDEX IF NOT EXISTS client_users_client_idx ON client_users(client_id);

-- Asignación de crew a clientes
CREATE TABLE IF NOT EXISTS crew_client_access (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES hub_clients(id) ON DELETE CASCADE,
  asignado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  puede_ver BOOLEAN NOT NULL DEFAULT true,
  puede_editar BOOLEAN NOT NULL DEFAULT true,
  puede_publicar BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS crew_client_access_user_idx ON crew_client_access(user_id);
CREATE INDEX IF NOT EXISTS crew_client_access_client_idx ON crew_client_access(client_id);

-- Publicaciones
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES hub_clients(id) ON DELETE RESTRICT,
  status content_status NOT NULL DEFAULT 'idea',
  canal content_channel,
  formato content_format,
  angulo TEXT,
  publica_at TIMESTAMPTZ,
  copy TEXT,
  marca_producto TEXT,
  asignado_a UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campana TEXT,
  hashtags TEXT[] DEFAULT '{}',
  boosted BOOLEAN NOT NULL DEFAULT false,
  notas TEXT,
  recordatorio_minutos INTEGER DEFAULT 120,
  archivos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_items_cliente_fecha_idx ON content_items(client_id, publica_at);
CREATE INDEX IF NOT EXISTS content_items_asignado_status_idx ON content_items(asignado_a, status);
CREATE INDEX IF NOT EXISTS content_items_status_idx ON content_items(status);
CREATE INDEX IF NOT EXISTS content_items_publica_at_idx ON content_items(publica_at);

-- Presupuesto de pauta
CREATE TABLE IF NOT EXISTS content_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  plataforma content_channel NOT NULL,
  presupuesto NUMERIC(10,2) NOT NULL,
  gasto_real NUMERIC(10,2),
  alcance NUMERIC(12,0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_boosts_item_idx ON content_boosts(content_item_id);

-- Historial de estados
CREATE TABLE IF NOT EXISTS content_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  de_status content_status,
  a_status content_status NOT NULL,
  cambiado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cambiado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_status_log_item_idx ON content_status_log(content_item_id);

-- Auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad TEXT NOT NULL,
  entidad_id UUID NOT NULL,
  accion TEXT NOT NULL,
  actor_id UUID,
  actor_nombre TEXT,
  actor_rol user_role,
  client_id UUID REFERENCES hub_clients(id) ON DELETE SET NULL,
  antes JSONB,
  despues JSONB,
  revertido_at TIMESTAMPTZ,
  revertido_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_entidad_idx ON audit_log(entidad, entidad_id, created_at);
CREATE INDEX IF NOT EXISTS audit_log_cliente_idx ON audit_log(client_id, created_at);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log(actor_id, created_at);

-- Settings de usuario
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'America/Puerto_Rico',
  inicio_semana INTEGER NOT NULL DEFAULT 1,
  idioma TEXT NOT NULL DEFAULT 'es',
  notif_push BOOLEAN NOT NULL DEFAULT true,
  notif_email BOOLEAN NOT NULL DEFAULT true,
  notif_sms BOOLEAN NOT NULL DEFAULT false,
  resumen_diario_min INTEGER DEFAULT 480,
  resumen_diario_activo BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- PART 3: Funciones helper (ANTES de RLS)
-- ---------------------------------------------------------------------------

-- Rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE id = auth.uid()),
    'crew'
  );
$$;

-- Cliente al que pertenece un usuario externo
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM client_users
  WHERE user_id = auth.uid()
    AND activo = true
  LIMIT 1;
$$;

-- ¿Es superadmin?
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT get_user_role() = 'superadmin';
$$;

-- ¿Es admin o superadmin?
CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT get_user_role() IN ('superadmin', 'admin');
$$;

-- ¿Es cliente externo?
CREATE OR REPLACE FUNCTION is_cliente_externo()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT get_user_client_id() IS NOT NULL;
$$;

-- ---------------------------------------------------------------------------
-- PART 4: RLS Policies (DESPUÉS de funciones)
-- ---------------------------------------------------------------------------

-- hub_clients
ALTER TABLE hub_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY hub_clients_select ON hub_clients
FOR SELECT USING (
  is_admin_or_above()
  OR id = get_user_client_id()
  OR (
    NOT is_cliente_externo()
    AND EXISTS (
      SELECT 1 FROM crew_client_access a
      WHERE a.user_id = auth.uid() AND a.client_id = hub_clients.id
    )
  )
);

CREATE POLICY hub_clients_write ON hub_clients
FOR ALL USING (is_admin_or_above()) WITH CHECK (is_admin_or_above());

-- crew_client_access
ALTER TABLE crew_client_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY crew_access_select ON crew_client_access
FOR SELECT USING (is_admin_or_above() OR user_id = auth.uid());

CREATE POLICY crew_access_write ON crew_client_access
FOR ALL USING (is_admin_or_above()) WITH CHECK (is_admin_or_above());

-- content_items
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_items_select ON content_items
FOR SELECT USING (
  is_admin_or_above()
  OR (is_cliente_externo() AND client_id = get_user_client_id())
  OR (
    NOT is_cliente_externo()
    AND (
      asignado_a = auth.uid()
      OR campana = 'national_rotacion'
      OR EXISTS (
        SELECT 1 FROM crew_client_access a
        WHERE a.user_id = auth.uid() AND a.client_id = content_items.client_id
      )
    )
  )
);

CREATE POLICY content_items_insert ON content_items
FOR INSERT WITH CHECK (
  is_admin_or_above()
  OR (is_cliente_externo() AND client_id = get_user_client_id())
  OR NOT is_cliente_externo()
);

CREATE POLICY content_items_update ON content_items
FOR UPDATE USING (
  is_admin_or_above()
  OR (is_cliente_externo() AND client_id = get_user_client_id())
  OR (NOT is_cliente_externo() AND (asignado_a = auth.uid() OR campana = 'national_rotacion'))
);

CREATE POLICY content_items_delete ON content_items
FOR DELETE USING (
  is_admin_or_above()
  OR (NOT is_cliente_externo() AND asignado_a = auth.uid())
);

-- content_boosts (cliente no ve presupuestos)
ALTER TABLE content_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_boosts_all ON content_boosts
FOR ALL USING (is_admin_or_above() OR NOT is_cliente_externo())
WITH CHECK (is_admin_or_above());

-- user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_settings_own ON user_settings
FOR ALL USING (user_id = auth.uid() OR is_admin_or_above())
WITH CHECK (user_id = auth.uid() OR is_admin_or_above());

-- audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select ON audit_log
FOR SELECT USING (
  is_admin_or_above()
  OR (is_cliente_externo() AND client_id = get_user_client_id())
);

CREATE POLICY audit_log_insert ON audit_log
FOR INSERT WITH CHECK (true);

-- client_users
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_users_select ON client_users
FOR SELECT USING (
  is_admin_or_above()
  OR user_id = auth.uid()
  OR client_id = get_user_client_id()
);

CREATE POLICY client_users_write ON client_users
FOR ALL USING (is_admin_or_above()) WITH CHECK (is_admin_or_above());

-- content_status_log
ALTER TABLE content_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_status_log_select ON content_status_log
FOR SELECT USING (
  is_admin_or_above()
  OR EXISTS (
    SELECT 1 FROM content_items ci
    WHERE ci.id = content_status_log.content_item_id
    AND (
      (is_cliente_externo() AND ci.client_id = get_user_client_id())
      OR ci.asignado_a = auth.uid()
    )
  )
);

-- ---------------------------------------------------------------------------
-- PART 5: Triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hub_clients_updated_at ON hub_clients;
CREATE TRIGGER hub_clients_updated_at
  BEFORE UPDATE ON hub_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS content_items_updated_at ON content_items;
CREATE TRIGGER content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION log_content_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO content_status_log (content_item_id, de_status, a_status, cambiado_por)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS content_items_status_log ON content_items;
CREATE TRIGGER content_items_status_log
  AFTER UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION log_content_status_change();

-- ---------------------------------------------------------------------------
-- PART 6: Vistas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW overdue_content AS
SELECT 
  ci.*,
  hc.nombre as cliente_nombre,
  hc.color as cliente_color,
  EXTRACT(DAY FROM now() - ci.publica_at) as dias_atraso
FROM content_items ci
JOIN hub_clients hc ON ci.client_id = hc.id
WHERE ci.status NOT IN ('publicado', 'idea')
  AND ci.publica_at < now()
ORDER BY ci.publica_at ASC;

CREATE OR REPLACE VIEW crew_workload AS
SELECT 
  ci.asignado_a as user_id,
  p.full_name,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE ci.publica_at < now()) as atrasados,
  COUNT(*) FILTER (WHERE ci.publica_at >= now() AND ci.publica_at < now() + interval '7 days') as esta_semana
FROM content_items ci
JOIN profiles p ON ci.asignado_a = p.id
WHERE ci.status NOT IN ('publicado', 'idea')
GROUP BY ci.asignado_a, p.full_name
ORDER BY total_items DESC;

-- ---------------------------------------------------------------------------
-- PART 7: Realtime
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE content_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE content_status_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================================================
-- FIN - Copia todo esto y pégalo en Supabase SQL Editor
-- ===========================================================================
