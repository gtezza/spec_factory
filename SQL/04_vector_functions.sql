-- 1. Borramos la versión anterior (con 768 dimensiones)
DROP FUNCTION IF EXISTS match_specifications(vector, float, int);

-- 2. Creamos la versión para Cohere (1024 dimensiones)
CREATE OR REPLACE FUNCTION match_specifications (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  content jsonb,
  urgency urgency_level,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    specifications.id,
    specifications.title,
    specifications.content,
    specifications.urgency,
    1 - (specifications.embedding <=> query_embedding) AS similarity
  FROM specifications
  WHERE specifications.embedding IS NOT NULL
    AND 1 - (specifications.embedding <=> query_embedding) > match_threshold
  ORDER BY specifications.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
