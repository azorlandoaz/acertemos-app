import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HeuristicProvider } from "etapa2-api";
import { ingestarDirectorio } from "../../src/ingesta/ingestar.js";
import { cargarIndice } from "../../src/busqueda/vectorStore.js";

const POLITICAS_DIR = path.resolve(__dirname, "../../../materiales/politicas");
let dirTemporal: string;

beforeEach(() => {
  dirTemporal = mkdtempSync(path.join(tmpdir(), "ingestar-test-"));
});

afterEach(() => {
  rmSync(dirTemporal, { recursive: true, force: true });
});

describe("ingestarDirectorio", () => {
  it("ingesta los 5 PDF reales de politicas y produce un indice no vacio", async () => {
    const rutaIndice = path.join(dirTemporal, "indice.json");
    const rutaCache = path.join(dirTemporal, "cache.json");

    const cantidad = await ingestarDirectorio(POLITICAS_DIR, rutaIndice, rutaCache, new HeuristicProvider());

    expect(cantidad).toBeGreaterThan(0);
    const indice = cargarIndice(rutaIndice);
    expect(indice.length).toBe(cantidad);
    const documentosUnicos = new Set(indice.map((e) => e.documento));
    expect(documentosUnicos.size).toBe(5);
  });
});
