/* El formulario del diagnóstico pedía escribir a mano una "clave de
   pregunta": un nombre de columna asomando a la pantalla. Nadie sabe qué
   poner ahí, y cada diagnóstico acababa con claves distintas, así que no se
   podían comparar dos clientes entre sí.

   Con un catálogo fijo las respuestas quedan alineadas: todos los
   diagnósticos contestan lo mismo y el histórico sirve para algo. La clave
   sigue siendo texto en la base de datos, así que añadir preguntas después
   no rompe lo ya guardado. */

export type DiagnosticQuestion = { key: string; label: string; hint?: string };

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    key: "situacion_actual",
    label: "¿Cómo atiende hoy a sus clientes?",
    hint: "Canales, quién responde, en cuánto tiempo.",
  },
  {
    key: "donde_pierde",
    label: "¿Dónde se le están perdiendo clientes?",
    hint: "El punto concreto: no contesta, no hace seguimiento, no lo encuentran.",
  },
  {
    key: "volumen",
    label: "¿Cuántos contactos recibe al mes?",
  },
  {
    key: "herramientas",
    label: "¿Qué herramientas usa ya?",
    hint: "Lo que haya que respetar o conectar.",
  },
  {
    key: "quien_decide",
    label: "¿Quién decide la compra?",
  },
  {
    key: "presupuesto",
    label: "¿Qué presupuesto maneja?",
  },
  {
    key: "urgencia",
    label: "¿Para cuándo lo necesita?",
  },
  {
    key: "exito",
    label: "¿Qué tendría que pasar para que valga la pena?",
    hint: "Su definición de éxito, en sus palabras.",
  },
];

export function questionLabel(key: string): string {
  return DIAGNOSTIC_QUESTIONS.find((q) => q.key === key)?.label ?? key;
}

export const INTEREST_LABELS = {
  wanted: "Lo quiere",
  later: "Más adelante",
  declined: "Lo descartó",
} as const;

export type Interest = keyof typeof INTEREST_LABELS;
