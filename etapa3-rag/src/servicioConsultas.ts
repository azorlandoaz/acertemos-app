import path from "node:path";
import { AppError, HeuristicProvider, type IAProvider } from "etapa2-api";
import { cargarConfig } from "./config/env.js";
import { buscar, cargarIndice, type EntradaIndice } from "./busqueda/vectorStore.js";
import { registrarMetrica, tokensAproximados } from "./metricas.js";

export interface ResultadoConsulta {
  respuesta: string;
  citas: { documento: string; seccion: string }[];
  confianza: number;
}

let configSingleton: ReturnType<typeof cargarConfig> | null = null;
let proveedorSingleton: IAProvider | null = null;
let indiceSingleton: EntradaIndice[] | null = null;

function obtenerConfig() {
  if (!configSingleton) {
    configSingleton = cargarConfig();
  }
  return configSingleton;
}

/** Usa el mismo HeuristicProvider que la ingesta real (ver
 * ingestar.ts::main). En este entorno de evaluación no hay proveedor de
 * IA real disponible; usar un proveedor distinto en la ingesta y en la
 * consulta produce espacios de embedding incompatibles (hallazgo Critical
 * de la revisión final de rama). Cuando exista un proveedor real
 * disponible: cambiar AMBOS puntos (aquí y en ingestar.ts::main) al mismo
 * HttpChatProvider y volver a correr `npm run ingestar` para reconstruir
 * el índice con el nuevo espacio de embeddings. */
function obtenerProveedorPorDefecto(): IAProvider {
  if (!proveedorSingleton) {
    proveedorSingleton = new HeuristicProvider();
  }
  return proveedorSingleton;
}

function rutaIndice(): string {
  return path.resolve(process.cwd(), "data/indice_vectorial.json");
}

function obtenerIndice(): EntradaIndice[] {
  if (!indiceSingleton) {
    indiceSingleton = cargarIndice(rutaIndice());
  }
  return indiceSingleton;
}

/** Responde una pregunta en lenguaje natural citando documento/sección de
 * las políticas indexadas, o se abstiene si la similitud máxima cae bajo
 * el umbral configurado. Extraído de routes/consultas.ts para que otros
 * subproyectos del workspace (Etapa 4) puedan reutilizar el mismo camino
 * sin pasar por HTTP. */
export async function responderConsulta(
  pregunta: string,
  proveedor: IAProvider = obtenerProveedorPorDefecto()
): Promise<ResultadoConsulta> {
  const inicio = Date.now();

  const indice = obtenerIndice();
  if (indice.length === 0) {
    throw new AppError(
      503,
      "INDICE_NO_DISPONIBLE",
      "El índice vectorial no está disponible. Corra 'npm run ingestar --workspace etapa3-rag' primero."
    );
  }

  const [embeddingConsulta] = await proveedor.embeber([pregunta]);
  const resultados = buscar(indice, embeddingConsulta, 3);

  const similitudMaxima = resultados[0]?.similitud ?? 0;
  let respuesta: string;
  let citas: { documento: string; seccion: string }[];

  if (similitudMaxima < obtenerConfig().umbralAbstencion) {
    respuesta = "No tengo evidencia en las políticas para responder esto.";
    citas = [];
  } else {
    const contexto = resultados.map((r) => r.entrada.texto);
    respuesta = await proveedor.generarRespuesta(pregunta, contexto);
    citas = resultados.slice(0, 1).map((r) => ({ documento: r.entrada.documento, seccion: r.entrada.seccion }));
  }

  registrarMetrica(Date.now() - inicio, tokensAproximados(pregunta + respuesta));
  return { respuesta, citas, confianza: similitudMaxima };
}
