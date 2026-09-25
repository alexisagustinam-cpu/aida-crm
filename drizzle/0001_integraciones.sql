CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"hash" text NOT NULL,
	"created_by" text,
	"last_used_at" timestamp with time zone,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_key" text NOT NULL,
	"status" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"key" text PRIMARY KEY NOT NULL,
	"secret" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_error" text,
	"connected_by" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "automations" ("key", "name", "description", "active") VALUES
('webhook_events', 'Eventos a n8n / webhook', 'Envía cada evento del CRM (lead nuevo, cambio de etapa, cliente ganado, tarea completada, pago, reunión) al webhook de n8n.', true),
('lead_email_team', 'Correo al equipo por lead nuevo', 'Cuando entra un lead, envía un correo a todo el equipo con sus datos.', true),
('daily_digest_email', 'Resumen diario por correo', 'Cada mañana envía al equipo las tareas que vencen y las reuniones del día.', true)
ON CONFLICT ("key") DO NOTHING;
