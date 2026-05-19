ALTER TYPE "public"."kyc_type" ADD VALUE 'phone_camera';--> statement-breakpoint
ALTER TYPE "public"."kyc_type" ADD VALUE 'bcra_consent';--> statement-breakpoint
ALTER TYPE "public"."kyc_type" ADD VALUE 'company_statute';--> statement-breakpoint
ALTER TYPE "public"."kyc_type" ADD VALUE 'arca_registration';--> statement-breakpoint
ALTER TYPE "public"."kyc_type" ADD VALUE 'google_maps';--> statement-breakpoint
CREATE TABLE "bcra_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cuit_dni" varchar(13) NOT NULL,
	"consent_token" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"score" varchar(50),
	"summary" text,
	"raw_response" jsonb,
	"checked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"legal_name" varchar(200) NOT NULL,
	"cuit" varchar(13) NOT NULL,
	"legal_address" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"business_type" varchar(50),
	"arca_registration_key" varchar(500),
	"statute_s3_key" varchar(500),
	"google_maps_place_id" varchar(200),
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "companies_cuit_unique" UNIQUE("cuit")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_type" varchar(20) DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "silver_granted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gold_granted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bcra_consent_granted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bcra_consent_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bcra_checks" ADD CONSTRAINT "bcra_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bcra_checks_user" ON "bcra_checks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_companies_cuit" ON "companies" USING btree ("cuit");--> statement-breakpoint
CREATE INDEX "idx_companies_user" ON "companies" USING btree ("user_id");