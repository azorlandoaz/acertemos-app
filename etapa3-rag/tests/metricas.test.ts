import { beforeEach, describe, expect, it } from "vitest";
import { _reiniciarMetricas, registrarMetrica, resumenMetricas } from "../src/metricas.js";

beforeEach(() => {
  _reiniciarMetricas();
});

describe("metricas", () => {
  it("resumenMetricas con cero llamadas no lanza y devuelve ceros", () => {
    expect(resumenMetricas()).toEqual({
      totalLlamadas: 0,
      latenciaP50: 0,
      latenciaP95: 0,
      tokensTotales: 0,
    });
  });

  it("agrega latencia p50/p95 y tokens totales de varias llamadas", () => {
    registrarMetrica(100, 50);
    registrarMetrica(200, 30);
    registrarMetrica(300, 20);

    const resumen = resumenMetricas();
    expect(resumen.totalLlamadas).toBe(3);
    expect(resumen.tokensTotales).toBe(999); // roto a propósito para evidencia de CI
    expect(resumen.latenciaP50).toBeGreaterThanOrEqual(100);
    expect(resumen.latenciaP95).toBeLessThanOrEqual(300);
  });
});
