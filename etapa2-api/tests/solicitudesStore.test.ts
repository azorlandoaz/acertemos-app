import { beforeEach, describe, expect, it } from "vitest";
import { crear, listar, obtenerPorId, _reiniciar } from "../src/store/solicitudesStore.js";

beforeEach(() => {
  _reiniciar();
});

describe("solicitudesStore", () => {
  it("crea una solicitud con id generado y estado Abierto", () => {
    const s = crear({ asunto: "Portátil no enciende", descripcion: "", area: "Operaciones", solicitante: "ana@lafortuna.com.co" });
    expect(s.id).toBeTypeOf("string");
    expect(s.estado).toBe("Abierto");
    expect(s.categoria).toBeNull();
  });

  it("obtenerPorId devuelve undefined si no existe", () => {
    expect(obtenerPorId("no-existe")).toBeUndefined();
  });

  it("listar filtra por area y estado", () => {
    crear({ asunto: "A1", descripcion: "", area: "Compras", solicitante: "a@x.com" });
    crear({ asunto: "A2", descripcion: "", area: "Calidad", solicitante: "b@x.com" });
    const resultado = listar({ area: "Compras" });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].area).toBe("Compras");
  });

  it("listar sin filtros ni resultados devuelve lista vacia, no error", () => {
    expect(listar({})).toEqual([]);
  });
});
