-- Add variant_id to orders so we can track which variant was purchased
-- and correctly restore variant stock on cancellation.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS variant_id uuid
  REFERENCES listing_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_variant ON orders(variant_id)
  WHERE variant_id IS NOT NULL;
