export type Frequency = "monthly" | "biweekly" | "weekly";

export type Installment = { dueDate: string; amount: number };

/* Un contrato de 300 pagado en dos veces son dos facturas con vencimientos
   distintos, no un contrato con fecha de inicio y de fin. El esquema ya lo
   permite (`invoices.contract_id`), lo que faltaba era generarlas.

   Esto solo calcula la propuesta inicial: en el formulario cada cuota se
   puede editar, porque en la vida real las fechas se negocian y casi nunca
   caen exactas. */

const STEP_DAYS: Record<Frequency, number> = { weekly: 7, biweekly: 14, monthly: 0 };

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + months, 1));
  // Si el día no existe en el mes destino (31 → febrero), se usa el último.
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(d, lastDay));
  return base.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Reparte el total en `count` cuotas; el redondeo sobrante cae en la última. */
export function buildSchedule(
  total: number,
  count: number,
  firstDate: string,
  frequency: Frequency = "monthly",
): Installment[] {
  if (!Number.isFinite(total) || total <= 0) return [];
  if (!Number.isInteger(count) || count < 1) return [];

  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;

  return Array.from({ length: count }, (_, i) => ({
    dueDate:
      i === 0
        ? firstDate
        : frequency === "monthly"
          ? addMonths(firstDate, i)
          : addDays(firstDate, STEP_DAYS[frequency] * i),
    // Todo el sobrante a la última para que la suma cuadre al céntimo.
    amount: (i === count - 1 ? base + remainder : base) / 100,
  }));
}

/** Lo que de verdad importa antes de guardar: que las cuotas sumen el total. */
export function scheduleMatchesTotal(
  installments: Installment[],
  total: number,
): boolean {
  const sum = installments.reduce((acc, i) => acc + Math.round(i.amount * 100), 0);
  return sum === Math.round(total * 100);
}
