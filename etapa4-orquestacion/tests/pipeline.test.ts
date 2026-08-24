import { describe, expect, it, vi } from "vitest";
import { ClasificadorService, HeuristicProvider } from "etapa2-api";
import { ejecutarPipeline } from "../src/pipeline.js";

vi.mock("etapa3-rag", async () => {
  const actual = await vi.importActual<typeof import("etapa3-rag")>("etapa3-rag");
  return {
    ...actual,
    responderConsulta: vi.fn(async (pregunta: string) => {
      if (pregunta.includes("vacaciones")) {
        return {
          respuesta: "Debes solicitarlas con 15 días de anticipación.",
          citas: [{ documento: "POL-GTH-01_Vacaciones.pdf", seccion: "3.1" }],
          confianza: 0.9,
        };
      }
      return { respuesta: "No tengo evidencia en las políticas para responder esto.", citas: [], confianza: 0.1 };
    }),
  };
});

describe("ejecutarPipeline", () => {
  it("responde cuando la clasificacion y el RAG tienen confianza suficiente (caso feliz)", async () => {
    const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 1000, 1);
    vi.spyOn(clasificador, "clasificar").mockResolvedValue({ categoria: "Vacaciones", confianza: 0.9 });

    const resultado = await ejecutarPipeline(
      { evento_id: "evt-1", pregunta: "¿Con cuánta anticipación pido vacaciones?" },
      clasificador,
      0.4
    );

    expect(resultado.accion).toBe("responder");
    expect(resultado.citas).toHaveLength(1);
    expect(resultado.evento_id).toBe("evt-1");
  });

  it("escala cuando la confianza de clasificacion cae bajo el umbral", async () => {
    const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 1000, 1);
    vi.spyOn(clasificador, "clasificar").mockResolvedValue({ categoria: "Sin clasificar", confianza: 0.1 });

    const resultado = await ejecutarPipeline(
      { evento_id: "evt-2", pregunta: "¿con cuánta anticipación pido vacaciones?" },
      clasificador,
      0.4
    );

    expect(resultado.accion).toBe("escalar");
  });

  it("escala cuando el RAG se abstiene aunque la clasificacion tenga confianza alta", async () => {
    const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 1000, 1);
    vi.spyOn(clasificador, "clasificar").mockResolvedValue({ categoria: "Otro", confianza: 0.9 });

    const resultado = await ejecutarPipeline(
      { evento_id: "evt-3", pregunta: "¿cuál es la capital de Francia?" },
      clasificador,
      0.4
    );

    expect(resultado.accion).toBe("escalar");
    expect(resultado.citas).toHaveLength(0);
  });
});
