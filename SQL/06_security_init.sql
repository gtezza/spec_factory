-- Script de Seguridad y Roles - Spec Factory
-- Gerardo Tezza | Operaciones

-- 1. Asegurar tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- 2. Insertar roles requeridos
INSERT INTO roles (name, description) VALUES 
('admin', 'Acceso total al sistema'),
('creador', 'Generación y edición de specs'),
('aprovador', 'Validación y aprobación de specs'),
('visor', 'Solo lectura de specs aprobadas')
ON CONFLICT (name) DO NOTHING;

-- 3. Asegurar que la tabla profiles tenga campo de contraseña para login local (Demo)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_name TEXT;

-- 4. Crear usuario de prueba admin/admin
-- Nota: En producción usaríamos Supabase Auth, para este requerimiento usamos login directo.
INSERT INTO profiles (full_name, email, password, role_name, role_id)
VALUES (
    'Administrador de Sistema', 
    'admin@specfactory.com', 
    'admin', 
    'admin',
    (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
)
ON CONFLICT (email) DO UPDATE SET password = 'admin';

-- 5. Crear tu perfil de usuario (Gerardo Tezza) como Creador/Aprobador
INSERT INTO profiles (full_name, email, password, role_name, role_id)
VALUES (
    'Gerardo Tezza', 
    'gtezza@specfactory.com', 
    '1234', 
    'aprovador',
    (SELECT id FROM roles WHERE name = 'aprovador' LIMIT 1)
)
ON CONFLICT (email) DO NOTHING;
