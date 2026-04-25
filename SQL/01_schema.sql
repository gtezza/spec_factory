-- Habilitar la extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tipos enumerados para Urgencia y Criticidad (con protección si ya existen)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency_level') THEN
        CREATE TYPE urgency_level AS ENUM ('Baja', 'Media', 'Alta', 'Crítica');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'criticality_level') THEN
        CREATE TYPE criticality_level AS ENUM ('Baja', 'Media', 'Alta', 'Crítica');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'spec_status') THEN
        CREATE TYPE spec_status AS ENUM ('Borrador', 'En Revisión', 'Aprobada', 'Archivada');
    END IF;
END $$;

-- Tabla de Sectores
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Perfiles (Extensión de auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role_id UUID REFERENCES roles(id),
    sector_id UUID REFERENCES sectors(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Especificaciones
CREATE TABLE IF NOT EXISTS specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number SERIAL,
    version VARCHAR(20) DEFAULT '1.0.0',
    title TEXT NOT NULL,
    content JSONB NOT NULL, -- Almacena las secciones IEEE 830
    markdown TEXT, -- Representación final en MD
    sector_id UUID REFERENCES sectors(id),
    author_id UUID REFERENCES profiles(id),
    approver_id UUID REFERENCES profiles(id),
    urgency urgency_level DEFAULT 'Media',
    criticality criticality_level DEFAULT 'Media',
    status spec_status DEFAULT 'Borrador',
    embedding vector(1536), -- Vector de 1536 dimensiones (Gemini/OpenAI)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para búsqueda semántica
CREATE OR REPLACE FUNCTION match_specifications (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    specifications.id,
    specifications.title,
    1 - (specifications.embedding <=> query_embedding) AS similarity
  FROM specifications
  WHERE 1 - (specifications.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Índices para optimización
CREATE INDEX ON specifications USING hnsw (embedding vector_cosine_ops);
