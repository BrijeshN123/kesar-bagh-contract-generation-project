CREATE TABLE IF NOT EXISTS public.bookings (
  id text PRIMARY KEY,
  contract_ref text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  data_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.contract_documents (
  id text PRIMARY KEY,
  booking_id text NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  version integer NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  file_bytes bytea NOT NULL,
  template_version text NOT NULL,
  policy_version text NOT NULL,
  snapshot_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (booking_id, version)
);
CREATE INDEX IF NOT EXISTS idx_bookings_updated ON public.bookings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_booking ON public.contract_documents(booking_id, version DESC);
