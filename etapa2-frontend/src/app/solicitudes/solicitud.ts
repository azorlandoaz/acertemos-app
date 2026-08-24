export type EstadoSolicitud = 'Abierto' | 'Escalado';

export interface Solicitud {
  id: string;
  asunto: string;
  descripcion: string;
  area: string;
  solicitante: string;
  categoria: string | null;
  prioridad: string | null;
  confianzaClasificacion: number | null;
  estado: EstadoSolicitud;
  fechaCreacion: string;
}

export interface DatosNuevaSolicitud {
  asunto: string;
  descripcion: string;
  area: string;
  solicitante: string;
}

export interface FiltrosListado {
  area?: string;
  estado?: string;
  categoria?: string;
  limite?: number;
  desplazamiento?: number;
}

export interface ErrorApi {
  code: string;
  message: string;
  details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
}
