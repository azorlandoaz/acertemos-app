import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Fragmento } from "../ingesta/chunker.js";

export interface EntradaIndice extends Fragmento {
  embedding: number[];
}

export function guardarIndice(entradas: EntradaIndice[], ruta: string): void {
  mkdirSync(path.dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(entradas, null, 2), "utf-8");
}

export function cargarIndice(ruta: string): EntradaIndice[] {
  if (!existsSync(ruta)) return [];
  return JSON.parse(readFileSync(ruta, "utf-8"));
}

function similitudCoseno(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `similitudCoseno: dimensiones incompatibles (${a.length} vs ${b.length}) - el índice y la consulta deben usar el mismo proveedor de embeddings`
    );
  }
  let producto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i++) {
    producto += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }
  if (normaA === 0 || normaB === 0) return 0;
  return producto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

/** Recupera las k entradas más similares por coseno a `embeddingConsulta`,
 * ordenadas de mayor a menor similitud. */
export function buscar(
  indice: EntradaIndice[],
  embeddingConsulta: number[],
  k: number
): { entrada: EntradaIndice; similitud: number }[] {
  return indice
    .map((entrada) => ({ entrada, similitud: similitudCoseno(entrada.embedding, embeddingConsulta) }))
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, k);
}
