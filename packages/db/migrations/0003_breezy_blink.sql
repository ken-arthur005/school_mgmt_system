CREATE TABLE "families" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"name" text NOT NULL,
	CONSTRAINT "families_name_not_blank" CHECK (btrim("families"."name") <> '')
);
--> statement-breakpoint
ALTER TABLE "guardians" ADD COLUMN "photo_path" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "photo_path" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "family_id" uuid;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "families_school_name_idx" ON "families" USING btree ("school_id","name");--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "students_family_id_idx" ON "students" USING btree ("family_id");