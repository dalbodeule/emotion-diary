ALTER TABLE "public_keys" ADD COLUMN "iv" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nickname" varchar(50) NOT NULL;