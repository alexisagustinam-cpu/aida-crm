import { describe, expect, it } from "vitest";
import { buildBoard, closedLabel, type BoardDeal, type BoardStage } from "./pipeline-board";

const stage = (id: string, kind: BoardStage["stage_kind"]): BoardStage => ({
  id,
  name: id,
  color: "#000",
  position: 0,
  pipeline_id: "p1",
  stage_kind: kind,
});

const deal = (id: string, stageId: string, status: string, value = 0): BoardDeal => ({
  id,
  name: id,
  stage_id: stageId,
  pipeline_id: "p1",
  implementation_value: value,
  status,
});

describe("buildBoard", () => {
  it("deja las ganadas en su columna en vez de esconderlas", () => {
    const board = buildBoard(
      [stage("negociacion", "open"), stage("ganado", "won")],
      [deal("a", "negociacion", "open"), deal("b", "ganado", "won")],
    );
    expect(board[1].deals.map((d) => d.id)).toEqual(["b"]);
  });

  it("deja también las perdidas", () => {
    const board = buildBoard(
      [stage("perdido", "lost")],
      [deal("c", "perdido", "lost")],
    );
    expect(board[0].count).toBe(1);
  });

  it("suma el valor de cada columna para leer el embudo de un vistazo", () => {
    const board = buildBoard(
      [stage("negociacion", "open")],
      [deal("a", "negociacion", "open", 300), deal("b", "negociacion", "open", 150)],
    );
    expect(board[0].total).toBe(450);
    expect(board[0].count).toBe(2);
  });

  it("una columna sin oportunidades queda en cero, no desaparece", () => {
    const board = buildBoard([stage("prueba", "open")], []);
    expect(board).toHaveLength(1);
    expect(board[0].total).toBe(0);
  });
});

describe("closedLabel", () => {
  it("solo etiqueta las cerradas", () => {
    expect(closedLabel("open")).toBeNull();
    expect(closedLabel("won")).toBe("Ganada");
    expect(closedLabel("lost")).toBe("Perdida");
  });
});
