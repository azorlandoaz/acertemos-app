import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type EstadoEvento = "pendiente" | "enviado" | "confirmado" | "error";

export interface RegistroSync {
  evento_id: string;
  estado: EstadoEvento;
  actualizado: string;
}

function cargar(ruta: string): Record<string, RegistroSync> {
  if (!existsSync(ruta)) return {};
  return JSON.parse(readFileSync(ruta, "utf-8"));
}

function guardar(ruta: string, registros: Record<string, RegistroSync>): void {
  mkdirSync(path.dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(registros, null, 2), "utf-8");
}

/** Un evento se considera "ya visto" si tiene un registro que NO está en
 * estado error - un evento que falló puede reenviarse y reprocesarse
 * (evita que un fallo transitorio del pipeline bloquee el evento para
 * siempre). */
export function yaFueVisto(eventoId: string, ruta: string): boolean {
  const registros = cargar(ruta);
  const registro = registros[eventoId];
  return registro !== undefined && registro.estado !== "error";
}

/** Registra o actualiza el estado de sincronización de un evento. Un mismo
 * evento_id nunca se duplica: la segunda llamada sobrescribe el estado
 * anterior, preservando la trazabilidad de "qué pasó por última vez". */
export function marcarEstado(eventoId: string, estado: EstadoEvento, ruta: string): void {
  const registros = cargar(ruta);
  registros[eventoId] = { evento_id: eventoId, estado, actualizado: new Date().toISOString() };
  guardar(ruta, registros);
}

export function listarEstados(ruta: string): RegistroSync[] {
  return Object.values(cargar(ruta));
}
