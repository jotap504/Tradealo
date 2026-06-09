-- Generalize attribute storage on listings (collectible_attributes ya es jsonb;
-- lo dejamos por backward compat y agregamos attributes generico).
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Copia inicial: lo que estaba en collectible_attributes va tambien a attributes.
UPDATE listings
   SET attributes = collectible_attributes
 WHERE collectible_attributes IS NOT NULL
   AND attributes = '{}'::jsonb;

-- GIN para filtrar por attribute containment (?, @>).
CREATE INDEX IF NOT EXISTS idx_listings_attrs_gin
  ON listings USING gin (attributes);

-- Variantes por listing (color/talle/almacenamiento/etc.).
CREATE TABLE IF NOT EXISTS listing_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  attribute_values jsonb NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  sku varchar(60),
  price decimal(12, 2),
  weight_grams integer,
  length_cm smallint,
  width_cm smallint,
  height_cm smallint,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_listing
  ON listing_variants(listing_id);

CREATE INDEX IF NOT EXISTS idx_variants_attrs_gin
  ON listing_variants USING gin (attribute_values);

-- Binding de imagen a variante (nullable: si es null, la imagen es del listing global).
ALTER TABLE listing_images
  ADD COLUMN IF NOT EXISTS variant_id uuid
    REFERENCES listing_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_images_variant
  ON listing_images(variant_id);

-- Categories: depth + path para queries jerarquicas mas rapidas.
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS depth smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS path_slugs text[];
