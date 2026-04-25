-- Script Correctivo de Seguridad - Spec Factory
-- Crea la tabla 'usuarios' y los accesos iniciales

-- 1. Crear tabla de roles (si no existe)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

INSERT INTO roles (name, description) VALUES 
('admin', 'Acceso total'),
('creador', 'Generador de specs'),
('aprovador', 'Validador de specs'),
('visor', 'Solo lectura')
ON CONFLICT (name) DO NOTHING;

-- 2. Crear tabla de usuarios (Solicitada)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role_name TEXT NOT NULL,
    role_id UUID REFERENCES roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Insertar usuarios de prueba
-- Admin
INSERT INTO usuarios (full_name, email, password, role_name, role_id)
VALUES (
    'Administrador', 
    'admin@specfactory.com', 
    'admin', 
    'admin',
    (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
)
ON CONFLICT (email) DO UPDATE SET password = 'admin';

-- Gerardo Tezza
INSERT INTO usuarios (full_name, email, password, role_name, role_id)
VALUES (
    'Gerardo Tezza', 
    'gtezza@specfactory.com', 
    '1234', 
    'aprovador',
    (SELECT id FROM roles WHERE name = 'aprovador' LIMIT 1)
)
ON CONFLICT (email) DO NOTHING;
