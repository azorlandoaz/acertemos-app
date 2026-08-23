import express from "express";
import { webhookRouter } from "./routes/webhook.js";

export function crearApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ estado: "operativo" });
  });
  app.use("/webhook", webhookRouter);
  return app;
}
