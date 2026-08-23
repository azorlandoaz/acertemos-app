import { describe, expect, it } from "vitest";
import { promptClasificacion } from "../../src/ia/prompts.js";

describe("promptClasificacion", () => {
  it("incluye el texto de la solicitud y el catálogo de categorías", () => {
    const prompt = promptClasificacion("El portátil no enciende desde ayer");
    expect(prompt).toContain("El portátil no enciende desde ayer");
    expect(prompt).toContain("Hardware");
    expect(prompt).toContain("JSON");
  });
});
