-- Enable trigram-based fuzzy search on listings (typo tolerance: "Sansumg" → "Samsung").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_listings_title_trgm
  ON listings USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_listings_description_trgm
  ON listings USING gin (description gin_trgm_ops);
