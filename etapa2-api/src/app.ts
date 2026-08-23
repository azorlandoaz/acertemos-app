import express from "express";
import { errorHandler } from "./errors.js";
import { solicitudesRouter } from "./routes/solicitudes.js";

export function crearApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ estado: "operativo" });
  });
  app.use("/solicitudes", solicitudesRouter);
  app.use(errorHandler);
  return app;
}
