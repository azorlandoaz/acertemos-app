import path from "node:path";
import { describe, expect, it } from "vitest";
import { extraerTexto } from "../../src/ingesta/pdfParser.js";

const POLITICAS_DIR = path.resolve(__dirname, "../../../materiales/politicas");

describe("extraerTexto", () => {
  it("extrae texto no vacío de un PDF real de políticas", async () => {
    const ruta = path.join(POLITICAS_DIR, "POL-GTH-01_Vacaciones.pdf");
    const texto = await extraerTexto(ruta);
    expect(texto.length).toBeGreaterThan(100);
    expect(texto.toLowerCase()).toContain("vacaciones");
  });

  it("lanza un error claro si el archivo no existe", async () => {
    await expect(extraerTexto("no-existe.pdf")).rejects.toThrow();
  });
});
