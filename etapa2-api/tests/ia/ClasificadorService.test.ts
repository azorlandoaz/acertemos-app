import { describe, expect, it, vi } from "vitest";
import { ClasificadorService } from "../../src/ia/ClasificadorService.js";
import type { IAProvider } from "../../src/ia/IAProvider.js";

function proveedorQueFalla(): IAProvider {
  return {
    clasificar: vi.fn().mockRejectedValue(new Error("timeout simulado")),
    generarRespuesta: vi.fn(),
    embeber: vi.fn(),
  };
}

function proveedorQueResponde(categoria: string, confianza: number): IAProvider {
  return {
    clasificar: vi.fn().mockResolvedValue({ categoria, confianza }),
    generarRespuesta: vi.fn(),
    embeber: vi.fn(),
  };
}

describe("ClasificadorService", () => {
  it("usa el proveedor principal si responde", async () => {
    const principal = proveedorQueResponde("Vacaciones", 0.9);
    const respaldo = proveedorQueResponde("Sin clasificar", 0.1);
    const servicio = new ClasificadorService(principal, respaldo, 1000, 1);

    const r = await servicio.clasificar("texto");
    expect(r.categoria).toBe("Vacaciones");
    expect(respaldo.clasificar).not.toHaveBeenCalled();
  });

  it("cae al respaldo cuando el principal falla tras agotar reintentos, sin lanzar excepcion", async () => {
    const principal = proveedorQueFalla();
    const respaldo = proveedorQueResponde("Sin clasificar", 0.1);
    const servicio = new ClasificadorService(principal, respaldo, 1000, 2);

    const r = await servicio.clasificar("texto");
    expect(r.categoria).toBe("Sin clasificar");
    expect(principal.clasificar).toHaveBeenCalledTimes(2);
  });

  it("resuelve con un resultado por defecto si tanto el principal como el respaldo fallan, sin lanzar excepcion", async () => {
    const principal = proveedorQueFalla();
    const respaldo = proveedorQueFalla();
    const servicio = new ClasificadorService(principal, respaldo, 1000, 1);

    await expect(servicio.clasificar("texto")).resolves.toEqual({ categoria: "Sin clasificar", confianza: 0 });
  });

  it("cae al respaldo cuando el principal nunca resuelve (timeout)", async () => {
    const principal: IAProvider = {
      clasificar: () => new Promise(() => {}), // nunca resuelve
      generarRespuesta: vi.fn(),
      embeber: vi.fn(),
    };
    const respaldo = proveedorQueResponde("Sin clasificar", 0.1);
    const servicio = new ClasificadorService(principal, respaldo, 50, 1);

    const r = await servicio.clasificar("texto");
    expect(r.categoria).toBe("Sin clasificar");
  });
});
