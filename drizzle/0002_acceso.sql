ALTER TABLE "members" ALTER COLUMN "auth_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "invited_by" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "invite_token_hash" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "invite_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "invite_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
-- El antiguo "rol" era texto libre que cada quien editaba en su perfil. Ahora el rol es solo el
-- permiso (Administrador o Equipo) y lo que la persona escribió pasa a ser su cargo.
UPDATE "members" SET "title" = "role" WHERE "role" NOT IN ('Administrador', 'Equipo');--> statement-breakpoint
UPDATE "members" SET "role" = 'Equipo' WHERE "role" NOT IN ('Administrador', 'Equipo');
