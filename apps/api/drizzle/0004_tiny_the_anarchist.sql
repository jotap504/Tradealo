CREATE TYPE "public"."order_status" AS ENUM('pending', 'delivered', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_info" jsonb,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "cbu" varchar(22);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "alias" varchar(50);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "bank_name" varchar(100);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "bank_account_type" varchar(30);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "bank_account_number" varchar(30);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "payment_info" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_orders_buyer" ON "orders" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_seller" ON "orders" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_conversation" ON "orders" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_orders_listing_status" ON "orders" USING btree ("listing_id","status");