import express from "express";
import { errorHandler } from "./errors.js";

export function crearApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ estado: "operativo" });
  });
  app.use(errorHandler);
  return app;
}
