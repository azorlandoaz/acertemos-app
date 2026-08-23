import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AppError, errorHandler } from "../src/errors.js";

function appDePrueba() {
  const app = express();
  app.get("/rompe", () => {
    throw new AppError(400, "ENTRADA_INVALIDA", "El campo 'asunto' es requerido", {
      campo: "asunto",
    });
  });
  app.get("/rompe-generico", () => {
    throw new Error("boom");
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("devuelve la forma uniforme para un AppError", async () => {
    const res = await request(appDePrueba()).get("/rompe");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: "ENTRADA_INVALIDA",
        message: "El campo 'asunto' es requerido",
        details: { campo: "asunto" },
      },
    });
  });

  it("devuelve 500 con la forma uniforme para un error no controlado", async () => {
    const res = await request(appDePrueba()).get("/rompe-generico");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("ERROR_INTERNO");
    expect(res.body.error.message).toBeTypeOf("string");
  });
});
