export interface Fragmento {
  documento: string;
  seccion: string;
  texto: string;
}

const PATRON_ENCABEZADO = /^(\d+(?:\.\d+)*)\.?\s+\S.*$/;
const TAMANO_MAXIMO = 1200;
const SOLAPE = 100;

interface Seccion {
  numero: string;
  lineas: string[];
}

function agruparPorSeccion(texto: string): Seccion[] {
  const lineas = texto.split("\n");
  const secciones: Seccion[] = [];
  let actual: Seccion | null = null;

  for (const linea of lineas) {
    const match = linea.match(PATRON_ENCABEZADO);
    if (match) {
      actual = { numero: match[1], lineas: [linea] };
      secciones.push(actual);
    } else if (actual) {
      actual.lineas.push(linea);
    } else {
      actual = { numero: "1", lineas: [linea] };
      secciones.push(actual);
    }
  }
  return secciones;
}

function subdividirSiEsNecesario(documento: string, seccion: Seccion): Fragmento[] {
  const textoCompleto = seccion.lineas.join("\n").trim();
  if (textoCompleto.length <= TAMANO_MAXIMO) {
    return [{ documento, seccion: seccion.numero, texto: textoCompleto }];
  }

  const fragmentos: Fragmento[] = [];
  let inicio = 0;
  while (inicio < textoCompleto.length) {
    const fin = Math.min(inicio + TAMANO_MAXIMO, textoCompleto.length);
    fragmentos.push({
      documento,
      seccion: seccion.numero,
      texto: textoCompleto.slice(inicio, fin).trim(),
    });
    if (fin >= textoCompleto.length) break;
    inicio = fin - SOLAPE;
  }
  return fragmentos;
}

/** Fragmenta un texto en trozos delimitados por encabezados de sección
 * numerados ("3", "3.1", ...). Si no hay encabezados, todo el documento
 * es la sección "1". Secciones más largas de ~1200 caracteres se
 * subdividen con solape, conservando el número de sección original. */
export function fragmentarPorSeccion(texto: string, documento: string): Fragmento[] {
  const secciones = agruparPorSeccion(texto).filter((s) => s.lineas.join("").trim() !== "");
  return secciones.flatMap((s) => subdividirSiEsNecesario(documento, s));
}
