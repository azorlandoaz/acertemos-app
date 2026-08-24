import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { IAProvider } from "etapa2-api";
import { HeuristicProvider } from "etapa2-api";
import { guardarIndice, type EntradaIndice } from "../busqueda/vectorStore.js";
import { fragmentarPorSeccion } from "./chunker.js";
import { claveDe, generarEmbeddingsConCache } from "./embeddings.js";
import { extraerTexto } from "./pdfParser.js";

/** Ingesta todos los PDF de un directorio: extrae, fragmenta, genera
 * embeddings (con cache) y persiste el índice vectorial. Devuelve la
 * cantidad de fragmentos indexados. */
export async function ingestarDirectorio(
  dirPdfs: string,
  rutaIndice: string,
  rutaCache: string,
  proveedor: IAProvider
): Promise<number> {
  const archivos = (await readdir(dirPdfs)).filter((f) => f.toLowerCase().endsWith(".pdf"));

  const todosFragmentos = [];
  for (const archivo of archivos) {
    const texto = await extraerTexto(path.join(dirPdfs, archivo));
    todosFragmentos.push(...fragmentarPorSeccion(texto, archivo));
  }

  const embeddings = await generarEmbeddingsConCache(todosFragmentos, proveedor, rutaCache);

  const entradas: EntradaIndice[] = todosFragmentos.map((f) => {
    const clave = claveDe(f);
    const embedding = embeddings.get(clave) ?? [];
    return { ...f, embedding };
  });

  guardarIndice(entradas, rutaIndice);
  return entradas.length;
}

// NOTA (Tarea 6, ver ruling en el brief): en este entorno no hay ningún
// proveedor de IA real corriendo en AI_PROVIDER_BASE_URL (no existe
// archivo .env, sólo .env.example) ni las variables de entorno
// requeridas por `cargarConfig()` (AI_PROVIDER_BASE_URL,
// AI_PROVIDER_API_KEY). Por eso `main()` usa `HeuristicProvider` en vez
// de `HttpChatProvider` — así `npm run ingestar` corre de punta a punta
// y deja un índice vectorial real en disco. La Tarea 15 (README final)
// debe documentar este reemplazo.
async function main(): Promise<void> {
  const dirPdfs = path.resolve(process.cwd(), "../materiales/politicas");
  const rutaIndice = path.resolve(process.cwd(), "data/indice_vectorial.json");
  const rutaCache = path.resolve(process.cwd(), "data/cache_embeddings.json");
  const proveedor = new HeuristicProvider();

  const cantidad = await ingestarDirectorio(dirPdfs, rutaIndice, rutaCache, proveedor);
  console.log(`Ingesta completa: ${cantidad} fragmentos indexados en ${rutaIndice}`);
}

// NOTA (Tarea 6): la comparación `import.meta.url === file://${process.argv[1]}`
// del brief no funciona en Windows (barras invertidas y el "file://" sin la
// tercera barra de la letra de unidad nunca calzan con la URL real). Se usa
// `pathToFileURL` para una comparación cross-platform equivalente.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("Error en la ingesta:", err);
    process.exit(1);
  });
}
