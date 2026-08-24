import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../src/errors.js";
import { requiereRol } from "../src/middleware/authRole.js";

function appDePrueba() {
  const app = express();
  app.get("/solo-admin", requiereRol("administrador"), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe("requiereRol", () => {
  it("permite el acceso con el rol correcto", async () => {
    const res = await request(appDePrueba()).get("/solo-admin").set("X-Role", "administrador");
    expect(res.status).toBe(200);
  });

  it("devuelve 403 con un rol sin permiso", async () => {
    const res = await request(appDePrueba()).get("/solo-admin").set("X-Role", "solicitante");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ROL_NO_AUTORIZADO");
  });

  it("devuelve 403 si el header X-Role esta ausente", async () => {
    const res = await request(appDePrueba()).get("/solo-admin");
    expect(res.status).toBe(403);
  });

  it("devuelve 403 si el header trae un valor no reconocido", async () => {
    const res = await request(appDePrueba()).get("/solo-admin").set("X-Role", "invitado");
    expect(res.status).toBe(403);
  });
});
