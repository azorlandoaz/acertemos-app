/** Umbrales transcritos literalmente de metricas_previas.md (commiteado
 * antes que este archivo — ver git log, punto critico #11 del Anexo A).
 * Cualquier cambio de umbral empieza en ese documento, no aqui. */
export const UMBRALES = {
  precisionMinimaPorCategoria: 0.5,
  precisionMinimaCitacion: 0.25,
  precisionMinimaAbstencion: 0,
  latenciaP95MaximaMs: 3000,
  tasaEscalamientoMaxima: 0.7,
  umbralEscalamientoClasificacion: 0.4,
} as const;
