export type Rol = 'solicitante' | 'responsable_area' | 'administrador';

export interface SesionRol {
  rol: Rol;
  nombre: string;
}
