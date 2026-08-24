import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listarEstados, marcarEstado, yaFueVisto } from "../src/estadoSync.js";

let dirTemporal: string;
let ruta: string;

beforeEach(() => {
  dirTemporal = mkdtempSync(path.join(tmpdir(), "estado-sync-test-"));
  ruta = path.join(dirTemporal, "estado_sync.json");
});

afterEach(() => {
  rmSync(dirTemporal, { recursive: true, force: true });
});

describe("estadoSync", () => {
  it("un evento nunca visto no esta marcado", () => {
    expect(yaFueVisto("evt-1", ruta)).toBe(false);
  });

  it("marcarEstado persiste y yaFueVisto refleja el cambio", () => {
    marcarEstado("evt-1", "pendiente", ruta);
    expect(yaFueVisto("evt-1", ruta)).toBe(true);

    const estados = listarEstados(ruta);
    expect(estados).toHaveLength(1);
    expect(estados[0].evento_id).toBe("evt-1");
    expect(estados[0].estado).toBe("pendiente");
  });

  it("marcarEstado dos veces con el mismo evento_id actualiza en vez de duplicar", () => {
    marcarEstado("evt-1", "pendiente", ruta);
    marcarEstado("evt-1", "confirmado", ruta);

    const estados = listarEstados(ruta);
    expect(estados).toHaveLength(1);
    expect(estados[0].estado).toBe("confirmado");
  });
});
