import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors.js";
import { crear, listar, obtenerPorId, actualizarClasificacion } from "../store/solicitudesStore.js";
import { ClasificadorService } from "../ia/ClasificadorService.js";
import { HeuristicProvider } from "../ia/HeuristicProvider.js";
import { HttpChatProvider } from "../ia/HttpChatProvider.js";
import { cargarConfig } from "../config/env.js";

export const solicitudesRouter = Router();

const EntradaSolicitud = z.object({
  asunto: z.string().min(3, "El asunto debe tener al menos 3 caracteres"),
  descripcion: z.string().default(""),
  area: z.string().min(2, "El área es requerida"),
  solicitante: z.string().email("El solicitante debe ser un correo válido"),
});

const config = cargarConfig();
const clasificador = new ClasificadorService(
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
const UMBRAL_ESCALAMIENTO = 0.4;

solicitudesRouter.post("/", async (req, res, next) => {
  const parseo = EntradaSolicitud.safeParse(req.body);
  if (!parseo.success) {
    return next(
      new AppError(422, "ENTRADA_INVALIDA", "Cuerpo de la solicitud inválido", parseo.error.flatten())
    );
  }
  const solicitud = crear(parseo.data);
  const clasificacion = await clasificador.clasificar(`${solicitud.asunto} ${solicitud.descripcion}`);
  const actualizada = actualizarClasificacion(
    solicitud.id,
    clasificacion.categoria,
    clasificacion.confianza >= UMBRAL_ESCALAMIENTO ? "Media" : "Alta",
    clasificacion.confianza,
    UMBRAL_ESCALAMIENTO
  );
  res.status(201).json(actualizada);
});

solicitudesRouter.get("/:id", (req, res, next) => {
  const solicitud = obtenerPorId(req.params.id);
  if (!solicitud) {
    return next(new AppError(404, "NO_ENCONTRADA", "Solicitud no encontrada"));
  }
  res.json(solicitud);
});

solicitudesRouter.get("/", (req, res) => {
  const { area, estado, categoria } = req.query;
  res.json(
    listar({
      area: typeof area === "string" ? area : undefined,
      estado: typeof estado === "string" ? estado : undefined,
      categoria: typeof categoria === "string" ? categoria : undefined,
    })
  );
});
