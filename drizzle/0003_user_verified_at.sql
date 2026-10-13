ALTER TABLE "users" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
-- An account that is active, has no professor role, or owns a group was accepted before this column existed.
-- The acceptance time was never recorded, so the creation time stands in for it.
-- An inactive professor without groups stays an access request, as the Cuentas page listed it until now.
UPDATE "users" AS account
SET "verified_at" = account."created_at"
WHERE account."active"
	OR NOT EXISTS (SELECT 1 FROM "user_roles" AS granted WHERE granted."user_id" = account."id" AND granted."role" = 'professor')
	OR EXISTS (SELECT 1 FROM "groups" AS owned WHERE owned."professor_id" = account."id");
