import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { AppError, errorHandler } from "./errors.js";
import { requestLogger } from "./logger.js";
import { solicitudesRouter } from "./routes/solicitudes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiDoc = YAML.parse(
  readFileSync(path.join(__dirname, "../openapi.yaml"), "utf-8")
);

export function crearApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.get("/health", (_req, res) => {
    res.json({ estado: "operativo" });
  });
  app.use("/solicitudes", solicitudesRouter);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));
  app.use((_req, _res, next) => {
    next(new AppError(404, "RUTA_NO_ENCONTRADA", "Recurso no encontrado"));
  });
  app.use(errorHandler);
  return app;
}
