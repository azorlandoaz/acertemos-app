import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { crearApp } from "../../src/app.js";
import { _reiniciar } from "../../src/store/solicitudesStore.js";

beforeEach(() => {
  _reiniciar();
});

describe("POST /solicitudes", () => {
  it("crea una solicitud y devuelve 201 con el cuerpo creado", async () => {
    const res = await request(crearApp())
      .post("/solicitudes")
      .send({ asunto: "El portátil no enciende", descripcion: "Desde ayer", area: "Operaciones", solicitante: "ana@lafortuna.com.co" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf("string");
    expect(res.body.asunto).toBe("El portátil no enciende");
    expect(res.body.estado).toBe("Abierto");
  });

  it("devuelve 422 si falta un campo requerido", async () => {
    const res = await request(crearApp())
      .post("/solicitudes")
      .send({ descripcion: "sin asunto", area: "Operaciones", solicitante: "ana@lafortuna.com.co" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("ENTRADA_INVALIDA");
  });
});

describe("GET /solicitudes/:id", () => {
  it("devuelve 200 con la solicitud si existe", async () => {
    const app = crearApp();
    const creada = await request(app)
      .post("/solicitudes")
      .send({ asunto: "Cuántos días de vacaciones tengo", descripcion: "", area: "Talento Humano", solicitante: "ana@lafortuna.com.co" });

    const res = await request(app).get(`/solicitudes/${creada.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(creada.body.id);
  });

  it("devuelve 404 con la forma uniforme si no existe", async () => {
    const res = await request(crearApp()).get("/solicitudes/no-existe");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NO_ENCONTRADA", message: "Solicitud no encontrada" } });
  });
});
