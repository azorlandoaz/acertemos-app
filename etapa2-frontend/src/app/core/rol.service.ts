import { Injectable, signal } from '@angular/core';
import type { SesionRol } from './rol';

const CLAVE_ALMACENAMIENTO = 'etapa2-frontend.sesion';

@Injectable({ providedIn: 'root' })
export class RolService {
  private readonly _sesion = signal<SesionRol | null>(this.leerDeAlmacenamiento());

  readonly sesion = this._sesion.asReadonly();

  establecer(sesion: SesionRol): void {
    this._sesion.set(sesion);
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(sesion));
  }

  limpiar(): void {
    this._sesion.set(null);
    localStorage.removeItem(CLAVE_ALMACENAMIENTO);
  }

  private leerDeAlmacenamiento(): SesionRol | null {
    const crudo = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (!crudo) {
      return null;
    }
    try {
      const parseado = JSON.parse(crudo);
      if (parseado && typeof parseado.rol === 'string' && typeof parseado.nombre === 'string') {
        return parseado as SesionRol;
      }
      return null;
    } catch {
      return null;
    }
  }
}
