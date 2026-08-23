import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors.js";
import { crear, listar, obtenerPorId } from "../store/solicitudesStore.js";

export const solicitudesRouter = Router();

const EntradaSolicitud = z.object({
  asunto: z.string().min(3, "El asunto debe tener al menos 3 caracteres"),
  descripcion: z.string().default(""),
  area: z.string().min(2, "El área es requerida"),
  solicitante: z.string().email("El solicitante debe ser un correo válido"),
});

solicitudesRouter.post("/", (req, res, next) => {
  const parseo = EntradaSolicitud.safeParse(req.body);
  if (!parseo.success) {
    return next(
      new AppError(422, "ENTRADA_INVALIDA", "Cuerpo de la solicitud inválido", parseo.error.flatten())
    );
  }
  const solicitud = crear(parseo.data);
  res.status(201).json(solicitud);
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
