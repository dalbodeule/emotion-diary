CREATE TABLE IF NOT EXISTS "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"recovery_code" varchar NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "private_key_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"share" varchar(512) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"security_question" varchar(255) NOT NULL,
	"security_answer" varchar(255) NOT NULL,
	"recovery_code" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "private_key_shares" ADD CONSTRAINT "private_key_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
