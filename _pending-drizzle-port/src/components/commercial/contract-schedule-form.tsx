"use client";

import { useMemo, useState } from "react";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { ActionFeedbackForm } from "@/components/ui/action-feedback-form";
import { saveContractWithSchedule } from "@/app/actions/commercial";
import {
  buildSchedule,
  scheduleMatchesTotal,
  type Frequency,
  type Installment,
} from "@/features/commercial/domain/payment-schedule";

/* El formulario habla como se habla al cerrar una venta: "300, en dos
   veces, la primera el 6". El calendario se propone solo y cada cuota queda
   editable, porque las fechas reales casi nunca caen exactas.

   Se ve el total de las cuotas junto al del contrato mientras escribes: si
   no cuadran, el botón no deja guardar. Vale más avisar aquí que dejar el
   contrato torcido en la base de datos. */

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const today = () => new Date().toISOString().slice(0, 10);

type Props = {
  companies: Array<{ id: string; name: string }>;
  proposals: Array<{ id: string; title: string }>;
  defaultCompanyId?: string;
};

export function ContractScheduleForm({ companies, proposals, defaultCompanyId }: Props) {
  const [total, setTotal] = useState("");
  const [count, setCount] = useState(1);
  const [firstDate, setFirstDate] = useState(today);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  // Ediciones manuales sobre la propuesta automática, por índice de cuota.
  const [edits, setEdits] = useState<Record<number, Partial<Installment>>>({});

  const amount = Number(total) || 0;

  const installments = useMemo(() => {
    const base = buildSchedule(amount, count, firstDate, frequency);
    return base.map((cuota, i) => ({ ...cuota, ...edits[i] }));
  }, [amount, count, firstDate, frequency, edits]);

  const sum = installments.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const cuadra = installments.length > 0 && scheduleMatchesTotal(installments, amount);

  const editar = (i: number, campo: keyof Installment, valor: string) =>
    setEdits((prev) => ({
      ...prev,
      [i]: { ...prev[i], [campo]: campo === "amount" ? Number(valor) : valor },
    }));

  // Cambiar el número de cuotas rehace la propuesta: mantener ediciones
  // viejas dejaría filas que ya no corresponden a nada.
  const cambiarCantidad = (valor: number) => {
    setCount(valor);
    setEdits({});
  };

  return (
    <ActionFeedbackForm
      action={saveContractWithSchedule}
      successMessage="Contrato y cuotas guardados correctamente"
      className="border border-brand-border bg-brand-surface-elevated p-5"
    >
      <h2 className="font-semibold">Nuevo contrato</h2>

      <select
        required
        name="companyId"
        defaultValue={defaultCompanyId ?? ""}
        aria-label="Cliente"
        className="mt-4 w-full border border-brand-border bg-brand-bg p-2.5"
      >
        <option value="">Cliente</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>

      <input
        required
        name="title"
        placeholder="Qué le vendes (ej. Sistema de pedidos)"
        className="mt-3 w-full border border-brand-border bg-brand-bg p-2.5"
      />

      <select
        name="proposalId"
        aria-label="Propuesta"
        className="mt-3 w-full border border-brand-border bg-brand-bg p-2.5"
      >
        <option value="">Propuesta (opcional)</option>
        {proposals.map((proposal) => (
          <option key={proposal.id} value={proposal.id}>
            {proposal.title}
          </option>
        ))}
      </select>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-xs text-brand-muted">
          Monto total
          <input
            required
            name="total"
            type="number"
            min="0.01"
            step="0.01"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="300"
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2.5 text-base text-brand-text"
          />
        </label>
        <label className="text-xs text-brand-muted">
          Se paga en
          <select
            value={count}
            onChange={(e) => cambiarCantidad(Number(e.target.value))}
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2.5 text-base text-brand-text"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1 pago" : `${n} cuotas`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-xs text-brand-muted">
          Primer pago
          <input
            required
            name="startsOn"
            type="date"
            value={firstDate}
            onChange={(e) => setFirstDate(e.target.value)}
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2.5 text-base text-brand-text"
          />
        </label>
        <label className="text-xs text-brand-muted">
          Cada
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            disabled={count === 1}
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2.5 text-base text-brand-text disabled:opacity-40"
          >
            <option value="monthly">mes</option>
            <option value="biweekly">quincena</option>
            <option value="weekly">semana</option>
          </select>
        </label>
      </div>

      {installments.length > 0 && (
        <div className="mt-5 border-t border-brand-border pt-4">
          <p className="mono text-xs uppercase tracking-[.16em] text-brand-muted">
            Cuotas
          </p>
          <ul className="mt-3 space-y-2">
            {installments.map((cuota, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="mono w-6 shrink-0 text-xs text-brand-muted">
                  {i + 1}
                </span>
                <input
                  name="dueDate"
                  type="date"
                  value={cuota.dueDate}
                  onChange={(e) => editar(i, "dueDate", e.target.value)}
                  aria-label={`Fecha de la cuota ${i + 1}`}
                  className="min-w-0 flex-1 border border-brand-border bg-brand-bg p-2 text-sm"
                />
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={cuota.amount}
                  onChange={(e) => editar(i, "amount", e.target.value)}
                  aria-label={`Monto de la cuota ${i + 1}`}
                  className="w-24 shrink-0 border border-brand-border bg-brand-bg p-2 text-sm"
                />
              </li>
            ))}
          </ul>

          <p
            className={`mt-3 text-xs ${cuadra ? "text-brand-muted" : "text-brand-primary"}`}
            role={cuadra ? undefined : "alert"}
          >
            {cuadra
              ? `Las cuotas suman ${money.format(sum)}.`
              : `Las cuotas suman ${money.format(sum)} y el contrato es de ${money.format(amount)}.`}
          </p>
        </div>
      )}

      <ActionSubmitButton className="mt-5 w-full" disabled={!cuadra}>
        Guardar contrato y cuotas
      </ActionSubmitButton>
      <p className="mt-2 text-xs text-brand-muted">
        Se crea el contrato y una factura por cuota. Registra el pago de cada
        una cuando la cobres.
      </p>
    </ActionFeedbackForm>
  );
}
