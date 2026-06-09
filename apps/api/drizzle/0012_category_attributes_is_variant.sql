-- Flag to mark which category attributes can be used as a variant
-- dimension (color, talle, almacenamiento, ...) in the publishing wizard.
ALTER TABLE category_attributes
  ADD COLUMN IF NOT EXISTS is_variant boolean NOT NULL DEFAULT false;
