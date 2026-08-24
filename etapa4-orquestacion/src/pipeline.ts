import type { ClasificadorService } from "etapa2-api";
import { responderConsulta } from "etapa3-rag";

export interface EntradaPipeline {
  evento_id: string;
  pregunta: string;
}

export interface ResultadoPipeline {
  evento_id: string;
  categoria: string;
  confianzaClasificacion: number;
  respuesta: string;
  citas: { documento: string; seccion: string }[];
  confianzaRag: number;
  accion: "responder" | "escalar";
}

/** Orquesta clasificar (Etapa 2) -> RAG (Etapa 3) -> decidir si responder
 * o escalar a una persona. Escala si la clasificación tiene baja confianza
 * O si el RAG se abstuvo (sin evidencia en política) - cualquiera de las
 * dos condiciones basta, ninguna decisión automática se envía a ciegas. */
export async function ejecutarPipeline(
  entrada: EntradaPipeline,
  clasificador: ClasificadorService,
  umbralEscalamiento: number
): Promise<ResultadoPipeline> {
  const clasificacion = await clasificador.clasificar(entrada.pregunta);
  const rag = await responderConsulta(entrada.pregunta);

  const accion: "responder" | "escalar" =
    clasificacion.confianza < umbralEscalamiento || rag.citas.length === 0 ? "escalar" : "responder";

  return {
    evento_id: entrada.evento_id,
    categoria: clasificacion.categoria,
    confianzaClasificacion: clasificacion.confianza,
    respuesta: rag.respuesta,
    citas: rag.citas,
    confianzaRag: rag.confianza,
    accion,
  };
}
