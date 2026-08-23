import express from "express";
import { errorHandler } from "etapa2-api";
import { consultasRouter } from "./routes/consultas.js";

export function crearApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ estado: "operativo" });
  });
  app.use("/consultas", consultasRouter);
  app.use(errorHandler);
  return app;
}
