import { z } from "zod";

/* Entrada de prospectos desde fuera del CRM (hoy: el formulario de agenda
   de automailabs.com). Se valida aquí, en dominio puro y sin tocar red, para
   poder probarlo sin Supabase y para que la ruta HTTP se quede solo con el
   transporte. */

const text = (max: number) => z.string().trim().min(1).max(max);

export const webIntakeSchema = z.object({
  // Quién escribe. `name` llega como un solo campo desde la web.
  name: text(160),
  contact: text(160), // teléfono o correo, tal cual lo escribió
  // Contexto comercial, todo opcional: el formulario permite saltárselo.
  situation: z.string().trim().max(200).optional(),
  interests: z.array(z.string().trim().max(80)).max(10).default([]),
  problem: z.string().trim().max(2_000).optional(),
  preferredAt: z.string().trim().max(120).optional(), // "miércoles 23, 10:00"
  locale: z.enum(["es", "en"]).default("es"),
});

export type WebIntake = z.infer<typeof webIntakeSchema>;

/** "Ana María Pérez" → { firstName: "Ana", lastName: "María Pérez" } */
export function splitName(full: string): {
  firstName: string;
  lastName?: string;
} {
  const parts = full.trim().split(/\s+/);
  const firstName = parts.shift() ?? full.trim();
  const lastName = parts.join(" ");
  return { firstName, lastName: lastName || undefined };
}

/* El formulario pide "WhatsApp o correo" en un solo campo, así que hay que
   adivinar cuál es. Un correo siempre lleva "@"; lo demás se trata como
   teléfono y se limpia de separadores para poder buscar duplicados después. */
export function classifyContact(raw: string): {
  email?: string;
  phone?: string;
} {
  const value = raw.trim();
  if (value.includes("@")) return { email: value.toLowerCase() };
  const digits = value.replace(/[^\d+]/g, "");
  return { phone: digits || undefined };
}

/* La nota es lo único que ve quien abra el prospecto en el CRM, así que
   lleva todo lo que el visitante contestó. Se arma aquí para que el texto
   quede cubierto por tests y no enterrado en la ruta. */
export function intakeNote(input: WebIntake): string {
  const lines = [
    input.locale === "en"
      ? "Lead from the website booking form."
      : "Prospecto desde el formulario de agenda de la web.",
  ];
  if (input.situation) lines.push(`Situación: ${input.situation}`);
  if (input.interests.length) lines.push(`Interés: ${input.interests.join(", ")}`);
  if (input.preferredAt) lines.push(`Prefiere: ${input.preferredAt}`);
  if (input.problem) lines.push(`Problema: ${input.problem}`);
  return lines.join("\n");
}

/* El visitante no da el nombre de su negocio. Usar su propio nombre como
   "empresa" ensuciaría el listado de empresas, así que todos los prospectos
   web cuelgan de una sola cuenta paraguas que se reconoce a simple vista y
   se reasigna a mano cuando el trato avanza. */
export const WEB_COMPANY_NAME = "Entradas web — sin calificar";
export const WEB_SOURCE_NAME = "Sitio web";
