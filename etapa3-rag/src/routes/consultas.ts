import { Router } from "express";
import { z } from "zod";
import { AppError } from "etapa2-api";
import { HttpChatProvider } from "etapa2-api";
import { cargarConfig } from "../config/env.js";
import { buscar, cargarIndice } from "../busqueda/vectorStore.js";
import path from "node:path";

export const consultasRouter = Router();

const EntradaConsulta = z.object({
  pregunta: z.string().min(3, "La pregunta debe tener al menos 3 caracteres").max(500),
});

let proveedorSingleton: HttpChatProvider | null = null;

function obtenerProveedor(): HttpChatProvider {
  if (!proveedorSingleton) {
    const config = cargarConfig();
    proveedorSingleton = new HttpChatProvider({
      baseUrl: config.aiProviderBaseUrl,
      apiKey: config.aiProviderApiKey,
      modelo: config.aiProviderModel,
      timeoutMs: config.aiTimeoutMs,
    });
  }
  return proveedorSingleton;
}

function rutaIndice(): string {
  return path.resolve(process.cwd(), "data/indice_vectorial.json");
}

consultasRouter.post("/", async (req, res, next) => {
  const parseo = EntradaConsulta.safeParse(req.body);
  if (!parseo.success) {
    return next(new AppError(422, "ENTRADA_INVALIDA", "Pregunta inválida", parseo.error.flatten()));
  }

  const indice = cargarIndice(rutaIndice());
  const [embeddingConsulta] = await obtenerProveedor().embeber([parseo.data.pregunta]);
  const resultados = buscar(indice, embeddingConsulta, 3);

  const contexto = resultados.map((r) => r.entrada.texto);
  const respuesta = await obtenerProveedor().generarRespuesta(parseo.data.pregunta, contexto);
  const citas = resultados
    .slice(0, 1)
    .map((r) => ({ documento: r.entrada.documento, seccion: r.entrada.seccion }));

  res.json({ respuesta, citas, confianza: resultados[0]?.similitud ?? 0 });
});
