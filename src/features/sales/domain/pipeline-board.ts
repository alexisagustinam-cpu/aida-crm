export type BoardStage = {
  id: string;
  name: string;
  color: string;
  position: number;
  pipeline_id: string;
  stage_kind: "open" | "won" | "lost";
};

export type BoardDeal = {
  id: string;
  name: string;
  stage_id: string;
  pipeline_id: string;
  implementation_value: number;
  status: string;
  companyName?: string | null;
};

export type BoardColumn = {
  stage: BoardStage;
  deals: BoardDeal[];
  count: number;
  total: number;
};

/* El tablero filtraba `status === 'open'`, y mover una oportunidad a
   "Ganado" le pone `status: 'won'`. Resultado: la tarjeta desaparecía justo
   al ganarla, y las columnas Ganado y Perdido no podían mostrar nada nunca.
   Una oportunidad pertenece a la columna de su etapa, esté abierta o
   cerrada; el estado sirve para pintarla distinta, no para esconderla. */
export function buildBoard(
  stages: BoardStage[],
  deals: BoardDeal[],
): BoardColumn[] {
  return stages.map((stage) => {
    const inStage = deals.filter((deal) => deal.stage_id === stage.id);
    return {
      stage,
      deals: inStage,
      count: inStage.length,
      total: inStage.reduce(
        (sum, deal) => sum + Number(deal.implementation_value || 0),
        0,
      ),
    };
  });
}

/** Etiqueta corta para la tarjeta: solo se muestra cuando ya está cerrada. */
export function closedLabel(status: string): string | null {
  if (status === "won") return "Ganada";
  if (status === "lost") return "Perdida";
  return null;
}
