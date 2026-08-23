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

  it("escala automaticamente cuando la clasificacion tiene confianza baja", async () => {
    const res = await request(crearApp())
      .post("/solicitudes")
      .set("X-Role", "administrador")
      .send({
        asunto: "xyz texto sin señales reconocibles 123",
        descripcion: "",
        area: "Otros",
        solicitante: "a@x.com",
      });
    expect(res.body.estado).toBe("Escalado");
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

  it("pagina el listado con limite y desplazamiento", async () => {
    const app = crearApp();
    for (const n of [1, 2, 3]) {
      await request(app)
        .post("/solicitudes")
        .set("X-Role", "administrador")
        .send({ asunto: `Solicitud ${n}`, descripcion: "", area: "Compras", solicitante: "a@x.com" });
    }
    const res = await request(app).get("/solicitudes?limite=2").set("X-Role", "administrador");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("matriz de roles en los endpoints reales", () => {
  it("solicitante puede crear (POST /solicitudes)", async () => {
    const res = await request(crearApp())
      .post("/solicitudes")
      .set("X-Role", "solicitante")
      .send({ asunto: "Prueba de rol", descripcion: "", area: "Compras", solicitante: "a@x.com" });
    expect(res.status).toBe(201);
  });

  it("solicitante puede consultar por id (GET /solicitudes/:id)", async () => {
    const app = crearApp();
    const creada = await request(app)
      .post("/solicitudes")
      .set("X-Role", "administrador")
      .send({ asunto: "Prueba de rol", descripcion: "", area: "Compras", solicitante: "a@x.com" });

    const res = await request(app)
      .get(`/solicitudes/${creada.body.id}`)
      .set("X-Role", "solicitante");
    expect(res.status).toBe(200);
  });

  it("solicitante NO puede listar (GET /solicitudes) - 403", async () => {
    const res = await request(crearApp())
      .get("/solicitudes")
      .set("X-Role", "solicitante");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ROL_NO_AUTORIZADO");
  });
});
