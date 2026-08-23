import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { crearApp } from "../../src/app.js";

vi.mock("../../src/busqueda/vectorStore.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/busqueda/vectorStore.js")>(
    "../../src/busqueda/vectorStore.js"
  );
  return {
    ...actual,
    cargarIndice: () => [
      {
        documento: "POL-GTH-01_Vacaciones.pdf",
        seccion: "3.1",
        texto: "Las vacaciones deben solicitarse con 15 días calendario de anticipación.",
        embedding: [1, 0, 0],
      },
    ],
  };
});

vi.mock("etapa2-api", async () => {
  const actual = await vi.importActual<typeof import("etapa2-api")>("etapa2-api");
  return {
    ...actual,
    HttpChatProvider: class {
      async embeber(textos: string[]) {
        return textos.map((t) => (t.includes("trabajar desde casa") ? [0, 1, 0] : [1, 0, 0]));
      }
      async generarRespuesta() {
        return "Debes solicitar tus vacaciones con 15 días calendario de anticipación.";
      }
      async clasificar() {
        return { categoria: "Vacaciones", confianza: 1 };
      }
    },
  };
});

describe("POST /consultas", () => {
  it("responde citando documento y seccion cuando hay respaldo", async () => {
    const res = await request(crearApp())
      .post("/consultas")
      .send({ pregunta: "¿Con cuánta anticipación debo pedir vacaciones?" });

    expect(res.status).toBe(200);
    expect(res.body.respuesta).toContain("15 días");
    expect(res.body.citas).toEqual([
      { documento: "POL-GTH-01_Vacaciones.pdf", seccion: "3.1" },
    ]);
  });

  it("devuelve 422 si la pregunta esta vacia", async () => {
    const res = await request(crearApp()).post("/consultas").send({ pregunta: "" });
    expect(res.status).toBe(422);
  });

  it("se abstiene (GS-003) cuando la similitud maxima cae bajo el umbral", async () => {
    const res = await request(crearApp())
      .post("/consultas")
      .send({ pregunta: "¿Puedo trabajar desde casa tres días a la semana?" });

    expect(res.status).toBe(200);
    expect(res.body.respuesta).toBe("No tengo evidencia en las políticas para responder esto.");
    expect(res.body.citas).toEqual([]);
  });
});
