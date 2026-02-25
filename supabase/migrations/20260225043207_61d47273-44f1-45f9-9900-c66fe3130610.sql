-- Allow anonymous users to read invitation codes (to check validity)
CREATE POLICY "Anyone can read invitation codes"
  ON public.invitation_codes
  FOR SELECT
  USING (true);

-- Allow anonymous users to update invitation codes (to claim them)
CREATE POLICY "Anyone can claim unused invitation codes"
  ON public.invitation_codes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to insert codes (for admin)
CREATE POLICY "Anyone can insert invitation codes"
  ON public.invitation_codes
  FOR INSERT
  WITH CHECK (true);

-- Allow anonymous users to delete codes (for admin)
CREATE POLICY "Anyone can delete invitation codes"
  ON public.invitation_codes
  FOR DELETE
  USING (true);
