-- 1. Asegurar el estado 'Rechazada' en el tipo de estado de specs
ALTER TYPE spec_status ADD VALUE IF NOT EXISTS 'Rechazada';

-- 2. Crear tabla de historial para el flujo de ida y vuelta
CREATE TABLE IF NOT EXISTS spec_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spec_id UUID REFERENCES specifications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES usuarios(id),
    status TEXT NOT NULL, -- Usamos TEXT por flexibilidad o vinculamos a spec_status
    comment TEXT, -- Motivo del rechazo o nota del autor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índice para rapidez en las consultas de historial
CREATE INDEX IF NOT EXISTS idx_spec_history_spec_id ON spec_history(spec_id);
