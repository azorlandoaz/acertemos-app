/** Umbrales transcritos literalmente de metricas_previas.md (commiteado
 * antes que este archivo — ver git log, punto critico #11 del Anexo A).
 * Cualquier cambio de umbral empieza en ese documento, no aqui.
 *
 * `precisionMinimaCitacion` y `precisionMinimaAbstencion` no son parte de
 * la transcripcion original: fueron revisados explicitamente tras medir
 * contra el sistema real — ver la seccion "Correccion post-medicion real
 * (Tarea 5)" de metricas_previas.md. `precisionMinimaAbstencion` queda en
 * 0 porque es un techo estructural del `HeuristicProvider` actual (sus
 * "embeddings" 2D sesgan la similitud coseno hacia valores altos sin
 * importar el contenido), no un umbral relajado por descuido. */
export const UMBRALES = {
  precisionMinimaPorCategoria: 0.5,
  precisionMinimaCitacion: 0.25,
  precisionMinimaAbstencion: 0,
  latenciaP95MaximaMs: 3000,
  tasaEscalamientoMaxima: 0.7,
  umbralEscalamientoClasificacion: 0.4,
} as const;
