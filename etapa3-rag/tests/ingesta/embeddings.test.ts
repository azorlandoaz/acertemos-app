import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generarEmbeddingsConCache } from "../../src/ingesta/embeddings.js";
import type { Fragmento } from "../../src/ingesta/chunker.js";
import type { IAProvider } from "etapa2-api";

let dirTemporal: string;

beforeEach(() => {
  dirTemporal = mkdtempSync(path.join(tmpdir(), "embeddings-test-"));
});

afterEach(() => {
  rmSync(dirTemporal, { recursive: true, force: true });
});

function proveedorFalso(): IAProvider {
  return {
    clasificar: vi.fn(),
    generarRespuesta: vi.fn(),
    embeber: vi.fn(async (textos: string[]) => textos.map((t) => [t.length, 1])),
  };
}

describe("generarEmbeddingsConCache", () => {
  it("genera un embedding por fragmento y lo persiste en cache", async () => {
    const fragmentos: Fragmento[] = [{ documento: "d.pdf", seccion: "1", texto: "hola mundo" }];
    const proveedor = proveedorFalso();
    const rutaCache = path.join(dirTemporal, "cache.json");

    const mapa = await generarEmbeddingsConCache(fragmentos, proveedor, rutaCache);

    expect(mapa.size).toBe(1);
    expect(proveedor.embeber).toHaveBeenCalledTimes(1);
    const contenidoCache = JSON.parse(readFileSync(rutaCache, "utf-8"));
    expect(Object.keys(contenidoCache)).toHaveLength(1);
  });

  it("no vuelve a llamar al proveedor para un fragmento ya cacheado", async () => {
    const fragmentos: Fragmento[] = [{ documento: "d.pdf", seccion: "1", texto: "hola mundo" }];
    const proveedor = proveedorFalso();
    const rutaCache = path.join(dirTemporal, "cache.json");

    await generarEmbeddingsConCache(fragmentos, proveedor, rutaCache);
    await generarEmbeddingsConCache(fragmentos, proveedor, rutaCache);

    expect(proveedor.embeber).toHaveBeenCalledTimes(1);
  });
});
