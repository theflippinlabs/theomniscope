-- Oracle Sentinel — memory layer extensions
--
-- Extends the existing `oracle_snapshots` table with two columns used
-- by the memory system (`src/lib/memory/`):
--
--   verdict       — DecisionTier string (safe | caution | avoid | preliminary)
--   key_findings  — JSON array of { title, severity, category }
--
-- Both columns are nullable so existing rows remain valid; new rows
-- are always populated by `investigationToSnapshot`.

ALTER TABLE public.oracle_snapshots
  ADD COLUMN IF NOT EXISTS verdict TEXT
    CHECK (verdict IS NULL OR verdict IN ('safe', 'caution', 'avoid', 'preliminary'));

ALTER TABLE public.oracle_snapshots
  ADD COLUMN IF NOT EXISTS key_findings JSONB;

-- Index the verdict column so the memory layer can efficiently filter
-- history by tier when future queries demand it.
CREATE INDEX IF NOT EXISTS oracle_snapshots_verdict_idx
  ON public.oracle_snapshots (verdict)
  WHERE verdict IS NOT NULL;
