import { describe, expect, it } from "vitest";
import {
  classifyContact,
  intakeNote,
  splitName,
  webIntakeSchema,
} from "./web-intake";

describe("webIntakeSchema", () => {
  it("acepta el mínimo que el formulario garantiza", () => {
    const parsed = webIntakeSchema.parse({ name: "Ana", contact: "0999999999" });
    expect(parsed.interests).toEqual([]);
    expect(parsed.locale).toBe("es");
  });

  it("rechaza nombre vacío y contacto vacío", () => {
    expect(webIntakeSchema.safeParse({ name: "  ", contact: "x" }).success).toBe(false);
    expect(webIntakeSchema.safeParse({ name: "Ana", contact: "" }).success).toBe(false);
  });

  it("acota el texto libre para que nadie use el endpoint de almacén", () => {
    const largo = "a".repeat(5_000);
    expect(webIntakeSchema.safeParse({ name: "Ana", contact: "a@b.c", problem: largo }).success).toBe(false);
  });
});

describe("splitName", () => {
  it("separa nombre y apellidos", () => {
    expect(splitName("Ana María Pérez")).toEqual({ firstName: "Ana", lastName: "María Pérez" });
  });
  it("deja el apellido vacío si solo hay una palabra", () => {
    expect(splitName("Ana")).toEqual({ firstName: "Ana", lastName: undefined });
  });
});

describe("classifyContact", () => {
  it("reconoce un correo y lo normaliza", () => {
    expect(classifyContact("  Ana@Correo.COM ")).toEqual({ email: "ana@correo.com" });
  });
  it("trata lo demás como teléfono y le quita separadores", () => {
    expect(classifyContact("+593 99 457 3329")).toEqual({ phone: "+593994573329" });
  });
});

describe("intakeNote", () => {
  it("recoge todo lo que contestó el visitante", () => {
    const nota = intakeNote(
      webIntakeSchema.parse({
        name: "Ana",
        contact: "a@b.c",
        situation: "Tengo web pero no me trae clientes",
        interests: ["Página web", "CRM"],
        preferredAt: "miércoles 23, 10:00",
        problem: "No alcanzo a responder WhatsApp",
      }),
    );
    expect(nota).toContain("Situación: Tengo web pero no me trae clientes");
    expect(nota).toContain("Interés: Página web, CRM");
    expect(nota).toContain("Prefiere: miércoles 23, 10:00");
    expect(nota).toContain("Problema: No alcanzo a responder WhatsApp");
  });

  it("omite las líneas que el visitante dejó en blanco", () => {
    const nota = intakeNote(webIntakeSchema.parse({ name: "Ana", contact: "a@b.c" }));
    expect(nota).not.toContain("Situación:");
    expect(nota.split("\n")).toHaveLength(1);
  });
});
