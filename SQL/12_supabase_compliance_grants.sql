-- ============================================================
-- SCRIPT 12: CUMPLIMIENTO DE POLÍTICAS DE ACCESO SUPABASE 2026
-- Ejecutar en: Supabase → SQL Editor o mediante migraciones
-- ============================================================

-- 1. Permisos explícitos para la tabla 'glosario'
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosario TO authenticated, service_role;
GRANT SELECT ON public.glosario TO anon;

-- 2. Permisos explícitos para la tabla 'spec_history'
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spec_history TO authenticated, service_role;
GRANT SELECT ON public.spec_history TO anon;

-- Notificar éxito
SELECT 'Permisos de cumplimiento Supabase 2026 aplicados con éxito' as resultado;
