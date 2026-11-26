CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"timezone" text DEFAULT 'Africa/Accra' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"auth_user_id" uuid,
	"display_name" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "users_created_by_required" CHECK ("users"."created_by" IS NOT NULL OR "users"."is_system"),
	CONSTRAINT "users_display_name_not_blank" CHECK (btrim("users"."display_name") <> '')
);
--> statement-breakpoint
CREATE TABLE "staff_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"staff_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" uuid NOT NULL,
	"table_name" text NOT NULL,
	"row_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"actor_user_id" uuid,
	"device_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_log_operation_valid" CHECK ("audit_log"."operation" IN ('INSERT', 'UPDATE', 'DELETE'))
);
--> statement-breakpoint
CREATE TABLE "enrolments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"enrolled_on" date NOT NULL,
	"left_on" date,
	"status" text DEFAULT 'active' NOT NULL,
	"is_boarder" boolean DEFAULT false NOT NULL,
	"ghanaian_language_subject_id" uuid,
	CONSTRAINT "enrolments_status_valid" CHECK ("enrolments"."status" IN ('active', 'completed', 'withdrawn', 'transferred', 'graduated')),
	CONSTRAINT "enrolments_left_after_enrolled" CHECK ("enrolments"."left_on" >= "enrolments"."enrolled_on")
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"surname" text NOT NULL,
	"first_name" text NOT NULL,
	"other_names" text,
	"primary_phone" text NOT NULL,
	"secondary_phone" text,
	"whatsapp_phone" text NOT NULL,
	"email" text,
	"occupation" text,
	"address" text,
	"digital_address" text,
	"user_id" uuid,
	CONSTRAINT "guardians_names_not_blank" CHECK (btrim("guardians"."surname") <> '' AND btrim("guardians"."first_name") <> ''),
	CONSTRAINT "guardians_primary_phone_format" CHECK ("guardians"."primary_phone" ~ '^\+233[0-9]{9}$'),
	CONSTRAINT "guardians_secondary_phone_format" CHECK ("guardians"."secondary_phone" ~ '^\+233[0-9]{9}$'),
	CONSTRAINT "guardians_whatsapp_phone_format" CHECK ("guardians"."whatsapp_phone" ~ '^\+233[0-9]{9}$'),
	CONSTRAINT "guardians_email_format" CHECK ("guardians"."email" ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
	CONSTRAINT "guardians_digital_address_format" CHECK ("guardians"."digital_address" ~ '^[A-Z]{2}-[0-9]{3,4}-[0-9]{4}$')
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"surname" text NOT NULL,
	"first_name" text NOT NULL,
	"other_names" text,
	"job_title" text NOT NULL,
	"employment_type" text NOT NULL,
	"phone" text,
	"email" text,
	"started_on" date,
	"user_id" uuid,
	CONSTRAINT "staff_names_not_blank" CHECK (btrim("staff"."surname") <> '' AND btrim("staff"."first_name") <> ''),
	CONSTRAINT "staff_employment_type_valid" CHECK ("staff"."employment_type" IN ('full_time', 'part_time')),
	CONSTRAINT "staff_phone_format" CHECK ("staff"."phone" ~ '^\+233[0-9]{9}$'),
	CONSTRAINT "staff_email_format" CHECK ("staff"."email" ~ '^[^@[:space:]]+@[^@[:space:]]+$')
);
--> statement-breakpoint
CREATE TABLE "student_guardians" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"student_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"is_main_contact" boolean DEFAULT false NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"whatsapp_opt_in_at" timestamp with time zone,
	CONSTRAINT "student_guardians_relationship_valid" CHECK ("student_guardians"."relationship" IN ('mother', 'father', 'grandmother', 'grandfather', 'aunt', 'uncle', 'sibling', 'guardian', 'other')),
	CONSTRAINT "student_guardians_opt_in_has_date" CHECK (NOT "student_guardians"."whatsapp_opt_in" OR "student_guardians"."whatsapp_opt_in_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "student_medical_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"student_id" uuid NOT NULL,
	"note" text NOT NULL,
	CONSTRAINT "student_medical_notes_not_blank" CHECK (btrim("student_medical_notes"."note") <> '')
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"admission_number" text NOT NULL,
	"surname" text NOT NULL,
	"first_name" text NOT NULL,
	"other_names" text,
	"sex" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"admitted_on" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"photo_path" text,
	"ghana_card_number" text,
	"nhis_number" text,
	"religion" text,
	CONSTRAINT "students_sex_valid" CHECK ("students"."sex" IN ('male', 'female')),
	CONSTRAINT "students_status_valid" CHECK ("students"."status" IN ('active', 'withdrawn', 'graduated', 'transferred')),
	CONSTRAINT "students_religion_valid" CHECK ("students"."religion" IN ('christian', 'muslim', 'traditional', 'other', 'prefer_not_to_say')),
	CONSTRAINT "students_names_not_blank" CHECK (btrim("students"."surname") <> '' AND btrim("students"."first_name") <> ''),
	CONSTRAINT "students_born_before_admitted" CHECK ("students"."date_of_birth" < "students"."admitted_on"),
	CONSTRAINT "students_ghana_card_format" CHECK ("students"."ghana_card_number" ~ '^GHA-[0-9]{9}-[0-9]$')
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "user_roles_role_valid" CHECK ("user_roles"."role" IN ('owner', 'head', 'admin', 'bursar', 'class_teacher', 'subject_teacher', 'housemaster', 'system_admin'))
);
--> statement-breakpoint
CREATE TABLE "academic_years" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	CONSTRAINT "academic_years_dates_in_order" CHECK ("academic_years"."ends_on" > "academic_years"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "class_subjects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	CONSTRAINT "class_subjects_class_subject_key" UNIQUE("class_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"academic_year_id" uuid NOT NULL,
	"level_id" uuid NOT NULL,
	"stream" text,
	"name" text NOT NULL,
	"form_teacher_staff_id" uuid,
	CONSTRAINT "classes_year_level_stream_key" UNIQUE NULLS NOT DISTINCT("academic_year_id","level_id","stream"),
	CONSTRAINT "classes_year_name_key" UNIQUE("academic_year_id","name"),
	CONSTRAINT "classes_id_year_key" UNIQUE("id","academic_year_id"),
	CONSTRAINT "classes_stream_format" CHECK ("classes"."stream" ~ '^[A-Z]$')
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"stage" text NOT NULL,
	"sort_order" smallint NOT NULL,
	CONSTRAINT "levels_stage_valid" CHECK ("levels"."stage" IN ('creche', 'nursery', 'kindergarten', 'primary', 'jhs'))
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"elective_group" text,
	CONSTRAINT "subjects_elective_group_valid" CHECK ("subjects"."elective_group" IN ('ghanaian_language'))
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"academic_year_id" uuid NOT NULL,
	"number" smallint NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"mid_term_break_starts_on" date,
	"mid_term_break_ends_on" date,
	CONSTRAINT "terms_number_valid" CHECK ("terms"."number" BETWEEN 1 AND 3),
	CONSTRAINT "terms_dates_in_order" CHECK ("terms"."ends_on" > "terms"."starts_on"),
	CONSTRAINT "terms_mid_term_break_valid" CHECK (("terms"."mid_term_break_starts_on" IS NULL AND "terms"."mid_term_break_ends_on" IS NULL)
        OR ("terms"."mid_term_break_starts_on" >= "terms"."starts_on"
          AND "terms"."mid_term_break_ends_on" >= "terms"."mid_term_break_starts_on"
          AND "terms"."mid_term_break_ends_on" <= "terms"."ends_on"))
);
--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_class_subject_fk" FOREIGN KEY ("class_id","subject_id") REFERENCES "public"."class_subjects"("class_id","subject_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_ghanaian_language_subject_id_subjects_id_fk" FOREIGN KEY ("ghanaian_language_subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_class_year_fk" FOREIGN KEY ("class_id","academic_year_id") REFERENCES "public"."classes"("id","academic_year_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_medical_notes" ADD CONSTRAINT "student_medical_notes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_medical_notes" ADD CONSTRAINT "student_medical_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_medical_notes" ADD CONSTRAINT "student_medical_notes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_form_teacher_staff_id_staff_id_fk" FOREIGN KEY ("form_teacher_staff_id") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "levels" ADD CONSTRAINT "levels_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "levels" ADD CONSTRAINT "levels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users" USING btree ("auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_one_system_user_per_school" ON "users" USING btree ("school_id") WHERE "users"."is_system";--> statement-breakpoint
CREATE INDEX "users_school_id_idx" ON "users" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_assignments_staff_class_subject_key" ON "staff_assignments" USING btree ("staff_id","class_id","subject_id") WHERE "staff_assignments"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "staff_assignments_class_id_idx" ON "staff_assignments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "staff_assignments_subject_id_idx" ON "staff_assignments" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "audit_log_table_row_idx" ON "audit_log" USING btree ("table_name","row_id");--> statement-breakpoint
CREATE INDEX "audit_log_school_created_at_idx" ON "audit_log" USING btree ("school_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "enrolments_student_year_key" ON "enrolments" USING btree ("student_id","academic_year_id") WHERE "enrolments"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "enrolments_class_id_idx" ON "enrolments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "enrolments_school_year_idx" ON "enrolments" USING btree ("school_id","academic_year_id");--> statement-breakpoint
CREATE INDEX "enrolments_ghanaian_language_subject_id_idx" ON "enrolments" USING btree ("ghanaian_language_subject_id");--> statement-breakpoint
CREATE INDEX "guardians_school_primary_phone_idx" ON "guardians" USING btree ("school_id","primary_phone");--> statement-breakpoint
CREATE INDEX "guardians_school_whatsapp_phone_idx" ON "guardians" USING btree ("school_id","whatsapp_phone");--> statement-breakpoint
CREATE INDEX "guardians_school_name_idx" ON "guardians" USING btree ("school_id","surname","first_name");--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_user_id_key" ON "guardians" USING btree ("user_id") WHERE "guardians"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_user_id_key" ON "staff" USING btree ("user_id") WHERE "staff"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "staff_school_name_idx" ON "staff" USING btree ("school_id","surname","first_name");--> statement-breakpoint
CREATE UNIQUE INDEX "student_guardians_student_guardian_key" ON "student_guardians" USING btree ("student_id","guardian_id") WHERE "student_guardians"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "student_guardians_one_main_contact" ON "student_guardians" USING btree ("student_id") WHERE "student_guardians"."is_main_contact" AND "student_guardians"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "student_guardians_guardian_id_idx" ON "student_guardians" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "student_medical_notes_student_id_idx" ON "student_medical_notes" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_admission_number_key" ON "students" USING btree ("school_id","admission_number") WHERE "students"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "students_school_name_idx" ON "students" USING btree ("school_id","surname","first_name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_role_key" ON "user_roles" USING btree ("user_id","role") WHERE "user_roles"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_school_name_key" ON "academic_years" USING btree ("school_id","name") WHERE "academic_years"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "class_subjects_subject_id_idx" ON "class_subjects" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "classes_level_id_idx" ON "classes" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX "classes_form_teacher_staff_id_idx" ON "classes" USING btree ("form_teacher_staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "levels_school_code_key" ON "levels" USING btree ("school_id","code") WHERE "levels"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "levels_school_sort_order_key" ON "levels" USING btree ("school_id","sort_order") WHERE "levels"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_school_code_key" ON "subjects" USING btree ("school_id","code") WHERE "subjects"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_school_name_key" ON "subjects" USING btree ("school_id","name") WHERE "subjects"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "terms_year_number_key" ON "terms" USING btree ("academic_year_id","number") WHERE "terms"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "terms_school_dates_idx" ON "terms" USING btree ("school_id","starts_on","ends_on");