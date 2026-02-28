
-- Clusters table
CREATE TABLE public.clusters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain text NOT NULL DEFAULT 'cronos',
  label text,
  confidence float NOT NULL DEFAULT 0,
  seed_address text NOT NULL,
  seed_type text NOT NULL DEFAULT 'wallet',
  member_count int NOT NULL DEFAULT 0,
  top_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read clusters" ON public.clusters FOR SELECT USING (true);
CREATE POLICY "Public insert clusters" ON public.clusters FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update clusters" ON public.clusters FOR UPDATE USING (true) WITH CHECK (true);

-- Cluster members table
CREATE TABLE public.cluster_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id uuid NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  address text NOT NULL,
  role text NOT NULL DEFAULT 'associated',
  confidence float NOT NULL DEFAULT 0,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cluster_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cluster_members" ON public.cluster_members FOR SELECT USING (true);
CREATE POLICY "Public insert cluster_members" ON public.cluster_members FOR INSERT WITH CHECK (true);

-- Cluster edges table
CREATE TABLE public.cluster_edges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id uuid NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  source_address text NOT NULL,
  target_address text NOT NULL,
  weight float NOT NULL DEFAULT 0,
  net_flow float NOT NULL DEFAULT 0,
  tx_count int NOT NULL DEFAULT 0,
  time_window text NOT NULL DEFAULT '7d',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cluster_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cluster_edges" ON public.cluster_edges FOR SELECT USING (true);
CREATE POLICY "Public insert cluster_edges" ON public.cluster_edges FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_clusters_seed ON public.clusters(seed_address, chain);
CREATE INDEX idx_cluster_members_cluster ON public.cluster_members(cluster_id);
CREATE INDEX idx_cluster_members_address ON public.cluster_members(address);
CREATE INDEX idx_cluster_edges_cluster ON public.cluster_edges(cluster_id);

-- Updated_at trigger
CREATE TRIGGER update_clusters_updated_at
  BEFORE UPDATE ON public.clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
