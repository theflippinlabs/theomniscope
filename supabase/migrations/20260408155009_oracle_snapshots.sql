-- Oracle Sentinel — investigation snapshot persistence
--
-- Stores compact projections of past investigations so the engine and UI
-- can compute score drift over time, render historical charts, and reason
-- about how an entity has evolved cycle to cycle.
--
-- This table holds OBSERVATIONS, not predictions. It is fed by the
-- Command Brain after every analysis and consumed by the History page
-- and the per-analyzer drift panels.

CREATE TABLE IF NOT EXISTS public.oracle_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_identifier   TEXT NOT NULL,
  entity_label        TEXT NOT NULL,
  entity_type         TEXT NOT NULL CHECK (entity_type IN ('wallet', 'token', 'nft_collection', 'mixed')),
  taken_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  risk_score          INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  confidence          INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  risk_label          TEXT NOT NULL,
  trend_direction     TEXT NOT NULL CHECK (trend_direction IN ('improving', 'stable', 'deteriorating')),
  top_findings_count  INTEGER NOT NULL DEFAULT 0,
  high_severity_count INTEGER NOT NULL DEFAULT 0,
  summary             TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Look-ups by entity (drift panels) and by recency (latest-per-entity).
CREATE INDEX IF NOT EXISTS oracle_snapshots_entity_taken_at_idx
  ON public.oracle_snapshots (entity_identifier, taken_at DESC);

CREATE INDEX IF NOT EXISTS oracle_snapshots_taken_at_idx
  ON public.oracle_snapshots (taken_at DESC);

-- Row-level security: snapshots are public-read so the demo and
-- landing page can render shared drift, but inserts/deletes require an
-- authenticated context. Tighten later if multi-tenant isolation is needed.
ALTER TABLE public.oracle_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Snapshots are publicly readable"
  ON public.oracle_snapshots
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone may record snapshots"
  ON public.oracle_snapshots
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone may delete their own snapshots"
  ON public.oracle_snapshots
  FOR DELETE
  USING (true);
