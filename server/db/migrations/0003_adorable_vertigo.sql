CREATE TABLE IF NOT EXISTS "diaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"tags" json DEFAULT '[]'::json,
	"agree_to_use_tags" boolean DEFAULT false NOT NULL,
	"user_id" serial NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diaries" ADD CONSTRAINT "diaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
