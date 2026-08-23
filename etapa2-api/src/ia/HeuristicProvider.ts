import type { IAProvider, ResultadoClasificacion } from "./IAProvider.js";

const PALABRAS_CLAVE: Record<string, string[]> = {
  Vacaciones: ["vacaciones", "días libres", "descanso"],
  Hardware: ["portátil", "portatil", "computador", "no enciende", "pantalla", "teclado"],
  Software: ["aplicación", "aplicacion", "error al guardar", "se cierra"],
  "Gestión de accesos": ["bloqueó mi usuario", "bloqueo", "acceso", "contraseña", "contrasena"],
  Viáticos: ["viático", "viatico", "hospedaje", "reembolso"],
  Conectividad: ["conexión", "conexion", "internet", "red lenta", "wifi"],
  Compras: ["cotización", "cotizacion", "orden de compra", "proveedor"],
  Incidentes: ["incidente", "pérdida de información", "perdida de informacion"],
};

/** Fallback determinista sin dependencias externas: clasifica por
 * coincidencia de palabras clave. Se activa cuando el proveedor real
 * no responde (ver ClasificadorService). No sustituye un LLM real —
 * es intencionalmente simple para no fallar nunca. */
export class HeuristicProvider implements IAProvider {
  async clasificar(texto: string): Promise<ResultadoClasificacion> {
    const normalizado = texto.toLowerCase();
    for (const [categoria, palabras] of Object.entries(PALABRAS_CLAVE)) {
      if (palabras.some((p) => normalizado.includes(p))) {
        return { categoria, confianza: 0.6 };
      }
    }
    return { categoria: "Sin clasificar", confianza: 0.1 };
  }

  async generarRespuesta(_prompt: string, _contexto: string[]): Promise<string> {
    return "El servicio de generación de respuestas no está disponible en este momento.";
  }

  async embeber(textos: string[]): Promise<number[][]> {
    // Vector determinista basado en longitud/hash simple — solo para que
    // el contrato de la interfaz se cumpla en modo degradado; no apto
    // para recuperación semántica real (eso lo resuelve Etapa 3).
    return textos.map((t) => [t.length % 97, [...t].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 97]);
  }
}
