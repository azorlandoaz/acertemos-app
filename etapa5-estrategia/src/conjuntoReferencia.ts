import { readFileSync } from "node:fs";

export interface CasoReferencia {
  idCaso: string;
  preguntaOTexto: string;
  respuestaOCategoriaEsperada: string;
  documentoFuente: string;
  seccionFuente: string;
  observacion: string;
}

export type TipoCaso = "clasificacion" | "consulta_politica";

const SENTINEL_ABSTENCION = "SIN EVIDENCIA EN LOS DOCUMENTOS";

/** Parser CSV mínimo (RFC4180: comillas dobles, comas y saltos de línea
 * dentro de campos entre comillas, "" como comilla escapada) — no se usa
 * una dependencia externa porque el resto del monorepo tampoco tiene una
 * librería CSV compartida y el formato de este archivo es simple. */
export function parsearCSV(contenido: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;
  const texto = contenido.replace(/\r\n/g, "\n");

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}

/** Un caso de política (incluida abstención) se distingue de uno de
 * clasificación por tener documento_fuente lleno, O por usar el sentinel de
 * abstención en respuesta_o_categoria_esperada (caso GS-003 y análogos,
 * donde documento_fuente queda vacío a propósito). */
export function tipoDeCaso(caso: CasoReferencia): TipoCaso {
  if (caso.respuestaOCategoriaEsperada === SENTINEL_ABSTENCION || caso.documentoFuente !== "") {
    return "consulta_politica";
  }
  return "clasificacion";
}

export function validarCaso(caso: CasoReferencia): string[] {
  const errores: string[] = [];
  if (!caso.idCaso) errores.push("id_caso vacio");
  if (!caso.preguntaOTexto) errores.push(`${caso.idCaso}: pregunta_o_texto vacio`);
  if (!caso.respuestaOCategoriaEsperada) errores.push(`${caso.idCaso}: respuesta_o_categoria_esperada vacio`);

  const tipo = tipoDeCaso(caso);
  const esAbstencion = caso.respuestaOCategoriaEsperada === SENTINEL_ABSTENCION;
  if (tipo === "consulta_politica" && !esAbstencion && !caso.seccionFuente) {
    errores.push(`${caso.idCaso}: seccion_fuente vacio en caso de politica sin abstencion`);
  }
  return errores;
}

const COLUMNAS = [
  "id_caso",
  "pregunta_o_texto",
  "respuesta_o_categoria_esperada",
  "documento_fuente",
  "seccion_fuente",
  "observacion",
] as const;

export function cargarConjuntoReferencia(ruta: string): CasoReferencia[] {
  const contenido = readFileSync(ruta, "utf-8");
  const filas = parsearCSV(contenido).filter((f) => f.some((campo) => campo.trim() !== ""));
  const [encabezado, ...datos] = filas;

  if (!encabezado) {
    throw new Error(`Archivo de conjunto de referencia vacío o sin encabezado: ${ruta}`);
  }

  COLUMNAS.forEach((columna, indice) => {
    if (encabezado[indice] !== columna) {
      throw new Error(`Encabezado inesperado en columna ${indice}: esperaba "${columna}", encontro "${encabezado[indice]}"`);
    }
  });

  return datos.map((fila) => ({
    idCaso: fila[0] ?? "",
    preguntaOTexto: fila[1] ?? "",
    respuestaOCategoriaEsperada: fila[2] ?? "",
    documentoFuente: fila[3] ?? "",
    seccionFuente: fila[4] ?? "",
    observacion: fila[5] ?? "",
  }));
}
