-- 1. Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 2. Limpieza de políticas previas
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON profiles;
    DROP POLICY IF EXISTS "Cualquier usuario autenticado puede ver especificaciones aprobadas" ON specifications;
    DROP POLICY IF EXISTS "Los autores pueden ver sus propios borradores" ON specifications;
    DROP POLICY IF EXISTS "Los autores pueden insertar especificaciones" ON specifications;
    DROP POLICY IF EXISTS "Los aprobadores pueden actualizar el estado" ON specifications;
END $$;

-- 3. Crear Políticas
CREATE POLICY "Los usuarios pueden ver su propio perfil"
ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Cualquier usuario autenticado puede ver especificaciones aprobadas"
ON specifications FOR SELECT TO authenticated
USING (status = 'Aprobada');

CREATE POLICY "Los autores pueden ver sus propios borradores"
ON specifications FOR SELECT TO authenticated
USING (author_id = (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Los autores pueden insertar especificaciones"
ON specifications FOR INSERT TO authenticated
WITH CHECK (author_id = (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Los aprobadores pueden actualizar el estado"
ON specifications FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        JOIN roles ON profiles.role_id = roles.id 
        WHERE profiles.id = auth.uid() AND roles.name IN ('admin', 'approver')
    )
);

-- 4. Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_specifications_updated_at ON specifications;
CREATE TRIGGER update_specifications_updated_at
BEFORE UPDATE ON specifications
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
