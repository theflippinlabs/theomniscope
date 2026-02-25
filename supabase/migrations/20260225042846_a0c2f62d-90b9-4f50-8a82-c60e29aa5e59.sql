
-- Table for invitation codes
CREATE TABLE public.invitation_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/update codes (for validation)
CREATE POLICY "Anyone can validate codes"
  ON public.invitation_codes
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can use a code"
  ON public.invitation_codes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Only authenticated or service role can insert (we'll use anon for admin with PIN)
CREATE POLICY "Anyone can insert codes"
  ON public.invitation_codes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete codes"
  ON public.invitation_codes
  FOR DELETE
  USING (true);
