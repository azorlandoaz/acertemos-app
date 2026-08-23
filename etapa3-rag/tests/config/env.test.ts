import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("cargarConfig - validacion numerica", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.AI_PROVIDER_BASE_URL = "http://localhost:11434/v1";
    process.env.AI_PROVIDER_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("lanza un error claro si UMBRAL_ABSTENCION no es numerico", async () => {
    process.env.UMBRAL_ABSTENCION = "no-es-numero";
    vi.resetModules();
    const { cargarConfig } = await import("../../src/config/env.js");
    expect(() => cargarConfig()).toThrow(/UMBRAL_ABSTENCION.*numérica/);
  });

  it("lanza un error claro si AI_TIMEOUT_MS no es numerico", async () => {
    process.env.AI_TIMEOUT_MS = "cinco-mil";
    vi.resetModules();
    const { cargarConfig } = await import("../../src/config/env.js");
    expect(() => cargarConfig()).toThrow(/AI_TIMEOUT_MS.*numérica/);
  });

  it("usa el valor por defecto de UMBRAL_ABSTENCION cuando no esta definida", async () => {
    delete process.env.UMBRAL_ABSTENCION;
    vi.resetModules();
    const { cargarConfig } = await import("../../src/config/env.js");
    expect(cargarConfig().umbralAbstencion).toBe(0.75);
  });

  it("acepta un UMBRAL_ABSTENCION numerico valido", async () => {
    process.env.UMBRAL_ABSTENCION = "0.6";
    vi.resetModules();
    const { cargarConfig } = await import("../../src/config/env.js");
    expect(cargarConfig().umbralAbstencion).toBe(0.6);
  });
});
