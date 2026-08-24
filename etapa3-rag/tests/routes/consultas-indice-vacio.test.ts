import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { crearApp } from "../../src/app.js";

// Fix Important I4 (revision final de rama): si el indice vectorial no
// existe todavia (no se corrio `npm run ingestar`), el endpoint debe
// responder 503 explicito en vez de intentar buscar sobre un indice vacio
// y devolver una respuesta engañosa.
vi.mock("../../src/busqueda/vectorStore.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/busqueda/vectorStore.js")>(
    "../../src/busqueda/vectorStore.js"
  );
  return {
    ...actual,
    cargarIndice: () => [],
  };
});

describe("POST /consultas - indice vacio", () => {
  it("devuelve 503 con la forma de error uniforme si el indice vectorial no esta disponible", async () => {
    const res = await request(crearApp())
      .post("/consultas")
      .send({ pregunta: "¿Con cuánta anticipación debo pedir vacaciones?" });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("INDICE_NO_DISPONIBLE");
  });
});
