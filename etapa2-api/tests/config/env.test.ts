import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cargarConfig } from "../../src/config/env.js";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("cargarConfig", () => {
  it("lanza un error claro si falta SERVICIO_MOCK_URL", () => {
    delete process.env.SERVICIO_MOCK_URL;
    expect(() => cargarConfig()).toThrow("SERVICIO_MOCK_URL");
  });

  it("lanza un error claro si falta AI_PROVIDER_API_KEY", () => {
    delete process.env.AI_PROVIDER_API_KEY;
    expect(() => cargarConfig()).toThrow("AI_PROVIDER_API_KEY");
  });

  it("carga correctamente cuando todas las variables requeridas existen", () => {
    process.env.SERVICIO_MOCK_URL = "http://localhost:8080";
    process.env.SERVICIO_MOCK_TOKEN = "t";
    process.env.AI_PROVIDER_BASE_URL = "http://localhost:11434/v1";
    process.env.AI_PROVIDER_API_KEY = "k";
    const config = cargarConfig();
    expect(config.servicioMockUrl).toBe("http://localhost:8080");
  });
});
