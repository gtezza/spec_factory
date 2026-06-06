-- ============================================================
-- SCRIPT 13: AGREGAR COLUMNAS FALTANTES A TRIAGE_REQUESTS
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- Añadir columnas faltantes si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'triage_requests' AND COLUMN_NAME = 'goal') THEN
        ALTER TABLE triage_requests ADD COLUMN goal TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'triage_requests' AND COLUMN_NAME = 'risks') THEN
        ALTER TABLE triage_requests ADD COLUMN risks JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'triage_requests' AND COLUMN_NAME = 'questions') THEN
        ALTER TABLE triage_requests ADD COLUMN questions JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'triage_requests' AND COLUMN_NAME = 'suggestions') THEN
        ALTER TABLE triage_requests ADD COLUMN suggestions JSONB DEFAULT '[]';
    END IF;
END $$;

SELECT 'Columnas goal, risks, questions y suggestions añadidas exitosamente' as resultado;
