import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { crearApp } from "../../src/app.js";

// Fix Critical C2 (revision final de rama): el handler POST /consultas es
// async y hacia `await` sobre el proveedor de IA sin try/catch. Express 4
// no captura automaticamente rechazos de promesas en handlers async - un
// fallo del proveedor se convertia en un unhandled rejection que tumbaba
// el proceso Node completo, no solo esa request. Esta prueba simula un
// proveedor caido y verifica que el servidor responde con un error 5xx en
// la forma uniforme, sin colgar ni tumbar el proceso de test.
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

vi.mock("etapa2-api", async () => {
  const actual = await vi.importActual<typeof import("etapa2-api")>("etapa2-api");
  return {
    ...actual,
    HeuristicProvider: class {
      async embeber(): Promise<number[][]> {
        throw new Error("fallo simulado del proveedor");
      }
      async generarRespuesta() {
        return "no debería llegar aquí";
      }
      async clasificar() {
        return { categoria: "x", confianza: 0 };
      }
    },
  };
});

describe("POST /consultas - proveedor caido", () => {
  it("no tumba el proceso si el proveedor falla (maneja el error con la forma uniforme)", async () => {
    let procesoTumbado = false;
    const onUnhandledRejection = () => {
      procesoTumbado = true;
    };
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      const res = await request(crearApp())
        .post("/consultas")
        .send({ pregunta: "¿Con cuánta anticipación debo pedir vacaciones?" });

      expect(res.status).toBeGreaterThanOrEqual(500);
      expect(res.status).toBeLessThan(600);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toHaveProperty("code");
      expect(res.body.error).toHaveProperty("message");
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }

    expect(procesoTumbado).toBe(false);
  });
});
