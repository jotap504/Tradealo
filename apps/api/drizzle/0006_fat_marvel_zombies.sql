ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "reply_text" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "reply_created_at" timestamp with time zone;
