export interface ResultadoClasificacion {
  categoria: string;
  confianza: number;
}

/** Interfaz común para cualquier proveedor de IA (ver spec maestro §4.1). */
export interface IAProvider {
  clasificar(texto: string): Promise<ResultadoClasificacion>;
  generarRespuesta(prompt: string, contexto: string[]): Promise<string>;
  embeber(textos: string[]): Promise<number[][]>;
}
