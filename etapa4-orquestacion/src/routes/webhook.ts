import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { ClasificadorService, HeuristicProvider, HttpChatProvider } from "etapa2-api";
import { cargarConfig } from "../config/env.js";
import { marcarEstado, yaFueVisto } from "../estadoSync.js";
import { ejecutarPipeline } from "../pipeline.js";

export const webhookRouter = Router();

const EventoEntrada = z.object({
  evento_id: z.string().min(1),
  pregunta: z.string().min(1),
});

function rutaEstadoSync(): string {
  return process.env.RUTA_ESTADO_SYNC ?? path.resolve(process.cwd(), "data/estado_sync.json");
}

let clasificadorSingleton: ClasificadorService | null = null;

function obtenerClasificador(): ClasificadorService {
  if (!clasificadorSingleton) {
    const config = cargarConfig();
    clasificadorSingleton = new ClasificadorService(
      new HttpChatProvider({
        baseUrl: config.aiProviderBaseUrl,
        apiKey: config.aiProviderApiKey,
        modelo: config.aiProviderModel,
        timeoutMs: config.aiTimeoutMs,
      }),
      new HeuristicProvider(),
      config.aiTimeoutMs,
      config.aiMaxReintentos
    );
  }
  return clasificadorSingleton;
}

webhookRouter.post("/entrada", async (req, res, next) => {
  try {
    const parseo = EventoEntrada.safeParse(req.body);
    if (!parseo.success) {
      return res.status(422).json({
        error: { code: "ENTRADA_INVALIDA", message: "Evento inválido", details: parseo.error.flatten() },
      });
    }

    const ruta = rutaEstadoSync();
    if (yaFueVisto(parseo.data.evento_id, ruta)) {
      return res.status(200).json({ recibido: true, duplicado: true });
    }

    marcarEstado(parseo.data.evento_id, "pendiente", ruta);
    res.status(202).json({ recibido: true, duplicado: false });

    const config = cargarConfig();
    const resultado = await ejecutarPipeline(parseo.data, obtenerClasificador(), config.umbralEscalamiento);
    marcarEstado(parseo.data.evento_id, "enviado", ruta);
    void resultado;
  } catch (err) {
    next(err);
  }
});
