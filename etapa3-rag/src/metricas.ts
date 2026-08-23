interface Registro {
  latenciaMs: number;
  tokensAprox: number;
}

let registros: Registro[] = [];

export function registrarMetrica(latenciaMs: number, tokensAprox: number): void {
  registros.push({ latenciaMs, tokensAprox });
}

function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
  return ordenados[Math.max(0, indice)];
}

export function resumenMetricas() {
  const latencias = registros.map((r) => r.latenciaMs);
  return {
    totalLlamadas: registros.length,
    latenciaP50: percentil(latencias, 50),
    latenciaP95: percentil(latencias, 95),
    tokensTotales: registros.reduce((acc, r) => acc + r.tokensAprox, 0),
  };
}

/** Solo para pruebas: limpia el registro en memoria. */
export function _reiniciarMetricas(): void {
  registros = [];
}

/** Aproxima tokens como longitud/4 (heurística estándar sin tokenizador real). */
export function tokensAproximados(texto: string): number {
  return Math.ceil(texto.length / 4);
}
