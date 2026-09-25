CREATE TYPE "public"."request_status" AS ENUM('open', 'reviewed', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('professor', 'staff', 'admin');--> statement-breakpoint
CREATE TABLE "careers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "careers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professor_id" uuid NOT NULL,
	"period_code" text NOT NULL,
	"number" integer NOT NULL,
	"lab_id" uuid NOT NULL,
	"lab_name" text NOT NULL,
	"career_id" uuid NOT NULL,
	"career_name" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"subject_name" text NOT NULL,
	"students" integer NOT NULL,
	"teams" integer NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_number_positive" CHECK ("groups"."number" > 0),
	CONSTRAINT "groups_students_teams_valid" CHECK (
    "groups"."students" BETWEEN 1 AND 60 AND
    "groups"."teams" BETWEEN 1 AND "groups"."students"
  ),
	CONSTRAINT "groups_weekday_valid" CHECK ("groups"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "groups_time_order" CHECK ("groups"."start_time" < "groups"."end_time")
);
--> statement-breakpoint
CREATE TABLE "lab_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"name" text NOT NULL,
	"materials" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "labs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "periods" (
	"code" text PRIMARY KEY NOT NULL,
	"starts_on" date,
	"ends_on" date,
	CONSTRAINT "periods_date_pair" CHECK ((
    ("periods"."starts_on" IS NULL AND "periods"."ends_on" IS NULL) OR
    ("periods"."starts_on" IS NOT NULL AND "periods"."ends_on" >= "periods"."starts_on")
  ))
);
--> statement-breakpoint
CREATE TABLE "preparation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"professor_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"session_date" date NOT NULL,
	"lab_id" uuid NOT NULL,
	"lab_name" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"materials" jsonb NOT NULL,
	"professor_note" text,
	"staff_note" text,
	"status" "request_status" DEFAULT 'open' NOT NULL,
	"late_reason" text,
	"late_accepted_by" uuid,
	"late_accepted_at" timestamp with time zone,
	"schedule_needs_confirmation" boolean DEFAULT false NOT NULL,
	"schedule_confirmed_by" uuid,
	"schedule_confirmed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"fulfilled_by" uuid,
	"fulfilled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requests_time_order" CHECK ("preparation_requests"."start_time" < "preparation_requests"."end_time"),
	CONSTRAINT "requests_late_acceptance_valid" CHECK (
    "preparation_requests"."late_accepted_at" IS NULL OR
    ("preparation_requests"."late_reason" IS NOT NULL AND "preparation_requests"."late_accepted_by" IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"min_notice_days" integer DEFAULT 7 NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_notice_nonnegative" CHECK ("settings"."min_notice_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "subjects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text NOT NULL,
	"surname" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_professor_id_users_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_period_code_periods_code_fk" FOREIGN KEY ("period_code") REFERENCES "public"."periods"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_career_id_careers_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_professor_id_users_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_exercise_id_lab_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."lab_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_late_accepted_by_users_id_fk" FOREIGN KEY ("late_accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_schedule_confirmed_by_users_id_fk" FOREIGN KEY ("schedule_confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_fulfilled_by_users_id_fk" FOREIGN KEY ("fulfilled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "groups_professor_period_number_unique" ON "groups" USING btree ("professor_id","period_code","number");--> statement-breakpoint
CREATE INDEX "groups_lab_period_weekday_idx" ON "groups" USING btree ("lab_id","period_code","weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "requests_active_group_date_unique" ON "preparation_requests" USING btree ("group_id","session_date") WHERE "status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "requests_session_date_idx" ON "preparation_requests" USING btree ("session_date");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_active_lab_slot_no_overlap"
  EXCLUDE USING gist (
    "lab_id" WITH =,
    "period_code" WITH =,
    "weekday" WITH =,
    tsrange(date '2000-01-01' + "start_time", date '2000-01-01' + "end_time", '[)') WITH &&
  ) WHERE ("active");--> statement-breakpoint
INSERT INTO "settings" ("id", "min_notice_days") VALUES (1, 7);
