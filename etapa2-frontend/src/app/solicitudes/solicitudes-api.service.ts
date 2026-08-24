import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { DatosNuevaSolicitud, FiltrosListado, Solicitud } from './solicitud';

@Injectable({ providedIn: 'root' })
export class SolicitudesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/solicitudes';

  crear(datos: DatosNuevaSolicitud): Observable<Solicitud> {
    return this.http.post<Solicitud>(this.baseUrl, datos);
  }

  obtenerPorId(id: string): Observable<Solicitud> {
    return this.http.get<Solicitud>(`${this.baseUrl}/${id}`);
  }

  listar(filtros: FiltrosListado): Observable<Solicitud[]> {
    let params = new HttpParams();
    if (filtros.area) params = params.set('area', filtros.area);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.limite !== undefined) params = params.set('limite', filtros.limite);
    if (filtros.desplazamiento !== undefined) params = params.set('desplazamiento', filtros.desplazamiento);
    return this.http.get<Solicitud[]>(this.baseUrl, { params });
  }
}
