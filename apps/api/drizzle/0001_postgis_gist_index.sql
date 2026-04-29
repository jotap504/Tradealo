-- PostGIS GIST index on listings.location
-- Must use CREATE INDEX (not CONCURRENTLY) in migration context
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST(location);
