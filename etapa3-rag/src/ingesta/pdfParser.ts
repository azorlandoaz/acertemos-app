import { readFile } from "node:fs/promises";
// pdf-parse no publica tipos ESM limpios; import por defecto vía require interno.
import pdfParse from "pdf-parse";

const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB

/** Extrae el texto completo de un PDF. Rechaza archivos excesivamente
 * grandes para no bloquear la ingesta con un PDF corrupto/gigante. */
export async function extraerTexto(rutaPdf: string): Promise<string> {
  const buffer = await readFile(rutaPdf);
  if (buffer.byteLength > TAMANO_MAXIMO_BYTES) {
    throw new Error(
      `${rutaPdf} supera el tamaño máximo permitido de ingesta (${TAMANO_MAXIMO_BYTES} bytes)`
    );
  }
  const resultado = await pdfParse(buffer);
  return resultado.text;
}
