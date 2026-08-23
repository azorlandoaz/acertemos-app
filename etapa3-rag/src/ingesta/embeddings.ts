import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { IAProvider } from "etapa2-api";
import type { Fragmento } from "./chunker.js";

function claveDe(f: Fragmento): string {
  const hash = createHash("sha256").update(f.texto).digest("hex").slice(0, 16);
  return `${f.documento}::${f.seccion}::${hash}`;
}

function cargarCache(rutaCache: string): Record<string, number[]> {
  if (!existsSync(rutaCache)) return {};
  return JSON.parse(readFileSync(rutaCache, "utf-8"));
}

function guardarCache(rutaCache: string, cache: Record<string, number[]>): void {
  mkdirSync(path.dirname(rutaCache), { recursive: true });
  writeFileSync(rutaCache, JSON.stringify(cache, null, 2), "utf-8");
}

/** Genera embeddings para fragmentos que no estén ya en la cache de disco,
 * evitando recalcular en cada arranque de la ingesta. */
export async function generarEmbeddingsConCache(
  fragmentos: Fragmento[],
  proveedor: IAProvider,
  rutaCache: string
): Promise<Map<string, number[]>> {
  const cache = cargarCache(rutaCache);
  const resultado = new Map<string, number[]>();
  const pendientes: { clave: string; texto: string }[] = [];

  for (const f of fragmentos) {
    const clave = claveDe(f);
    if (cache[clave]) {
      resultado.set(clave, cache[clave]);
    } else {
      pendientes.push({ clave, texto: f.texto });
    }
  }

  if (pendientes.length > 0) {
    const nuevosEmbeddings = await proveedor.embeber(pendientes.map((p) => p.texto));
    pendientes.forEach((p, i) => {
      cache[p.clave] = nuevosEmbeddings[i];
      resultado.set(p.clave, nuevosEmbeddings[i]);
    });
    guardarCache(rutaCache, cache);
  }

  return resultado;
}
