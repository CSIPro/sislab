ALTER TYPE "public"."request_status" ADD VALUE 'voided';--> statement-breakpoint
DROP INDEX "requests_active_group_date_unique";--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD COLUMN "exercise_number" text;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD COLUMN "exercise_name" text;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD COLUMN "late_declined_by" uuid;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD COLUMN "late_declined_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD COLUMN "void_reason" text;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD COLUMN "voided_by" uuid;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
UPDATE "preparation_requests" AS request
SET "exercise_number" = exercise."number", "exercise_name" = exercise."name"
FROM "lab_exercises" AS exercise
WHERE request."exercise_id" = exercise."id";--> statement-breakpoint
ALTER TABLE "preparation_requests" ALTER COLUMN "exercise_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "preparation_requests" ALTER COLUMN "exercise_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_late_declined_by_users_id_fk" FOREIGN KEY ("late_declined_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "preparation_requests_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "requests_active_group_date_unique" ON "preparation_requests" USING btree ("group_id","session_date") WHERE "status" <> 'voided';--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "requests_late_decision_exclusive" CHECK (NOT ("preparation_requests"."late_accepted_at" IS NOT NULL AND "preparation_requests"."late_declined_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "preparation_requests" ADD CONSTRAINT "requests_voided_details_valid" CHECK (
				"preparation_requests"."status" <> 'voided' OR
				("preparation_requests"."void_reason" IS NOT NULL AND "preparation_requests"."voided_by" IS NOT NULL AND "preparation_requests"."voided_at" IS NOT NULL)
			);
