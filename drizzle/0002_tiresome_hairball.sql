CREATE TYPE "public"."source_indexing_status" AS ENUM('pending', 'indexing', 'retrying', 'indexed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('active', 'deleting');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('pdf', 'text', 'youtube');--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"type" "source_type" NOT NULL,
	"title" varchar NOT NULL,
	"metadata" jsonb NOT NULL,
	"indexing_status" "source_indexing_status" DEFAULT 'pending' NOT NULL,
	"status" "source_status" DEFAULT 'active' NOT NULL,
	"idempotency_key" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sources_notebook_id_idempotency_key_unique" UNIQUE("notebook_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "idempotency_key" varchar(255);--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_user_id_idempotency_key_unique" UNIQUE("user_id","idempotency_key");