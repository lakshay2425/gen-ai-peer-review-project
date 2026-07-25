CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"role" varchar DEFAULT 'user' NOT NULL,
	"plan" varchar DEFAULT 'free' NOT NULL,
	"full_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
