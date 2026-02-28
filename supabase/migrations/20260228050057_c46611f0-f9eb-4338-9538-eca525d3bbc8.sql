
-- Cases table
CREATE TABLE public.cases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  chain text NOT NULL DEFAULT 'cronos',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cases" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Public insert cases" ON public.cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update cases" ON public.cases FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete cases" ON public.cases FOR DELETE USING (true);

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Case items (evidence)
CREATE TABLE public.case_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  chain text NOT NULL DEFAULT 'cronos',
  ref text NOT NULL,
  title text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read case_items" ON public.case_items FOR SELECT USING (true);
CREATE POLICY "Public insert case_items" ON public.case_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete case_items" ON public.case_items FOR DELETE USING (true);

CREATE INDEX idx_case_items_case ON public.case_items(case_id);
CREATE UNIQUE INDEX idx_case_items_unique ON public.case_items(case_id, item_type, ref);

-- Case notes
CREATE TABLE public.case_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read case_notes" ON public.case_notes FOR SELECT USING (true);
CREATE POLICY "Public insert case_notes" ON public.case_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete case_notes" ON public.case_notes FOR DELETE USING (true);

CREATE INDEX idx_case_notes_case ON public.case_notes(case_id);

-- Case share links
CREATE TABLE public.case_share_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read case_share_links" ON public.case_share_links FOR SELECT USING (true);
CREATE POLICY "Public insert case_share_links" ON public.case_share_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update case_share_links" ON public.case_share_links FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete case_share_links" ON public.case_share_links FOR DELETE USING (true);

-- Report jobs
CREATE TABLE public.report_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  output_url text,
  output_json_url text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read report_jobs" ON public.report_jobs FOR SELECT USING (true);
CREATE POLICY "Public insert report_jobs" ON public.report_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update report_jobs" ON public.report_jobs FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER update_report_jobs_updated_at
  BEFORE UPDATE ON public.report_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_report_jobs_case ON public.report_jobs(case_id);

-- Storage bucket for reports
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true);

CREATE POLICY "Public read reports" ON storage.objects FOR SELECT USING (bucket_id = 'reports');
CREATE POLICY "Service insert reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reports');
