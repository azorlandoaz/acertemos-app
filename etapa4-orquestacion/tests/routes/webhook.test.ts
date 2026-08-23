import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let dirTemporal: string;
let rutaEstado: string;

beforeEach(() => {
  dirTemporal = mkdtempSync(path.join(tmpdir(), "webhook-test-"));
  rutaEstado = path.join(dirTemporal, "estado_sync.json");
  process.env.RUTA_ESTADO_SYNC = rutaEstado;
});

afterEach(() => {
  rmSync(dirTemporal, { recursive: true, force: true });
  delete process.env.RUTA_ESTADO_SYNC;
});

vi.mock("../../src/pipeline.js", () => ({
  ejecutarPipeline: vi.fn(async (entrada: { evento_id: string; pregunta: string }) => ({
    evento_id: entrada.evento_id,
    categoria: "Vacaciones",
    confianzaClasificacion: 0.9,
    respuesta: "Respuesta simulada.",
    citas: [{ documento: "d.pdf", seccion: "1" }],
    confianzaRag: 0.9,
    accion: "responder" as const,
  })),
}));

describe("POST /webhook/entrada", () => {
  it("acepta un evento nuevo y lo procesa (202)", async () => {
    const { crearApp } = await import("../../src/app.js");
    const res = await request(crearApp()).post("/webhook/entrada").send({
      evento_id: "evt-100",
      pregunta: "¿Con cuánta anticipación pido vacaciones?",
    });
    expect(res.status).toBe(202);
    expect(res.body.duplicado).toBe(false);
  });

  it("el mismo evento_id enviado dos veces produce efecto una sola vez", async () => {
    const { crearApp } = await import("../../src/app.js");
    const { ejecutarPipeline } = await import("../../src/pipeline.js");
    const app = crearApp();

    await request(app).post("/webhook/entrada").send({ evento_id: "evt-dup", pregunta: "hola" });
    const segunda = await request(app).post("/webhook/entrada").send({ evento_id: "evt-dup", pregunta: "hola" });

    expect(segunda.status).toBe(200);
    expect(segunda.body.duplicado).toBe(true);
    expect(ejecutarPipeline).toHaveBeenCalledTimes(1);
  });

  it("devuelve 422 si el evento no tiene evento_id o pregunta", async () => {
    const { crearApp } = await import("../../src/app.js");
    const res = await request(crearApp()).post("/webhook/entrada").send({ pregunta: "" });
    expect(res.status).toBe(422);
  });
});
