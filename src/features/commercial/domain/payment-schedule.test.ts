import { describe, expect, it } from "vitest";
import { buildSchedule, scheduleMatchesTotal } from "./payment-schedule";

describe("buildSchedule", () => {
  it("parte un total redondo en cuotas iguales", () => {
    const cuotas = buildSchedule(300, 3, "2026-08-06");
    expect(cuotas.map((c) => c.amount)).toEqual([100, 100, 100]);
    expect(cuotas.map((c) => c.dueDate)).toEqual([
      "2026-08-06",
      "2026-09-06",
      "2026-10-06",
    ]);
  });

  it("echa el redondeo sobrante en la última para que la suma cuadre", () => {
    const cuotas = buildSchedule(100, 3, "2026-08-06");
    expect(cuotas.map((c) => c.amount)).toEqual([33.33, 33.33, 33.34]);
    expect(scheduleMatchesTotal(cuotas, 100)).toBe(true);
  });

  it("una sola cuota es el total entero en la fecha dada", () => {
    expect(buildSchedule(250, 1, "2026-09-24")).toEqual([
      { dueDate: "2026-09-24", amount: 250 },
    ]);
  });

  it("no inventa el 31 en meses que no lo tienen", () => {
    const cuotas = buildSchedule(200, 2, "2026-01-31");
    expect(cuotas[1].dueDate).toBe("2026-02-28");
  });

  it("admite quincenal y semanal", () => {
    expect(buildSchedule(200, 2, "2026-08-06", "biweekly")[1].dueDate).toBe("2026-08-20");
    expect(buildSchedule(200, 2, "2026-08-06", "weekly")[1].dueDate).toBe("2026-08-13");
  });

  it("rechaza totales y conteos imposibles en vez de devolver basura", () => {
    expect(buildSchedule(0, 3, "2026-08-06")).toEqual([]);
    expect(buildSchedule(-50, 3, "2026-08-06")).toEqual([]);
    expect(buildSchedule(300, 0, "2026-08-06")).toEqual([]);
    expect(buildSchedule(300, 1.5, "2026-08-06")).toEqual([]);
  });
});

describe("scheduleMatchesTotal", () => {
  it("detecta cuando alguien editó una cuota y ya no cuadra", () => {
    const cuotas = buildSchedule(300, 2, "2026-08-06");
    cuotas[0].amount = 120;
    expect(scheduleMatchesTotal(cuotas, 300)).toBe(false);
  });

  it("no se deja engañar por los decimales del punto flotante", () => {
    expect(scheduleMatchesTotal(buildSchedule(0.3, 3, "2026-08-06"), 0.3)).toBe(true);
  });
});
