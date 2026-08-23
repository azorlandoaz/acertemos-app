import { Router } from "express";
import { z } from "zod";
import { AppError, HeuristicProvider, type IAProvider } from "etapa2-api";
import { cargarConfig } from "../config/env.js";
import { buscar, cargarIndice, type EntradaIndice } from "../busqueda/vectorStore.js";
import path from "node:path";
import { registrarMetrica, tokensAproximados } from "../metricas.js";

export const consultasRouter = Router();

const EntradaConsulta = z.object({
  pregunta: z.string().min(3, "La pregunta debe tener al menos 3 caracteres").max(500),
});

let proveedorSingleton: IAProvider | null = null;
let configSingleton: ReturnType<typeof cargarConfig> | null = null;
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
function obtenerProveedor(): IAProvider {
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

consultasRouter.post("/", async (req, res, next) => {
  const inicio = Date.now();
  try {
    const parseo = EntradaConsulta.safeParse(req.body);
    if (!parseo.success) {
      return next(new AppError(422, "ENTRADA_INVALIDA", "Pregunta inválida", parseo.error.flatten()));
    }

    const indice = obtenerIndice();
    if (indice.length === 0) {
      return next(
        new AppError(
          503,
          "INDICE_NO_DISPONIBLE",
          "El índice vectorial no está disponible. Corra 'npm run ingestar --workspace etapa3-rag' primero."
        )
      );
    }

    const [embeddingConsulta] = await obtenerProveedor().embeber([parseo.data.pregunta]);
    const resultados = buscar(indice, embeddingConsulta, 3);

    const similitudMaxima = resultados[0]?.similitud ?? 0;
    let respuesta: string;
    let citas: { documento: string; seccion: string }[];

    if (similitudMaxima < obtenerConfig().umbralAbstencion) {
      respuesta = "No tengo evidencia en las políticas para responder esto.";
      citas = [];
    } else {
      const contexto = resultados.map((r) => r.entrada.texto);
      respuesta = await obtenerProveedor().generarRespuesta(parseo.data.pregunta, contexto);
      citas = resultados.slice(0, 1).map((r) => ({ documento: r.entrada.documento, seccion: r.entrada.seccion }));
    }

    registrarMetrica(Date.now() - inicio, tokensAproximados(parseo.data.pregunta + respuesta));
    res.json({ respuesta, citas, confianza: similitudMaxima });
  } catch (err) {
    next(err);
  }
});
