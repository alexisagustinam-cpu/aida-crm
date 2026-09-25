import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import type { Database } from "@/lib/supabase/database.types";
import {
  WEB_COMPANY_NAME,
  WEB_SOURCE_NAME,
  classifyContact,
  intakeNote,
  splitName,
  webIntakeSchema,
} from "@/features/sales/domain/web-intake";

/* Entrada de prospectos desde la web pública (automailabs.com).
 *
 * Es el único punto del CRM sin sesión de usuario, así que:
 *  - se autentica con un secreto compartido, comparado en tiempo constante;
 *  - lo llama el servidor de la landing, nunca el navegador, para que el
 *    secreto no salga jamás al cliente;
 *  - usa la service role key, que se salta RLS — por eso la organización NO
 *    se acepta por parámetro: viene de una variable de entorno. Si llegara
 *    en el cuerpo, cualquiera con el secreto podría escribir en cualquier
 *    organización.
 */

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

/** Comparación en tiempo constante: un `===` filtra el secreto carácter a carácter. */
function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.CRM_INTAKE_SECRET;
  const orgId = process.env.CRM_INTAKE_ORGANIZATION_ID;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Sin configuración no se responde 500 con detalle: eso le diría a quien
  // sondea el endpoint que existe y qué le falta.
  if (!secret || !orgId || !url || !serviceKey) {
    console.error("intake/lead: faltan variables de entorno");
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  if (!secretMatches(request.headers.get("x-intake-secret"), secret)) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = webIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 422 });
  }
  const input = parsed.data;

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1. Origen y empresa paraguas: se buscan antes de crearlos para no
    //    duplicarlos en cada envío del formulario.
    const sourceId = await ensureRow(
      supabase,
      "lead_sources",
      orgId,
      WEB_SOURCE_NAME,
    );
    const companyId = await ensureRow(
      supabase,
      "companies",
      orgId,
      WEB_COMPANY_NAME,
    );

    // 2. Contacto. Si esa persona ya escribió antes, se reutiliza en vez de
    //    crear un duplicado: el mismo correo o teléfono es la misma persona.
    const { email, phone } = classifyContact(input.contact);
    const { firstName, lastName } = splitName(input.name);

    let contactId: string | null = null;
    if (email || phone) {
      const { data } = await supabase
        .from("contacts")
        .select("id")
        .eq("organization_id", orgId)
        .eq(email ? "email" : "phone", (email ?? phone)!)
        .limit(1)
        .maybeSingle();
      contactId = (data as { id: string } | null)?.id ?? null;
    }

    if (!contactId) {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          organization_id: orgId,
          company_id: companyId,
          first_name: firstName,
          last_name: lastName ?? null,
          email: email ?? null,
          phone: phone ?? null,
          whatsapp: phone ?? null,
          preferred_channel: email ? "email" : "whatsapp",
        })
        .select("id")
        .single();
      if (error) throw error;
      contactId = (data as { id: string }).id;
    }

    // 3. El prospecto.
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        organization_id: orgId,
        company_id: companyId,
        contact_id: contactId,
        source_id: sourceId,
        status: "new",
        note: intakeNote(input),
        next_action: input.preferredAt
          ? `Confirmar cita: ${input.preferredAt}`
          : "Responder por WhatsApp",
      })
      .select("id")
      .single();
    if (leadError) throw leadError;

    return NextResponse.json(
      { ok: true, leadId: (lead as { id: string }).id },
      { status: 201 },
    );
  } catch (error) {
    // El detalle va al log del servidor, no a la respuesta.
    console.error("intake/lead:", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
}

/** Devuelve el id de la fila con ese nombre en la organización, creándola la primera vez. */
async function ensureRow(
  supabase: ReturnType<typeof createClient<Database>>,
  table: "lead_sources" | "companies",
  organizationId: string,
  name: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", name)
    .limit(1)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data, error } = await supabase
    .from(table)
    .insert({ organization_id: organizationId, name })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}
