import { describe, expect, it } from "vitest";
import { HeuristicProvider } from "../../src/ia/HeuristicProvider.js";

describe("HeuristicProvider", () => {
  const provider = new HeuristicProvider();

  it("clasifica por palabra clave de vacaciones", async () => {
    const r = await provider.clasificar("Necesito solicitar mis vacaciones de diciembre");
    expect(r.categoria).toBe("Vacaciones");
    expect(r.confianza).toBeGreaterThan(0);
  });

  it("clasifica por palabra clave de hardware", async () => {
    const r = await provider.clasificar("El portátil no enciende desde ayer");
    expect(r.categoria).toBe("Hardware");
  });

  it("devuelve categoria 'Sin clasificar' con confianza baja si no reconoce nada", async () => {
    const r = await provider.clasificar("xyz texto sin señales reconocibles 123");
    expect(r.categoria).toBe("Sin clasificar");
    expect(r.confianza).toBeLessThan(0.5);
  });

  it("generarRespuesta devuelve un mensaje fijo de no disponible", async () => {
    const r = await provider.generarRespuesta("hola", []);
    expect(r).toContain("no está disponible");
  });

  it("embeber devuelve un vector por cada texto de entrada", async () => {
    const vectores = await provider.embeber(["hola", "mundo distinto"]);
    expect(vectores).toHaveLength(2);
    expect(vectores[0]).toHaveLength(2);
    expect(vectores[0]).not.toEqual(vectores[1]);
  });
});
