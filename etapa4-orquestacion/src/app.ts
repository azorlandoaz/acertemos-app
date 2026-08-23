import express from "express";
import { AppError, errorHandler, requestLogger } from "etapa2-api";
import { resumenMetricas } from "etapa3-rag";
import { webhookRouter } from "./routes/webhook.js";

export function crearApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.get("/health", (_req, res) => {
    res.json({ estado: "operativo" });
  });
  app.get("/metricas", (_req, res) => {
    res.json(resumenMetricas());
  });
  app.use("/webhook", webhookRouter);
  app.use((_req, _res, next) => {
    next(new AppError(404, "RUTA_NO_ENCONTRADA", "Recurso no encontrado"));
  });
  app.use(errorHandler);
  return app;
}
