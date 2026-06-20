-- ============================================================================
-- TermShield v2 Migration — Hybrid Pipeline Schema
-- Run this in your Supabase SQL Editor to upgrade the database.
-- This is non-destructive: it only ADDs columns/tables, never drops existing data.
-- ============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. New table: clause_embeddings
--    Stores clause-level vector embeddings for semantic retrieval
CREATE TABLE IF NOT EXISTS public.clause_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES public.scans(id) ON DELETE CASCADE,
  document_hash text NOT NULL,
  clause_index int NOT NULL,
  clause_text text NOT NULL,
  embedding vector(768) NOT NULL,
  clause_type text CHECK (clause_type IN ('heading', 'clause', 'subclause', 'definition', 'schedule')),
  page_number int,
  section_title text,
  confidence float,
  risk_label text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_clause_embeddings_vector
  ON public.clause_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_clause_embeddings_scan_id
  ON public.clause_embeddings(scan_id);

CREATE INDEX IF NOT EXISTS idx_clause_embeddings_risk_label
  ON public.clause_embeddings(risk_label);

-- 3. New table: embedding_cache
--    Caches text→embedding mappings to avoid redundant Gemini embedding API calls
CREATE TABLE IF NOT EXISTS public.embedding_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash text UNIQUE NOT NULL,
  embedding vector(768) NOT NULL,
  model text DEFAULT 'text-embedding-004',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash
  ON public.embedding_cache(text_hash);

-- 4. Expand the risks table with new columns for the hybrid pipeline
--    These are all nullable to preserve backward compatibility with existing scans.
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS risk_type text;
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS evidence_snippet text;
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS impact text;
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS suggested_rewrite text;
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS detection_method text
  CHECK (detection_method IN ('rule', 'retrieval', 'llm', 'hybrid'));
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS clause_id uuid
  REFERENCES public.clause_embeddings(id) ON DELETE SET NULL;
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS page_number int;
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS section_title text;

-- 5. Drop the old narrow CHECK constraint on risks.category and replace
--    with the expanded 10-category list.
--    Note: Supabase/Postgres requires finding the constraint name first.
--    We use a DO block to handle this gracefully.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.risks'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%category%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.risks DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.risks ADD CONSTRAINT risks_category_check
  CHECK (category IN (
    'ip', 'payment', 'non-compete', 'termination',
    'liability', 'indemnity', 'confidentiality',
    'revisions', 'acceptance', 'auto-renewal'
  ));

-- 6. RLS policies for new tables
ALTER TABLE public.clause_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_cache ENABLE ROW LEVEL SECURITY;

-- clause_embeddings: users can read embeddings for their own scans
CREATE POLICY "Users can view clause embeddings for their scans"
  ON public.clause_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = clause_embeddings.scan_id
        AND scans.user_id = auth.uid()
    )
  );

-- embedding_cache: service role only (no user access needed)
-- The service role key bypasses RLS automatically, so no policy needed.

-- 7. Grant service role full access (service role already bypasses RLS,
--    but explicit grants ensure compatibility)
GRANT ALL ON public.clause_embeddings TO service_role;
GRANT ALL ON public.embedding_cache TO service_role;

-- 8. RPC function for vector similarity search (used by embeddings.ts)
--    This is the function that the app calls via supabase.rpc("match_clause_embeddings", ...)
CREATE OR REPLACE FUNCTION public.match_clause_embeddings(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5,
  filter_risk_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  clause_text text,
  risk_label text,
  section_title text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.clause_text,
    ce.risk_label,
    ce.section_title,
    (1 - (ce.embedding <=> query_embedding))::float AS similarity
  FROM public.clause_embeddings ce
  WHERE
    (1 - (ce.embedding <=> query_embedding)) >= match_threshold
    AND (filter_risk_type IS NULL OR ce.risk_label = filter_risk_type)
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.match_clause_embeddings TO service_role;
