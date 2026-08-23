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
      .set("X-Role", "administrador")
      .send({ asunto: "El portátil no enciende", descripcion: "Desde ayer", area: "Operaciones", solicitante: "ana@lafortuna.com.co" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf("string");
    expect(res.body.asunto).toBe("El portátil no enciende");
    expect(res.body.estado).toBe("Abierto");
    expect(["Vacaciones", "Sin clasificar", "Hardware", "Software", "Gestión de accesos", "Viáticos", "Conectividad", "Compras", "Incidentes"]).toContain(res.body.categoria);
  });

  it("devuelve 422 si falta un campo requerido", async () => {
    const res = await request(crearApp())
      .post("/solicitudes")
      .set("X-Role", "administrador")
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
      .set("X-Role", "administrador")
      .send({ asunto: "Cuántos días de vacaciones tengo", descripcion: "", area: "Talento Humano", solicitante: "ana@lafortuna.com.co" });

    const res = await request(app).get(`/solicitudes/${creada.body.id}`).set("X-Role", "administrador");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(creada.body.id);
  });

  it("devuelve 404 con la forma uniforme si no existe", async () => {
    const res = await request(crearApp()).get("/solicitudes/no-existe").set("X-Role", "administrador");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NO_ENCONTRADA", message: "Solicitud no encontrada" } });
  });
});

describe("GET /solicitudes", () => {
  it("lista con filtro de area", async () => {
    const app = crearApp();
    await request(app).post("/solicitudes").set("X-Role", "administrador").send({ asunto: "Uno", descripcion: "", area: "Compras", solicitante: "a@x.com" });
    await request(app).post("/solicitudes").set("X-Role", "administrador").send({ asunto: "Dos", descripcion: "", area: "Calidad", solicitante: "b@x.com" });

    const res = await request(app).get("/solicitudes?area=Compras").set("X-Role", "administrador");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].area).toBe("Compras");
  });

  it("devuelve lista vacia (200, no error) si no hay resultados", async () => {
    const res = await request(crearApp()).get("/solicitudes?area=NoExiste").set("X-Role", "administrador");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
