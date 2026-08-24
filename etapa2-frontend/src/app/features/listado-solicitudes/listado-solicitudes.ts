import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { SolicitudesApiService } from '../../solicitudes/solicitudes-api.service';
import type { Solicitud } from '../../solicitudes/solicitud';

const TAMANO_PAGINA = 10;

@Component({
  selector: 'app-listado-solicitudes',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './listado-solicitudes.html',
  styleUrl: './listado-solicitudes.scss',
})
export class ListadoSolicitudes implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SolicitudesApiService);

  protected readonly columnas = ['asunto', 'area', 'categoria', 'prioridad', 'estado', 'fechaCreacion', 'acciones'];
  protected readonly solicitudes = signal<Solicitud[]>([]);
  protected readonly pagina = signal(0);
  protected readonly cargando = signal(false);
  protected readonly haySiguientePagina = computed(() => this.solicitudes().length === TAMANO_PAGINA);

  protected readonly filtros = this.fb.nonNullable.group({
    area: this.fb.nonNullable.control(''),
    estado: this.fb.nonNullable.control(''),
    categoria: this.fb.nonNullable.control(''),
  });

  ngOnInit(): void {
    this.buscar();
  }

  protected buscar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  protected paginaAnterior(): void {
    if (this.pagina() === 0) return;
    this.pagina.update((p) => p - 1);
    this.cargar();
  }

  protected paginaSiguiente(): void {
    if (!this.haySiguientePagina()) return;
    this.pagina.update((p) => p + 1);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    const { area, estado, categoria } = this.filtros.getRawValue();
    this.api
      .listar({
        area: area || undefined,
        estado: estado || undefined,
        categoria: categoria || undefined,
        limite: TAMANO_PAGINA,
        desplazamiento: this.pagina() * TAMANO_PAGINA,
      })
      .subscribe({
        next: (resultado) => {
          this.solicitudes.set(resultado);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }
}
