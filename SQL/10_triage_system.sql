-- Sistema de Triage y Gobernanza - GT Data Consulting

-- 1. Tabla de Estados (Sustituye al ENUM para mayor dinamismo)
CREATE TABLE IF NOT EXISTS statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#cbd5e1', -- Color hexadecimal para la UI
    is_initial BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar estados iniciales
INSERT INTO statuses (name, color, is_initial) VALUES
('BORRADOR', '#94a3b8', true),
('EN ANALISIS', '#6366f1', false),
('PENDIENTE APROBACION', '#f59e0b', false),
('APROBADO', '#10b981', false),
('RECHAZADO', '#ef4444', false)
ON CONFLICT (name) DO NOTHING;

-- 2. Actualizar Tabla de Sectores con Código de 3 Letras
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS code CHAR(3);

-- Actualizar sectores existentes con códigos (o insertar nuevos)
UPDATE sectors SET code = 'ARQ' WHERE name = 'Arquitectura';
UPDATE sectors SET code = 'FRO' WHERE name = 'Frontend';
UPDATE sectors SET code = 'BAC' WHERE name = 'Backend';
UPDATE sectors SET code = 'SEG' WHERE name = 'Seguridad';
UPDATE sectors SET code = 'QAS' WHERE name = 'QA';
UPDATE sectors SET code = 'OPS' WHERE name = 'DevOps';

-- 3. Tabla de Requerimientos Refinados (Triage)
CREATE TABLE IF NOT EXISTS triage_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT UNIQUE NOT NULL, -- Formato: [3 LETRAS SECTOR]-[0000X]
    creator_id UUID REFERENCES auth.users(id),
    requester_id UUID REFERENCES auth.users(id),
    approver_id UUID REFERENCES auth.users(id),
    sector_id UUID REFERENCES sectors(id),
    status_id UUID REFERENCES statuses(id),
    
    objective TEXT,
    benefits TEXT,
    roi TEXT,
    idea TEXT,
    criticality TEXT DEFAULT 'Media', -- Opcional: convertir a tabla si se desea
    
    metadata JSONB DEFAULT '{}', -- Para auditoría y otros datos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Diccionario de 3 Capas
CREATE TABLE IF NOT EXISTS glossary_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    layer TEXT CHECK (layer IN ('GOBIERNO', 'TECNICO', 'OBTENIDO')),
    origin TEXT, -- Fuente de la definición
    permission TEXT CHECK (permission IN ('INTOCABLE', 'MODIFICABLE', 'VALIDAR')),
    request_id UUID REFERENCES triage_requests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(term, layer)
);
