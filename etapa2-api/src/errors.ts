import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details !== undefined && { details: err.details }) },
    });
    return;
  }
  const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : 500;
  if (status === 400) {
    res.status(400).json({ error: { code: "JSON_INVALIDO", message: "El cuerpo no es JSON válido" } });
    return;
  }
  console.error(
    JSON.stringify({
      nivel: "error",
      mensaje: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  );
  res.status(500).json({ error: { code: "ERROR_INTERNO", message: "Error interno" } });
}
