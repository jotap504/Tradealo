ALTER TABLE "seller_shops"
  ADD COLUMN IF NOT EXISTS "footer_template" varchar(50) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_shops"
  ADD COLUMN IF NOT EXISTS "footer_config" jsonb;
