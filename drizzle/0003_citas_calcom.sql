ALTER TABLE "meetings" ADD COLUMN "opportunity_id" uuid;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_external_id_unique" UNIQUE("external_id");--> statement-breakpoint
INSERT INTO "automations" ("key", "name", "description", "active") VALUES
('calcom_sync', 'Citas de Cal.com al CRM', 'Cada reserva del diagnóstico en Cal.com entra como reunión, pegada a su lead (o crea el lead si no existe). Si la cancelan, la quita.', true)
ON CONFLICT ("key") DO NOTHING;
