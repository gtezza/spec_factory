-- ============================================================
-- SCRIPT 11: CORRECCIÓN DE GOBERNANZA Y STORAGE
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- 1. Sincronización de Esquema de Triage
DO $$ 
BEGIN
    -- Añadir columna para archivos adjuntos si no existe
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'triage_requests' AND COLUMN_NAME = 'sample_files') THEN
        ALTER TABLE triage_requests ADD COLUMN sample_files JSONB DEFAULT '[]';
    END IF;

    -- Corregir llaves foráneas para apuntar a la tabla 'usuarios' local en lugar de 'auth.users'
    -- (Esto resuelve el error de integridad referencial si se usa el login personalizado)
    
    -- Eliminar constraints antiguos (basados en nombres estándar de Supabase/Postgres)
    ALTER TABLE triage_requests DROP CONSTRAINT IF EXISTS triage_requests_creator_id_fkey;
    ALTER TABLE triage_requests DROP CONSTRAINT IF EXISTS triage_requests_requester_id_fkey;
    ALTER TABLE triage_requests DROP CONSTRAINT IF EXISTS triage_requests_approver_id_fkey;

    -- Añadir nuevos constraints hacia la tabla usuarios
    ALTER TABLE triage_requests ADD CONSTRAINT triage_requests_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES usuarios(id);
    ALTER TABLE triage_requests ADD CONSTRAINT triage_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES usuarios(id);
    ALTER TABLE triage_requests ADD CONSTRAINT triage_requests_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES usuarios(id);

END $$;

-- 2. Configuración de Supabase Storage
-- Asegurar que el bucket exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('triage-samples', 'triage-samples', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas de Seguridad (RLS) para Storage
-- Primero eliminamos políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "Acceso publico de lectura triage-samples" ON storage.objects;
DROP POLICY IF EXISTS "Subida permitida triage-samples" ON storage.objects;
DROP POLICY IF EXISTS "Borrado permitido triage-samples" ON storage.objects;

-- Crear política de lectura (Pública)
CREATE POLICY "Acceso publico de lectura triage-samples"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'triage-samples');

-- Crear política de inserción (Permite a anon y auth para facilitar desarrollo inicial)
CREATE POLICY "Subida permitida triage-samples"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'triage-samples');

-- Crear política de borrado
CREATE POLICY "Borrado permitido triage-samples"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'triage-samples');

-- Notificar éxito
SELECT 'Estructura de Gobernanza y Storage actualizada correctamente' as resultado;
