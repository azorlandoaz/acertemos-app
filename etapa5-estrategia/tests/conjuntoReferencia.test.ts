import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cargarConjuntoReferencia,
  parsearCSV,
  tipoDeCaso,
  validarCaso,
  type CasoReferencia,
} from "../src/conjuntoReferencia.js";

describe("parsearCSV", () => {
  it("separa filas y columnas simples por coma y salto de línea", () => {
    const resultado = parsearCSV("a,b,c\n1,2,3\n");
    expect(resultado).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("respeta comas dentro de campos entre comillas dobles", () => {
    const resultado = parsearCSV('id,texto\nGS-001,"Hola, mundo"\n');
    expect(resultado).toEqual([
      ["id", "texto"],
      ["GS-001", "Hola, mundo"],
    ]);
  });

  it("interpreta comillas dobles escapadas ('\"\"') como una comilla literal", () => {
    const resultado = parsearCSV('id,texto\nGS-001,"El dijo ""hola"""\n');
    expect(resultado).toEqual([
      ["id", "texto"],
      ["GS-001", 'El dijo "hola"'],
    ]);
  });
});

describe("tipoDeCaso", () => {
  const base: CasoReferencia = {
    idCaso: "X",
    preguntaOTexto: "texto",
    respuestaOCategoriaEsperada: "Hardware",
    documentoFuente: "",
    seccionFuente: "",
    observacion: "",
  };

  it("es 'clasificacion' cuando no hay documento_fuente y la respuesta no es el sentinel de abstencion", () => {
    expect(tipoDeCaso(base)).toBe("clasificacion");
  });

  it("es 'consulta_politica' cuando hay documento_fuente", () => {
    expect(tipoDeCaso({ ...base, documentoFuente: "POL-GTH-01_Vacaciones.pdf", seccionFuente: "3.1" })).toBe(
      "consulta_politica"
    );
  });

  it("es 'consulta_politica' para el sentinel de abstencion aunque documento_fuente este vacio", () => {
    expect(tipoDeCaso({ ...base, respuestaOCategoriaEsperada: "SIN EVIDENCIA EN LOS DOCUMENTOS" })).toBe(
      "consulta_politica"
    );
  });
});

describe("validarCaso", () => {
  it("no reporta errores para un caso de clasificacion completo", () => {
    expect(
      validarCaso({
        idCaso: "X",
        preguntaOTexto: "texto",
        respuestaOCategoriaEsperada: "Hardware",
        documentoFuente: "",
        seccionFuente: "",
        observacion: "",
      })
    ).toEqual([]);
  });

  it("reporta error si falta seccion_fuente en un caso de politica sin abstencion", () => {
    const errores = validarCaso({
      idCaso: "X",
      preguntaOTexto: "texto",
      respuestaOCategoriaEsperada: "15 dias",
      documentoFuente: "POL-GTH-01_Vacaciones.pdf",
      seccionFuente: "",
      observacion: "",
    });
    expect(errores.length).toBeGreaterThan(0);
  });
});

describe("cargarConjuntoReferencia (integracion con el archivo real committeado)", () => {
  it("carga al menos 50 casos validos desde etapa5-estrategia/conjunto_referencia.csv", () => {
    const aqui = path.dirname(fileURLToPath(import.meta.url));
    const ruta = path.resolve(aqui, "../conjunto_referencia.csv");
    const casos = cargarConjuntoReferencia(ruta);

    expect(casos.length).toBeGreaterThanOrEqual(50);

    const todosLosErrores = casos.flatMap((c) => validarCaso(c));
    expect(todosLosErrores, `errores de validacion: ${todosLosErrores.join("; ")}`).toEqual([]);
  });
});

describe("cargarConjuntoReferencia (rutas de error)", () => {
  let dirTemporal: string;

  afterEach(() => {
    if (dirTemporal) rmSync(dirTemporal, { recursive: true, force: true });
  });

  it("lanza error si el encabezado no coincide con las columnas esperadas", () => {
    dirTemporal = mkdtempSync(path.join(tmpdir(), "conjunto-referencia-test-"));
    const ruta = path.join(dirTemporal, "encabezado_malo.csv");
    writeFileSync(ruta, "id_caso,texto_malo\nX,Y\n", "utf-8");

    expect(() => cargarConjuntoReferencia(ruta)).toThrow();
  });

  it("lanza error si el archivo esta vacio o sin encabezado", () => {
    dirTemporal = mkdtempSync(path.join(tmpdir(), "conjunto-referencia-test-"));
    const ruta = path.join(dirTemporal, "vacio.csv");
    writeFileSync(ruta, "", "utf-8");

    expect(() => cargarConjuntoReferencia(ruta)).toThrow(
      /vac[ií]o o sin encabezado/i
    );
  });
});
