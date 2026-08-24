import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors.js";
import { requiereRol } from "../middleware/authRole.js";
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

let clasificadorSingleton: ClasificadorService | null = null;
const UMBRAL_ESCALAMIENTO = 0.4;

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

solicitudesRouter.post("/", requiereRol("solicitante", "responsable_area", "administrador"), async (req, res, next) => {
  try {
    const parseo = EntradaSolicitud.safeParse(req.body);
    if (!parseo.success) {
      return next(
        new AppError(422, "ENTRADA_INVALIDA", "Cuerpo de la solicitud inválido", parseo.error.flatten())
      );
    }
    const solicitud = crear(parseo.data);
    const clasificacion = await obtenerClasificador().clasificar(`${solicitud.asunto} ${solicitud.descripcion}`);
    const actualizada = actualizarClasificacion(
      solicitud.id,
      clasificacion.categoria,
      clasificacion.confianza >= UMBRAL_ESCALAMIENTO ? "Media" : "Alta",
      clasificacion.confianza,
      UMBRAL_ESCALAMIENTO
    );
    res.status(201).json(actualizada);
  } catch (err) {
    next(err);
  }
});

solicitudesRouter.get("/:id", requiereRol("solicitante", "responsable_area", "administrador"), (req, res, next) => {
  const solicitud = obtenerPorId(req.params.id);
  if (!solicitud) {
    return next(new AppError(404, "NO_ENCONTRADA", "Solicitud no encontrada"));
  }
  res.json(solicitud);
});

solicitudesRouter.get("/", requiereRol("responsable_area", "administrador"), (req, res) => {
  const { area, estado, categoria, limite, desplazamiento } = req.query;
  res.json(
    listar({
      area: typeof area === "string" ? area : undefined,
      estado: typeof estado === "string" ? estado : undefined,
      categoria: typeof categoria === "string" ? categoria : undefined,
      limite: typeof limite === "string" ? Number(limite) : undefined,
      desplazamiento: typeof desplazamiento === "string" ? Number(desplazamiento) : undefined,
    })
  );
});
