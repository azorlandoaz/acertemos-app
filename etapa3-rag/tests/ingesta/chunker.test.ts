import { describe, expect, it } from "vitest";
import { fragmentarPorSeccion } from "../../src/ingesta/chunker.js";

describe("fragmentarPorSeccion", () => {
  it("divide el texto por encabezados de seccion numerados", () => {
    const texto = [
      "3. Vacaciones",
      "Texto introductorio de la seccion 3.",
      "3.1 Anticipacion",
      "Debe solicitarse con 15 dias calendario de anticipacion.",
      "3.2 Aprobacion",
      "El jefe directo aprueba la solicitud.",
    ].join("\n");

    const fragmentos = fragmentarPorSeccion(texto, "POL-GTH-01_Vacaciones.pdf");

    expect(fragmentos).toHaveLength(3);
    expect(fragmentos[0].seccion).toBe("3");
    expect(fragmentos[1].seccion).toBe("3.1");
    expect(fragmentos[1].texto).toContain("15 dias calendario");
    expect(fragmentos.every((f) => f.documento === "POL-GTH-01_Vacaciones.pdf")).toBe(true);
  });

  it("trata el documento completo como seccion '1' si no hay encabezados", () => {
    const texto = "Texto sin ningun encabezado numerado en todo el documento.";
    const fragmentos = fragmentarPorSeccion(texto, "doc.pdf");
    expect(fragmentos).toHaveLength(1);
    expect(fragmentos[0].seccion).toBe("1");
  });

  it("subdivide una seccion demasiado larga conservando el numero de seccion", () => {
    const parrafo = "Frase de relleno para alcanzar longitud. ".repeat(40); // ~1720 chars
    const texto = `5 Seccion larga\n${parrafo}\n\n${parrafo}`;
    const fragmentos = fragmentarPorSeccion(texto, "doc.pdf");
    expect(fragmentos.length).toBeGreaterThan(1);
    expect(fragmentos.every((f) => f.seccion === "5")).toBe(true);
    expect(fragmentos.every((f) => f.texto.length <= 1300)).toBe(true);
  });
});
