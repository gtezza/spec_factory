-- ============================================================
-- Políticas RLS para Spec Factory
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

DO $$
BEGIN
    -- Lectura pública de specs para el dashboard
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'specifications' 
        AND policyname = 'Estadisticas publicas de lectura'
    ) THEN
        CREATE POLICY "Estadisticas publicas de lectura"
        ON specifications FOR SELECT TO anon
        USING (true);
    END IF;

    -- Lectura pública de sectores para los selectores
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sectors' 
        AND policyname = 'Sectores visibles publicamente'
    ) THEN
        CREATE POLICY "Sectores visibles publicamente"
        ON sectors FOR SELECT TO anon
        USING (true);
    END IF;
END $$;
