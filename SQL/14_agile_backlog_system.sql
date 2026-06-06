-- ============================================================
-- SCRIPT 14: SISTEMA DE PERSISTENCIA PARA BACKLOG AGILE KANBAN
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- Crear tabla de backlogs
CREATE TABLE IF NOT EXISTS public.agile_backlogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spec_id UUID NOT NULL REFERENCES public.specifications(id) ON DELETE CASCADE,
    epic TEXT NOT NULL,
    user_stories JSONB NOT NULL DEFAULT '[]'::jsonb,
    backlog_markdown TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar permisos explícitos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agile_backlogs TO authenticated, service_role;
GRANT SELECT ON public.agile_backlogs TO anon;

SELECT 'Tabla agile_backlogs creada y permisos aplicados con éxito' as resultado;
