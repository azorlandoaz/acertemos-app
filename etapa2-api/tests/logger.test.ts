import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { requestLogger } from "../src/logger.js";

describe("requestLogger", () => {
  it("loggea un JSON con requestId, metodo, ruta, status y duracion", async () => {
    const app = express();
    app.use(requestLogger);
    app.get("/algo", (_req, res) => res.json({ ok: true }));

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await request(app).get("/algo");

    expect(spy).toHaveBeenCalledTimes(1);
    const logueado = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logueado.metodo).toBe("GET");
    expect(logueado.ruta).toBe("/algo");
    expect(logueado.status).toBe(200);
    expect(logueado.requestId).toBeTypeOf("string");
    expect(logueado.duracionMs).toBeTypeOf("number");

    spy.mockRestore();
  });
});
