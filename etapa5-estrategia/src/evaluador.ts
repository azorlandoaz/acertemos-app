import { ClasificadorService, HeuristicProvider } from "etapa2-api";
import { responderConsulta } from "etapa3-rag";
import { tipoDeCaso, type CasoReferencia, type TipoCaso } from "./conjuntoReferencia.js";

export interface ResultadoCaso {
  idCaso: string;
  tipo: TipoCaso;
  acierto: boolean;
  latenciaMs: number;
  escalado: boolean;
}

const SENTINEL_ABSTENCION = "SIN EVIDENCIA EN LOS DOCUMENTOS";

export async function evaluarCaso(
  caso: CasoReferencia,
  clasificador: ClasificadorService,
  umbralEscalamiento: number
): Promise<ResultadoCaso> {
  const tipo = tipoDeCaso(caso);
  const inicio = Date.now();

  if (tipo === "clasificacion") {
    const resultado = await clasificador.clasificar(caso.preguntaOTexto);
    return {
      idCaso: caso.idCaso,
      tipo,
      acierto: resultado.categoria === caso.respuestaOCategoriaEsperada,
      latenciaMs: Date.now() - inicio,
      escalado: resultado.confianza < umbralEscalamiento,
    };
  }

  const resultado = await responderConsulta(caso.preguntaOTexto);
  const esperaAbstencion = caso.respuestaOCategoriaEsperada === SENTINEL_ABSTENCION;
  const acierto = esperaAbstencion
    ? resultado.citas.length === 0
    : resultado.citas[0]?.documento === caso.documentoFuente;

  return {
    idCaso: caso.idCaso,
    tipo,
    acierto,
    latenciaMs: Date.now() - inicio,
    escalado: resultado.citas.length === 0,
  };
}

/** Secuencial (no Promise.all): cada caso mide su propia latencia de punta
 * a punta como lo haria un proceso real que atiende un caso a la vez;
 * HeuristicProvider no tiene estado compartido, asi que la eleccion es de
 * claridad de medicion, no de correctitud. */
export async function evaluarConjunto(
  casos: CasoReferencia[],
  umbralEscalamiento: number
): Promise<ResultadoCaso[]> {
  const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 3000, 1);
  const resultados: ResultadoCaso[] = [];
  for (const caso of casos) {
    resultados.push(await evaluarCaso(caso, clasificador, umbralEscalamiento));
  }
  return resultados;
}

export interface ResumenEvaluacion {
  precisionPorCategoria: Record<string, { total: number; aciertos: number; precision: number }>;
  precisionCitacion: { total: number; aciertos: number; precision: number };
  precisionAbstencion: { total: number; aciertos: number; precision: number };
  latenciaP95: number;
  tasaEscalamiento: number;
  totalCasos: number;
}

function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
  return ordenados[Math.max(0, indice)];
}

export function resumirEvaluacion(resultados: ResultadoCaso[], casos: CasoReferencia[]): ResumenEvaluacion {
  const porId = new Map(casos.map((c) => [c.idCaso, c]));
  const precisionPorCategoria: ResumenEvaluacion["precisionPorCategoria"] = {};
  let citacionTotal = 0;
  let citacionAciertos = 0;
  let abstencionTotal = 0;
  let abstencionAciertos = 0;

  for (const r of resultados) {
    const caso = porId.get(r.idCaso);
    if (!caso) continue;

    if (r.tipo === "clasificacion") {
      const categoria = caso.respuestaOCategoriaEsperada;
      const entrada = precisionPorCategoria[categoria] ?? { total: 0, aciertos: 0, precision: 0 };
      entrada.total += 1;
      if (r.acierto) entrada.aciertos += 1;
      entrada.precision = entrada.aciertos / entrada.total;
      precisionPorCategoria[categoria] = entrada;
    } else {
      const esperaAbstencion = caso.respuestaOCategoriaEsperada === SENTINEL_ABSTENCION;
      if (esperaAbstencion) {
        abstencionTotal += 1;
        if (r.acierto) abstencionAciertos += 1;
      } else {
        citacionTotal += 1;
        if (r.acierto) citacionAciertos += 1;
      }
    }
  }

  const latencias = resultados.map((r) => r.latenciaMs);
  const escalados = resultados.filter((r) => r.escalado).length;

  return {
    precisionPorCategoria,
    precisionCitacion: {
      total: citacionTotal,
      aciertos: citacionAciertos,
      precision: citacionTotal === 0 ? 1 : citacionAciertos / citacionTotal,
    },
    precisionAbstencion: {
      total: abstencionTotal,
      aciertos: abstencionAciertos,
      precision: abstencionTotal === 0 ? 1 : abstencionAciertos / abstencionTotal,
    },
    latenciaP95: percentil(latencias, 95),
    tasaEscalamiento: resultados.length === 0 ? 0 : escalados / resultados.length,
    totalCasos: resultados.length,
  };
}
