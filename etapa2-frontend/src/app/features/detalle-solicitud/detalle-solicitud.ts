import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { SolicitudesApiService } from '../../solicitudes/solicitudes-api.service';
import type { Solicitud } from '../../solicitudes/solicitud';

@Component({
  selector: 'app-detalle-solicitud',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './detalle-solicitud.html',
  styleUrl: './detalle-solicitud.scss',
})
export class DetalleSolicitud {
  private readonly ruta = inject(ActivatedRoute);
  private readonly api = inject(SolicitudesApiService);

  protected readonly solicitud = signal<Solicitud | null>(null);
  protected readonly noEncontrada = signal(false);

  constructor() {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) {
      this.noEncontrada.set(true);
      return;
    }
    this.api.obtenerPorId(id).subscribe({
      next: (s) => this.solicitud.set(s),
      error: () => this.noEncontrada.set(true),
    });
  }
}
