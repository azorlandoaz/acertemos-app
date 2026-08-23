import type { IAProvider, ResultadoClasificacion } from "./IAProvider.js";

/** Envuelve un IAProvider principal con timeout, reintentos y un
 * proveedor de respaldo activado cuando el principal se agota — nunca
 * lanza hacia el caller, siempre devuelve una clasificación utilizable
 * (modo degradado en vez de un 500). */
export class ClasificadorService {
  constructor(
    private readonly principal: IAProvider,
    private readonly respaldo: IAProvider,
    private readonly timeoutMs: number,
    private readonly maxReintentos: number
  ) {}

  private async conTimeout<T>(promesa: Promise<T>): Promise<T> {
    return Promise.race([
      promesa,
      new Promise<T>((_resolve, reject) =>
        setTimeout(() => reject(new Error("timeout del proveedor de IA")), this.timeoutMs)
      ),
    ]);
  }

  async clasificar(texto: string): Promise<ResultadoClasificacion> {
    for (let intento = 1; intento <= this.maxReintentos; intento++) {
      try {
        return await this.conTimeout(this.principal.clasificar(texto));
      } catch {
        if (intento === this.maxReintentos) break;
        await new Promise((r) => setTimeout(r, 2 ** intento * 50));
      }
    }
    try {
      return await this.respaldo.clasificar(texto);
    } catch {
      return { categoria: "Sin clasificar", confianza: 0 };
    }
  }
}
