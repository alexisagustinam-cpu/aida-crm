import Link from "next/link";
import { startDiagnostic, updateDealStage } from "@/app/actions/sales";
import { EmptyState } from "@/components/sales/empty-state";
import { SaveNotice } from "@/components/sales/save-notice";
import { PipelineDragBoard } from "@/components/sales/pipeline-drag-board";
import { getOrganizationContext } from "@/lib/supabase/context";
import { selectedRecord } from "@/features/dashboard/domain/search-routes";
import {
  buildBoard,
  type BoardDeal,
  type BoardStage,
} from "@/features/sales/domain/pipeline-board";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ deal?: string; notice?: string }>;
}) {
  const { deal: requestedDeal, notice } = await searchParams;
  const { supabase, organizationId } = await getOrganizationContext();

  const [{ data: stageData }, { data: dealData }, { count: openLeadCount }] =
    await Promise.all([
      supabase
        .from("pipeline_stages")
        .select("id, name, color, position, pipeline_id, stage_kind")
        .eq("organization_id", organizationId!)
        .order("position"),
      supabase
        .from("deals")
        .select(
          "id, name, stage_id, pipeline_id, implementation_value, status, companies(name)",
        )
        .eq("organization_id", organizationId!),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId!)
        .in("status", ["new", "contacted"]),
    ]);

  const stages = (stageData ?? []) as BoardStage[];
  const allDeals = ((dealData ?? []) as unknown as Array<
    BoardDeal & { companies: { name: string } | null }
  >).map((deal) => ({ ...deal, companyName: deal.companies?.name ?? null }));

  const { records: deals, found } = selectedRecord(allDeals, requestedDeal);
  const columns = buildBoard(stages, deals);

  return (
    <div className="product-grid min-h-[calc(100dvh-72px)] p-5 md:p-8">
      <p className="mono text-xs uppercase tracking-[.16em] text-brand-primary">
        Ventas / Pipeline
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-.06em]">
        Pipeline comercial
      </h1>
      <SaveNotice
        message={notice === "converted" ? "Oportunidad creada correctamente" : undefined}
      />
      {/* Un prospecto recién contactado no tiene todavía un valor de negocio
          real, así que no aparece aquí como tarjeta — vive en Prospectos
          hasta que responda con interés real y alguien lo convierte. Este
          aviso es lo que evita que parezca que "se perdieron". */}
      {!!openLeadCount && (
        <p className="mt-4 text-sm text-brand-muted">
          {openLeadCount} prospecto{openLeadCount === 1 ? "" : "s"} sin
          convertir todavía (sin respuesta o en conversación) —{" "}
          <Link
            href="/sales/leads"
            className="text-brand-primary underline underline-offset-4"
          >
            verlos en Prospectos
          </Link>
          . Cuando uno muestre interés real, conviértelo desde ahí para que
          entre aquí con un valor de negocio.
        </p>
      )}
      {requestedDeal && !found && (
        <p role="alert" className="mt-4 text-sm text-brand-muted">
          La oportunidad solicitada no existe o no está disponible para tu
          organización.
        </p>
      )}

      {stages.length === 0 ? (
        <div className="mt-7">
          <EmptyState title="No hay pipeline disponible todavía." />
        </div>
      ) : (
        <PipelineDragBoard
          columns={columns}
          updateDealStage={updateDealStage}
          startDiagnostic={startDiagnostic}
        />
      )}
    </div>
  );
}
