import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_QUESTIONS,
  INTEREST_LABELS,
  questionLabel,
} from "./diagnostic-questions";

describe("DIAGNOSTIC_QUESTIONS", () => {
  it("no repite claves: cada pregunta guarda una respuesta distinta", () => {
    const keys = DIAGNOSTIC_QUESTIONS.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("toda pregunta tiene texto para mostrar", () => {
    for (const q of DIAGNOSTIC_QUESTIONS) {
      expect(q.label.length).toBeGreaterThan(0);
    }
  });
});

describe("questionLabel", () => {
  it("traduce la clave guardada al texto de la pregunta", () => {
    expect(questionLabel("donde_pierde")).toBe("¿Dónde se le están perdiendo clientes?");
  });

  it("una clave vieja que ya no está en el catálogo se muestra tal cual, no rota", () => {
    expect(questionLabel("clave_que_ya_no_existe")).toBe("clave_que_ya_no_existe");
  });
});

describe("INTEREST_LABELS", () => {
  it("cubre los tres estados que acepta la base de datos", () => {
    expect(Object.keys(INTEREST_LABELS).sort()).toEqual(["declined", "later", "wanted"]);
  });
});
