import { beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, writeFileSync } from "node:fs";
import { cargarConjuntoReferencia, type CasoReferencia } from "../src/conjuntoReferencia.js";
import { evaluarConjunto, resumirEvaluacion, type ResultadoCaso } from "../src/evaluador.js";
import { UMBRALES } from "../src/umbrales.js";

beforeAll(() => {
  // etapa3-rag/src/config/env.ts exige estas variables aunque
  // HeuristicProvider no las use (falla rapido intencional, ver Etapa 3).
  // Se fijan valores dummy sin sobrescribir un .env real si existe.
  process.env.AI_PROVIDER_BASE_URL ??= "http://localhost:11434/v1";
  process.env.AI_PROVIDER_API_KEY ??= "test-key";
});

describe("resumirEvaluacion (con datos sinteticos)", () => {
  const casos: CasoReferencia[] = [
    { idCaso: "A", preguntaOTexto: "x", respuestaOCategoriaEsperada: "Hardware", documentoFuente: "", seccionFuente: "", observacion: "" },
    { idCaso: "B", preguntaOTexto: "y", respuestaOCategoriaEsperada: "Hardware", documentoFuente: "", seccionFuente: "", observacion: "" },
    { idCaso: "C", preguntaOTexto: "z", respuestaOCategoriaEsperada: "15 dias", documentoFuente: "POL-GTH-01_Vacaciones.pdf", seccionFuente: "3.1", observacion: "" },
    { idCaso: "D", preguntaOTexto: "w", respuestaOCategoriaEsperada: "SIN EVIDENCIA EN LOS DOCUMENTOS", documentoFuente: "", seccionFuente: "", observacion: "" },
  ];

  const resultados: ResultadoCaso[] = [
    { idCaso: "A", tipo: "clasificacion", acierto: true, latenciaMs: 10, escalado: false },
    { idCaso: "B", tipo: "clasificacion", acierto: false, latenciaMs: 20, escalado: true },
    { idCaso: "C", tipo: "consulta_politica", acierto: true, latenciaMs: 30, escalado: false },
    { idCaso: "D", tipo: "consulta_politica", acierto: true, latenciaMs: 40, escalado: true },
  ];

  it("agrupa precision de clasificacion por categoria esperada", () => {
    const resumen = resumirEvaluacion(resultados, casos);
    expect(resumen.precisionPorCategoria["Hardware"]).toEqual({ total: 2, aciertos: 1, precision: 0.5 });
  });

  it("separa precision de citacion (sin abstencion) de precision de abstencion", () => {
    const resumen = resumirEvaluacion(resultados, casos);
    expect(resumen.precisionCitacion).toEqual({ total: 1, aciertos: 1, precision: 1 });
    expect(resumen.precisionAbstencion).toEqual({ total: 1, aciertos: 1, precision: 1 });
  });

  it("calcula tasa de escalamiento sobre el total de casos", () => {
    const resumen = resumirEvaluacion(resultados, casos);
    expect(resumen.tasaEscalamiento).toBe(2 / 4);
  });

  it("calcula latencia p95 sobre todas las latencias registradas", () => {
    const resumen = resumirEvaluacion(resultados, casos);
    expect(resumen.latenciaP95).toBe(40);
  });
});

describe("suite de evaluacion contra conjunto_referencia.csv (gate real)", () => {
  it("cumple los umbrales minimos definidos en metricas_previas.md", async () => {
    const aqui = path.dirname(fileURLToPath(import.meta.url));
    const rutaIndice = path.resolve(aqui, "../../etapa3-rag/data/indice_vectorial.json");
    if (!existsSync(rutaIndice)) {
      throw new Error(
        "Falta etapa3-rag/data/indice_vectorial.json. Correr primero: npm run ingestar --workspace etapa3-rag"
      );
    }

    const casos = cargarConjuntoReferencia(path.resolve(aqui, "../conjunto_referencia.csv"));
    const resultados = await evaluarConjunto(casos, UMBRALES.umbralEscalamientoClasificacion);
    const resumen = resumirEvaluacion(resultados, casos);

    writeFileSync(path.resolve(aqui, "../resultados_evaluacion.json"), JSON.stringify(resumen, null, 2));

    for (const [categoria, datos] of Object.entries(resumen.precisionPorCategoria)) {
      if (datos.total >= 3) {
        expect(
          datos.precision,
          `precision en categoria "${categoria}" (${datos.aciertos}/${datos.total})`
        ).toBeGreaterThanOrEqual(UMBRALES.precisionMinimaPorCategoria);
      }
    }
    expect(resumen.precisionAbstencion.precision, "precision de abstencion").toBeGreaterThanOrEqual(
      UMBRALES.precisionMinimaAbstencion
    );
    expect(resumen.precisionCitacion.precision, "precision de citacion").toBeGreaterThanOrEqual(
      UMBRALES.precisionMinimaCitacion
    );
    expect(resumen.latenciaP95, "latencia p95").toBeLessThanOrEqual(UMBRALES.latenciaP95MaximaMs);
    expect(resumen.tasaEscalamiento, "tasa de escalamiento").toBeLessThanOrEqual(UMBRALES.tasaEscalamientoMaxima);
  });
});
