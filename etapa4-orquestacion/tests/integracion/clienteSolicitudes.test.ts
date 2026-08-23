import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { enviarSolicitud } from "../../src/integracion/clienteSolicitudes.js";

const OPCIONES = {
  baseUrl: "http://localhost:8080",
  token: "demo-token-prueba-2026",
  maxReintentos: 6,
};

const DATOS = {
  asunto: "Consulta de prueba automatizada",
  descripcion: "Generada por la suite de Etapa 4.",
  area: "Talento Humano",
  solicitante: "prueba.etapa4@lafortuna.com.co",
};

describe("enviarSolicitud (contra servicio_mock real)", () => {
  it("crea una solicitud y devuelve un id", async () => {
    const resultado = await enviarSolicitud(DATOS, randomUUID(), OPCIONES);
    expect(resultado.id).toMatch(/^EXT-/);
    expect(resultado.estado).toBe("Abierto");
  }, 20000);

  it("la misma Idempotency-Key devuelve la misma solicitud (no duplica)", async () => {
    const clave = randomUUID();
    const primera = await enviarSolicitud(DATOS, clave, OPCIONES);
    const segunda = await enviarSolicitud(DATOS, clave, OPCIONES);
    expect(segunda.id).toBe(primera.id);
  }, 20000);

  it("reintenta ante fallo de red y eventualmente lanza tras agotar los reintentos", async () => {
    const opcionesInalcanzables = {
      baseUrl: "http://127.0.0.1:9",
      token: "demo-token-prueba-2026",
      maxReintentos: 2,
    };
    await expect(enviarSolicitud(DATOS, randomUUID(), opcionesInalcanzables)).rejects.toThrow(
      /servicio_mock no respondió \(fallo de red\)/
    );
  }, 10000);
});
