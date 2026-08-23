import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { crearApp } from "../../src/app.js";

beforeAll(() => {
  // cargarConfig() sigue exigiendo AI_PROVIDER_BASE_URL/AI_PROVIDER_API_KEY
  // (fail-fast intencional del spec), aunque el endpoint use HeuristicProvider
  // por defecto (Fix 1 de la revisión final de rama) y no los necesite en la
  // práctica. Sin un .env presente (checkout nuevo, CI) esto hacia fallar
  // estos tests con 500 antes de llegar a la lógica que se quiere probar.
  // Se fijan valores dummy sin sobrescribir un .env real si existe.
  process.env.AI_PROVIDER_BASE_URL ??= "http://localhost:11434/v1";
  process.env.AI_PROVIDER_API_KEY ??= "test-key";
});

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
        embedding: [1, 0],
      },
    ],
  };
});

// El endpoint usa HeuristicProvider (el mismo proveedor que la ingesta,
// ver Fix 1 de la revisión final de rama) - se mockea aquí para que la
// prueba sea determinística sin depender de la heurística real de longitud
// de texto / suma de códigos de carácter.
vi.mock("etapa2-api", async () => {
  const actual = await vi.importActual<typeof import("etapa2-api")>("etapa2-api");
  return {
    ...actual,
    HeuristicProvider: class {
      async embeber(textos: string[]) {
        return textos.map((t) => (t.includes("trabajar desde casa") ? [0, 1] : [1, 0]));
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

describe("GET /ruta-inexistente", () => {
  it("devuelve 404 con la forma de error uniforme (no la pagina HTML por defecto de Express)", async () => {
    const res = await request(crearApp()).get("/ruta-inexistente");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "RUTA_NO_ENCONTRADA", message: "Recurso no encontrado" },
    });
  });
});
