import { Router } from "express";
import { z } from "zod";
import { AppError } from "etapa2-api";
import { responderConsulta } from "../servicioConsultas.js";

export const consultasRouter = Router();

const EntradaConsulta = z.object({
  pregunta: z.string().min(3, "La pregunta debe tener al menos 3 caracteres").max(500),
});

consultasRouter.post("/", async (req, res, next) => {
  const parseo = EntradaConsulta.safeParse(req.body);
  if (!parseo.success) {
    return next(new AppError(422, "ENTRADA_INVALIDA", "Pregunta inválida", parseo.error.flatten()));
  }

  try {
    const resultado = await responderConsulta(parseo.data.pregunta);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});
