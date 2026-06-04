-- Provenance + dedup on listings (so we can tell where a draft came from
-- and skip re-importing the same product twice).
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS source_provider varchar(20),
  ADD COLUMN IF NOT EXISTS source_product_id varchar(60);

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_source_dedup
  ON listings (user_id, source_provider, source_product_id)
  WHERE source_provider IS NOT NULL;

-- OAuth tokens for marketplace integrations (sibling of seller_payment_credentials).
-- Tokens are AES-256-GCM encrypted via apps/api/src/common/utils/crypto.util.ts.
CREATE TABLE IF NOT EXISTS seller_marketplace_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(20) NOT NULL,
  external_user_id varchar(40),
  external_nickname varchar(80),
  site_id varchar(10),
  access_token_ciphertext bytea NOT NULL,
  access_token_iv bytea NOT NULL,
  access_token_auth_tag bytea NOT NULL,
  refresh_token_ciphertext bytea,
  refresh_token_iv bytea,
  refresh_token_auth_tag bytea,
  scope varchar(200),
  expires_at timestamptz,
  last_validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_conn_user_provider
  ON seller_marketplace_connections (user_id, provider);

-- Import jobs + per-item rows so the UI can show progress and the
-- processor can resume cleanly on retry.
CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'queued',
  total_items integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  skipped_duplicate integer NOT NULL DEFAULT 0,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_user_created
  ON import_jobs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS import_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  external_product_id varchar(60) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_job_items_job
  ON import_job_items (job_id, status);
