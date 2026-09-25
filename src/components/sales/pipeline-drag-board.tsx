"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { ActionFeedbackForm } from "@/components/ui/action-feedback-form";
import type { ActionResult } from "@/lib/actions/safe-action";
import {
  closedLabel,
  type BoardColumn,
} from "@/features/sales/domain/pipeline-board";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function PipelineDragBoard({
  columns,
  updateDealStage,
  startDiagnostic,
}: {
  columns: BoardColumn[];
  updateDealStage: (formData: FormData) => Promise<ActionResult>;
  startDiagnostic: (formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  // `isPending` sigue en true durante todo el `router.refresh()`, no solo
  // durante el `await` de la acción — es lo que marca cuándo ya llegaron los
  // datos nuevos del servidor, momento en el que soltamos la tarjeta.
  useEffect(() => {
    if (!isPending) setMovingId(null);
  }, [isPending]);

  const dealById = new Map(
    columns.flatMap((column) => column.deals).map((deal) => [deal.id, deal]),
  );

  function moveDeal(dealId: string, stageId: string) {
    const formData = new FormData();
    formData.set("dealId", dealId);
    formData.set("stageId", stageId);
    setMovingId(dealId);
    startTransition(async () => {
      await updateDealStage(formData);
      router.refresh();
    });
  }

  return (
    <div
      className="mt-7 grid gap-4 overflow-x-auto"
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(240px, 1fr))`,
      }}
    >
      {columns.map(({ stage, deals: columnDeals, count, total }) => (
        <section
          key={stage.id}
          onDragOver={(event) => {
            const deal = draggingId ? dealById.get(draggingId) : undefined;
            if (deal && deal.pipeline_id !== stage.pipeline_id) return;
            event.preventDefault();
            setOverStageId(stage.id);
          }}
          onDragLeave={() =>
            setOverStageId((current) => (current === stage.id ? null : current))
          }
          onDrop={(event) => {
            event.preventDefault();
            setOverStageId(null);
            const dealId = event.dataTransfer.getData("text/deal-id");
            const deal = dealId ? dealById.get(dealId) : undefined;
            if (deal && deal.pipeline_id === stage.pipeline_id)
              moveDeal(dealId, stage.id);
          }}
          className={`min-w-[240px] border bg-brand-surface-elevated transition-colors ${
            overStageId === stage.id
              ? "border-brand-primary bg-brand-surface"
              : "border-brand-border"
          }`}
        >
          {/* La cabecera lleva cuántas y cuánto: es lo que convierte el
              tablero en una lectura del embudo y no en una lista. */}
          <div
            className="border-b border-brand-border border-l-4 p-4"
            style={{ borderLeftColor: stage.color }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">{stage.name}</h2>
              <span className="mono text-xs text-brand-muted">{count}</span>
            </div>
            <p className="mono mt-1 text-xs text-brand-muted">
              {money.format(total)}
            </p>
          </div>

          <div className="space-y-3 p-3">
            {columnDeals.length === 0 && (
              <p className="p-2 text-xs text-brand-muted">
                Nada en esta etapa.
              </p>
            )}

            {columnDeals.map((deal) => {
              const closed = closedLabel(deal.status);
              return (
                <article
                  id={`deal-${deal.id}`}
                  key={deal.id}
                  tabIndex={-1}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/deal-id", deal.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingId(deal.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverStageId(null);
                  }}
                  className={`cursor-grab border bg-brand-bg p-3 transition-opacity active:cursor-grabbing ${
                    closed
                      ? "border-brand-border opacity-80"
                      : "border-brand-primary"
                  } ${draggingId === deal.id ? "opacity-40" : ""} ${
                    movingId === deal.id ? "pointer-events-none animate-pulse opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/sales/pipeline/${deal.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {deal.name}
                    </Link>
                    {movingId === deal.id ? (
                      <span className="mono shrink-0 text-[10px] uppercase text-brand-primary">
                        Moviendo…
                      </span>
                    ) : (
                      closed && (
                        <span className="mono shrink-0 border border-brand-border px-1.5 py-0.5 text-[10px] uppercase text-brand-muted">
                          {closed}
                        </span>
                      )
                    )}
                  </div>

                  {deal.companyName && (
                    <p className="mt-1 text-xs text-brand-muted">
                      {deal.companyName}
                    </p>
                  )}
                  {Number(deal.implementation_value) > 0 && (
                    <p className="mono mt-1 text-xs">
                      {money.format(Number(deal.implementation_value))}
                    </p>
                  )}

                  <p className="mt-2 text-[11px] text-brand-muted">
                    Arrastra la tarjeta a otra columna para moverla.
                  </p>

                  <ActionFeedbackForm
                    action={updateDealStage}
                    successMessage="Etapa actualizada correctamente"
                    className="mt-2 flex gap-2"
                  >
                    <input type="hidden" name="dealId" value={deal.id} />
                    <select
                      name="stageId"
                      defaultValue={stage.id}
                      aria-label={`Mover ${deal.name}`}
                      className="min-w-0 flex-1 border border-brand-border bg-brand-surface-elevated p-1.5 text-xs"
                    >
                      {columns
                        .map((column) => column.stage)
                        .filter((option) => option.pipeline_id === deal.pipeline_id)
                        .map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                    </select>
                    <ActionSubmitButton className="text-xs">
                      Mover
                    </ActionSubmitButton>
                  </ActionFeedbackForm>

                  {/* El diagnóstico solo tiene sentido mientras la venta
                      sigue viva; en una cerrada estorba. */}
                  {!closed && (
                    <ActionFeedbackForm action={startDiagnostic} successMessage="Diagnóstico iniciado correctamente" className="mt-2">
                      <input type="hidden" name="dealId" value={deal.id} />
                      <ActionSubmitButton className="text-xs">
                        Iniciar diagnóstico
                      </ActionSubmitButton>
                    </ActionFeedbackForm>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
