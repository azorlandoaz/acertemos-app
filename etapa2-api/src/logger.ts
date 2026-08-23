import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const inicio = Date.now();
  const ruta = req.originalUrl;
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        requestId,
        metodo: req.method,
        ruta,
        status: res.statusCode,
        duracionMs: Date.now() - inicio,
      })
    );
  });
  next();
}
