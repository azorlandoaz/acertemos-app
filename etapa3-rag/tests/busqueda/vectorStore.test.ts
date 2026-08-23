import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buscar, cargarIndice, guardarIndice, type EntradaIndice } from "../../src/busqueda/vectorStore.js";

let dirTemporal: string;
let rutaIndice: string;

beforeEach(() => {
  dirTemporal = mkdtempSync(path.join(tmpdir(), "vectorstore-test-"));
  rutaIndice = path.join(dirTemporal, "indice.json");
});

afterEach(() => {
  rmSync(dirTemporal, { recursive: true, force: true });
});

const ENTRADAS: EntradaIndice[] = [
  { documento: "a.pdf", seccion: "1", texto: "vacaciones anticipacion", embedding: [1, 0, 0] },
  { documento: "b.pdf", seccion: "2", texto: "viaticos hospedaje", embedding: [0, 1, 0] },
  { documento: "c.pdf", seccion: "3", texto: "acceso bloqueo usuario", embedding: [0, 0, 1] },
];

describe("vectorStore", () => {
  it("guarda y vuelve a cargar el indice sin perder datos", () => {
    guardarIndice(ENTRADAS, rutaIndice);
    const recargado = cargarIndice(rutaIndice);
    expect(recargado).toEqual(ENTRADAS);
  });

  it("buscar devuelve las k entradas mas similares por coseno, ordenadas descendente", () => {
    const resultado = buscar(ENTRADAS, [1, 0.1, 0], 2);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].entrada.documento).toBe("a.pdf");
    expect(resultado[0].similitud).toBeGreaterThan(resultado[1].similitud);
  });

  it("cargarIndice devuelve lista vacia si el archivo no existe", () => {
    expect(cargarIndice(path.join(dirTemporal, "no-existe.json"))).toEqual([]);
  });
});
