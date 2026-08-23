import { randomUUID } from "node:crypto";

export interface Solicitud {
  id: string;
  asunto: string;
  descripcion: string;
  area: string;
  solicitante: string;
  categoria: string | null;
  prioridad: string | null;
  confianzaClasificacion: number | null;
  estado: "Abierto" | "Escalado";
  fechaCreacion: string;
}

export interface DatosNuevaSolicitud {
  asunto: string;
  descripcion: string;
  area: string;
  solicitante: string;
}

let solicitudes = new Map<string, Solicitud>();

export function crear(datos: DatosNuevaSolicitud): Solicitud {
  const solicitud: Solicitud = {
    id: randomUUID(),
    asunto: datos.asunto,
    descripcion: datos.descripcion,
    area: datos.area,
    solicitante: datos.solicitante,
    categoria: null,
    prioridad: null,
    confianzaClasificacion: null,
    estado: "Abierto",
    fechaCreacion: new Date().toISOString(),
  };
  solicitudes.set(solicitud.id, solicitud);
  return solicitud;
}

export function obtenerPorId(id: string): Solicitud | undefined {
  return solicitudes.get(id);
}

export function actualizarClasificacion(
  id: string,
  categoria: string,
  prioridad: string,
  confianza: number,
  umbralEscalamiento: number
): Solicitud | undefined {
  const s = solicitudes.get(id);
  if (!s) return undefined;
  s.categoria = categoria;
  s.prioridad = prioridad;
  s.confianzaClasificacion = confianza;
  s.estado = confianza < umbralEscalamiento ? "Escalado" : "Abierto";
  return s;
}

export function listar(filtros: { area?: string; estado?: string; categoria?: string }): Solicitud[] {
  return [...solicitudes.values()].filter((s) => {
    if (filtros.area && s.area.toLowerCase() !== filtros.area.toLowerCase()) return false;
    if (filtros.estado && s.estado.toLowerCase() !== filtros.estado.toLowerCase()) return false;
    if (filtros.categoria && s.categoria?.toLowerCase() !== filtros.categoria.toLowerCase()) return false;
    return true;
  });
}

/** Solo para pruebas: limpia el store entre tests. */
export function _reiniciar(): void {
  solicitudes = new Map();
}
